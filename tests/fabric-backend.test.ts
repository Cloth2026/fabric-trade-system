import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { calculateFabricCompleteness } from "../src/server/fabrics/completeness";
import { createFabric } from "../src/server/fabrics/create-fabric";
import { createFabricInputSchema, type CreateFabricInput } from "../src/server/fabrics/schema";
import { getServerTenant } from "../src/server/tenant";

const codePrefix = `SDD-TEST-${Date.now()}-`;
const supplierPrefix = `Test Supplier ${Date.now()}`;

let tenantId = "";
let supplierAId = "";
let supplierBId = "";
let otherTenantSupplierId = "";
let createdOtherTenantId = "";

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

  if (createdOtherTenantId) {
    await prisma.supplier.deleteMany({ where: { tenantId: createdOtherTenantId } });
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

  test("creation rolls back when a later supplier relation fails", async () => {
    await assert.rejects(
      () =>
        createFabric({
          ...basePayload("ROLLBACK"),
          suppliers: [
            { supplierId: supplierAId },
            { supplierId: supplierAId },
          ],
        }),
      /Unique constraint|unique constraint|violates unique constraint/,
    );

    const rolledBackFabric = await prisma.fabric.findUnique({
      where: { tenantId_code: { tenantId, code: `${codePrefix}ROLLBACK` } },
      select: { id: true },
    });

    assert.equal(rolledBackFabric, null);
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
