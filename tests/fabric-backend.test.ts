import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { listEnabledConfigOptions } from "../src/server/config-options";
import { isUniqueConstraintError } from "../src/server/errors";
import { calculateFabricCompleteness } from "../src/server/fabrics/completeness";
import { createFabric } from "../src/server/fabrics/create-fabric";
import { createFabricInputSchema, type CreateFabricInput } from "../src/server/fabrics/schema";
import { normalizeSupplierLimit, searchSuppliers } from "../src/server/suppliers";
import { getServerTenant } from "../src/server/tenant";
import { errorResponse, POST } from "../src/app/api/fabrics/route";
import { GET as getConfigOptions } from "../src/app/api/config-options/route";
import { assertSafeTestDatabaseUrl } from "./test-database";

const codePrefix = `SDD-TEST-${Date.now()}-`;
const supplierPrefix = `Test Supplier ${Date.now()}`;

let tenantId = "";
let supplierAId = "";
let supplierBId = "";
let otherTenantSupplierId = "";
let createdOtherTenantId = "";
let tenantConfigOptionId = "";
let otherTenantConfigOptionId = "";

function basePayload(codeSuffix: string): CreateFabricInput {
  return {
    code: `${codePrefix}${codeSuffix}`,
    name: `Test Fabric ${codeSuffix}`,
    fabricType: "knitted",
    developmentSource: "market_purchase",
    composition: "95% cotton 5% spandex",
    weight: "230g",
    width: "160cm",
    greigeStatus: "none",
    dyeingStatus: "none",
    postProcessStatus: "none",
  };
}

async function cleanup() {
  if (!tenantId) {
    return;
  }

  const fabrics = await prisma.fabric.findMany({
    where: { tenantId, code: { startsWith: codePrefix } },
    select: { id: true },
  });
  const fabricIds = fabrics.map((fabric) => fabric.id);

  if (fabricIds.length > 0) {
    await prisma.operationLog.deleteMany({ where: { tenantId, targetId: { in: fabricIds } } });
    await prisma.fabric.deleteMany({ where: { id: { in: fabricIds } } });
  }

  await prisma.supplier.deleteMany({
    where: { tenantId, name: { startsWith: supplierPrefix } },
  });
  await prisma.configOption.deleteMany({
    where: { id: { in: [tenantConfigOptionId, otherTenantConfigOptionId].filter(Boolean) } },
  });

  if (createdOtherTenantId) {
    await prisma.supplier.deleteMany({ where: { tenantId: createdOtherTenantId } });
    await prisma.configOption.deleteMany({ where: { tenantId: createdOtherTenantId } });
    await prisma.tenant.deleteMany({ where: { id: createdOtherTenantId } });
  }
}

before(async () => {
  const tenant = await getServerTenant();
  tenantId = tenant.id;
  await cleanup();

  const supplierA = await prisma.supplier.create({
    data: { tenantId, name: `${supplierPrefix} A`, type: "fabric_supplier" },
  });
  const supplierB = await prisma.supplier.create({
    data: { tenantId, name: `${supplierPrefix} B`, type: "fabric_supplier" },
  });
  const otherTenant = await prisma.tenant.create({
    data: { code: `test-other-${Date.now()}`, name: "Other Tenant" },
  });

  createdOtherTenantId = otherTenant.id;
  supplierAId = supplierA.id;
  supplierBId = supplierB.id;

  const otherSupplier = await prisma.supplier.create({
    data: { tenantId: otherTenant.id, name: `${supplierPrefix} Other`, type: "fabric_supplier" },
  });
  otherTenantSupplierId = otherSupplier.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("create fabric schema", () => {
  test("knitted fabric automatically uses kg", () => {
    const parsed = createFabricInputSchema.parse(basePayload("KG"));
    assert.equal(parsed.pricingUnit, "kg");
  });

  test("woven fabric automatically uses meter", () => {
    const parsed = createFabricInputSchema.parse({
      ...basePayload("METER"),
      fabricType: "woven",
      warpWeftDensity: "110x76",
    });
    assert.equal(parsed.pricingUnit, "meter");
  });

  test("non-SDD code is rejected", () => {
    assert.throws(() => createFabricInputSchema.parse({ ...basePayload("BAD"), code: "BAD-001" }));
  });

  test("negative quote is rejected", () => {
    assert.throws(() =>
      createFabricInputSchema.parse({
        ...basePayload("NEG"),
        suppliers: [{ supplierId: "supplier-id", initialQuote: { purchasePrice: -1 } }],
      }),
    );
  });

  test("empty required quote price is rejected instead of coerced to zero", () => {
    for (const purchasePrice of ["", "   ", null]) {
      const parsed = createFabricInputSchema.safeParse({
        ...basePayload(`EMPTY-PRICE-${String(purchasePrice).length}`),
        suppliers: [{ supplierId: "supplier-id", initialQuote: { purchasePrice } }],
      });

      assert.equal(parsed.success, false);
      assert.equal(
        parsed.error.issues.some((issue) => issue.path.join(".") === "suppliers.0.initialQuote.purchasePrice"),
        true,
      );
    }

    const zeroPrice = createFabricInputSchema.parse({
      ...basePayload("ZERO-PRICE"),
      suppliers: [{ supplierId: "supplier-id", initialQuote: { purchasePrice: 0 } }],
    });

    assert.equal(zeroPrice.suppliers[0]?.initialQuote?.purchasePrice, 0);
  });

  test("process status rejects conflicting greige, dyeing, and post-process details", () => {
    const cases: Array<{ payload: CreateFabricInput; path: string }> = [
      { payload: { ...basePayload("GREIGE-NONE"), greige: {} }, path: "greige" },
      { payload: { ...basePayload("GREIGE-AVAILABLE"), greigeStatus: "available" }, path: "greige" },
      { payload: { ...basePayload("DYE-NONE"), dyeingFinishing: {} }, path: "dyeingFinishing" },
      { payload: { ...basePayload("DYE-AVAILABLE"), dyeingStatus: "available" }, path: "dyeingFinishing" },
      { payload: { ...basePayload("POST-NONE"), postProcesses: [{}] }, path: "postProcesses" },
      { payload: { ...basePayload("POST-AVAILABLE"), postProcessStatus: "available" }, path: "postProcesses" },
    ];

    for (const item of cases) {
      const parsed = createFabricInputSchema.safeParse(item.payload);
      assert.equal(parsed.success, false);
      assert.equal(parsed.error.issues.some((issue) => issue.path.join(".") === item.path), true);
    }
  });

  test("duplicate supplierId is rejected", () => {
    const parsed = createFabricInputSchema.safeParse({
      ...basePayload("DUP-SUPPLIER"),
      suppliers: [{ supplierId: "same" }, { supplierId: "same" }],
    });

    assert.equal(parsed.success, false);
    assert.equal(parsed.error.issues.some((issue) => issue.path.join(".") === "suppliers"), true);
  });

  test("multiple preferred suppliers are rejected", () => {
    const parsed = createFabricInputSchema.safeParse({
      ...basePayload("PREFERRED"),
      suppliers: [
        { supplierId: "a", isPreferred: true },
        { supplierId: "b", isPreferred: true },
      ],
    });

    assert.equal(parsed.success, false);
    assert.equal(parsed.error.issues.some((issue) => issue.path.join(".") === "suppliers"), true);
  });
});

describe("fabric creation service", () => {
  test("creates a fabric with multiple suppliers and quote history", async () => {
    const fabric = await createFabric({
      ...basePayload("SUCCESS"),
      fabricType: "woven",
      warpWeftDensity: "110x76",
      usageOptionKeys: ["tshirt"],
      seasonOptionKeys: ["spring_summer"],
      certificationOptionKeys: ["oeko_tex"],
      suppliers: [
        {
          supplierId: supplierAId,
          supplierFabricCode: "A-001",
          isPreferred: true,
          initialQuote: {
            purchasePrice: 45,
            currency: "CNY",
            minimumOrderQty: "500m",
            contactName: "Alice",
          },
        },
        {
          supplierId: supplierBId,
          supplierFabricCode: "B-001",
          initialQuote: {
            purchasePrice: 47,
            currency: "CNY",
          },
        },
      ],
    });

    assert.equal(fabric.pricingUnit, "meter");
    assert.equal(fabric.supplierSources.length, 2);
    assert.equal(fabric.supplierSources.reduce((count, source) => count + source.quotes.length, 0), 2);
    assert.equal(fabric.supplierId, null);
    assert.equal(fabric.supplierQuote, null);
  });

  test("auto-selects first supplier as preferred when none is provided", async () => {
    const fabric = await createFabric({
      ...basePayload("AUTO-PREFERRED"),
      suppliers: [
        { supplierId: supplierAId },
        { supplierId: supplierBId, initialQuote: { purchasePrice: 39, currency: "CNY" } },
      ],
    });

    const firstSupplier = fabric.supplierSources.find((source) => source.supplierId === supplierAId);
    const secondSupplier = fabric.supplierSources.find((source) => source.supplierId === supplierBId);

    assert.equal(firstSupplier?.isPreferred, true);
    assert.equal(secondSupplier?.isPreferred, false);
    assert.equal(fabric.missingInfoFlags.includes("missing_preferred_supplier_quote"), true);
  });

  test("duplicate code is rejected within the current tenant", async () => {
    const payload = { ...basePayload("DUP"), suppliers: [{ supplierId: supplierAId }] };
    await createFabric(payload);

    await assert.rejects(() => createFabric(payload), /already exists/);
  });

  test("cross-tenant supplierId is rejected", async () => {
    await assert.rejects(
      () =>
        createFabric({
          ...basePayload("CROSS"),
          suppliers: [{ supplierId: otherTenantSupplierId }],
        }),
      /Supplier does not belong/,
    );
  });

  test("invalid enum config key is rejected", async () => {
    await assert.rejects(
      () =>
        createFabric({
          ...basePayload("BADKEY"),
          usageOptionKeys: ["not_a_real_usage"],
        }),
      /Invalid or disabled config option key/,
    );
  });

  test("creation rolls back when validation fails before writing", async () => {
    await assert.rejects(
      () =>
        createFabric({
          ...basePayload("ROLLBACK"),
          suppliers: [
            { supplierId: supplierAId },
            { supplierId: supplierAId },
          ],
        }),
      /Invalid fabric payload/,
    );

    const rolledBackFabric = await prisma.fabric.findUnique({
      where: { tenantId_code: { tenantId, code: `${codePrefix}ROLLBACK` } },
      select: { id: true },
    });

    assert.equal(rolledBackFabric, null);
  });

  test("sample_status seed exists and validates supplier sample status", async () => {
    const sampleStatus = await prisma.configOption.findFirst({
      where: { ownerKey: "system", group: "sample_status", key: "received", enabled: true },
      select: { id: true },
    });

    assert.ok(sampleStatus);

    const fabric = await createFabric({
      ...basePayload("SAMPLE-STATUS"),
      suppliers: [{ supplierId: supplierAId, sampleStatus: "received" }],
    });

    assert.equal(fabric.supplierSources[0]?.sampleStatus, "received");
  });
});

describe("supplier search", () => {
  test("normalizes supplier search limits", () => {
    assert.equal(normalizeSupplierLimit(undefined), 20);
    assert.equal(normalizeSupplierLimit(null), 20);
    assert.equal(normalizeSupplierLimit("bad"), 20);
    assert.equal(normalizeSupplierLimit(0), 1);
    assert.equal(normalizeSupplierLimit(99), 50);
  });

  test("default supplier search limit is 20 and caps at 50", async () => {
    for (let index = 0; index < 55; index += 1) {
      await prisma.supplier.create({
        data: { tenantId, name: `${supplierPrefix} Limit ${String(index).padStart(2, "0")}` },
      });
    }

    assert.equal((await searchSuppliers({ q: supplierPrefix })).length, 20);
    assert.equal((await searchSuppliers({ q: supplierPrefix, limit: "bad" })).length, 20);
    assert.equal((await searchSuppliers({ q: supplierPrefix, limit: 999 })).length, 50);
  });
});

describe("config options API", () => {
  test("returns enabled system and current-tenant options only", async () => {
    const currentTenantOption = await prisma.configOption.create({
      data: {
        tenantId,
        ownerKey: `tenant:${tenantId}`,
        scope: "tenant",
        group: "fabric_usage",
        key: `tenant_usage_${Date.now()}`,
        label: "Tenant Usage",
        sortOrder: 999,
      },
    });
    tenantConfigOptionId = currentTenantOption.id;

    const otherTenantOption = await prisma.configOption.create({
      data: {
        tenantId: createdOtherTenantId,
        ownerKey: `tenant:${createdOtherTenantId}`,
        scope: "tenant",
        group: "fabric_usage",
        key: `other_usage_${Date.now()}`,
        label: "Other Tenant Usage",
        sortOrder: 999,
      },
    });
    otherTenantConfigOptionId = otherTenantOption.id;

    const options = await listEnabledConfigOptions(["fabric_usage", "fabric_season"]);
    const keys = new Set(options.map((option) => option.key));

    assert.equal(keys.has(currentTenantOption.key), true);
    assert.equal(keys.has(otherTenantOption.key), false);
    assert.equal(keys.has("tshirt"), true);
  });

  test("deduplicates system and tenant options by group and key with tenant priority", async () => {
    await prisma.configOption.deleteMany({
      where: { tenantId, group: "fabric_usage", key: "tshirt" },
    });

    const tenantOverride = await prisma.configOption.create({
      data: {
        tenantId,
        ownerKey: `tenant:${tenantId}`,
        scope: "tenant",
        group: "fabric_usage",
        key: "tshirt",
        label: "租户T恤",
        sortOrder: 1,
      },
    });
    tenantConfigOptionId = tenantOverride.id;

    const options = await listEnabledConfigOptions(["fabric_usage"]);
    const tshirtOptions = options.filter((option) => option.group === "fabric_usage" && option.key === "tshirt");

    assert.equal(tshirtOptions.length, 1);
    assert.equal(tshirtOptions[0]?.label, "租户T恤");
  });

  test("rejects config groups outside the whitelist", async () => {
    await assert.rejects(() => listEnabledConfigOptions(["not_allowed"]), /not allowed/);
  });

  test("config options route returns options", async () => {
    const response = await getConfigOptions({
      nextUrl: new URL("http://localhost/api/config-options?groups=fabric_usage"),
    } as never);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(Array.isArray(body.options), true);
  });
});

describe("API error handling", () => {
  test("invalid JSON returns 400", async () => {
    const response = await POST(
      new Request("http://localhost/api/fabrics", {
        method: "POST",
        body: "{bad",
        headers: { "content-type": "application/json" },
      }),
    );

    assert.equal(response.status, 400);
  });

  test("unique constraint conflicts map to 409 without database details", async () => {
    const response = errorResponse({ code: "P2002", meta: { target: ["tenantId", "code"] } });
    const body = await response.json();

    assert.equal(isUniqueConstraintError({ code: "P2002" }), true);
    assert.equal(response.status, 409);
    assert.equal(body.error, "Resource already exists.");
    assert.equal("meta" in body, false);
  });
});

describe("test database safety", () => {
  test("rejects non-test database names", () => {
    assert.throws(
      () => assertSafeTestDatabaseUrl("postgresql://user:password@localhost:5432/fabric_trade_dev"),
      /must contain "test"/,
    );
  });
});

describe("fabric completeness", () => {
  test("calculates completeness and missing flags", () => {
    const result = calculateFabricCompleteness({
      code: "SDD-CHECK",
      name: "Check fabric",
      fabricType: "woven",
      developmentSource: "market_purchase",
      composition: "polyester",
      weight: "180g",
      width: "150cm",
      greigeStatus: "pending",
      dyeingStatus: "none",
      postProcessStatus: "available",
      supplierCount: 0,
      preferredSupplierHasQuote: false,
    });

    assert.equal(result.completenessPercent, 69);
    assert.deepEqual(result.missingInfoFlags, [
      "missing_supplier",
      "missing_preferred_supplier_quote",
      "greige_pending",
      "missing_warp_weft_density",
    ]);
  });
});
