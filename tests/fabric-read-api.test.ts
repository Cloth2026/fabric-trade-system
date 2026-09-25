import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { GET as getFabricDetailRoute } from "../src/app/api/fabrics/[id]/route";
import { GET as getFabricsRoute } from "../src/app/api/fabrics/route";
import { prisma } from "../src/lib/prisma";
import { getServerTenant } from "../src/server/tenant";

const runId = Date.now().toString();
const codePrefix = `SDD-READ-${runId}-`;
const supplierPrefix = `Read API Supplier ${runId}`;

let tenantId = "";
let otherTenantId = "";
let fabricAId = "";
let fabricBId = "";
let fabricCId = "";
let fabricDId = "";
let otherFabricId = "";
let preferredSupplierId = "";
let preferredUnitId = "";
let historicalUnitId = "";
let fallbackSupplierId = "";

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function listRequest(query = "") {
  return new Request(`http://localhost/api/fabrics${query ? `?${query}` : ""}`);
}

async function readList(query = "") {
  const response = await getFabricsRoute(listRequest(query));
  return { response, body: await response.json() };
}

async function cleanup() {
  if (tenantId) {
    await prisma.fabric.deleteMany({
      where: { tenantId, code: { startsWith: codePrefix } },
    });
    await prisma.supplier.deleteMany({
      where: { tenantId, name: { startsWith: supplierPrefix } },
    });
  }

  if (otherTenantId) {
    await prisma.fabric.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.supplier.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
  }
}

function fabricData(
  suffix: string,
  overrides: Partial<{
    name: string;
    englishName: string | null;
    fabricType: "knitted" | "woven";
    pricingUnit: "kg" | "meter";
    developmentSource: string;
    status: string;
    composition: string;
    completenessPercent: number;
    updatedAt: Date;
    warpWeftDensity: string | null;
  }> = {},
) {
  return {
    tenantId,
    code: `${codePrefix}${suffix}`,
    name: `读取测试面料${suffix}`,
    englishName: `Read Test Fabric ${suffix}`,
    fabricType: "knitted" as const,
    pricingUnit: "kg" as const,
    developmentSource: "self_developed",
    status: "sellable",
    composition: "95% polyester 5% spandex",
    weight: "220g/m2",
    width: "160cm",
    yarnCount: "75D+40D",
    warpWeftDensity: null,
    category: "single_jersey",
    structure: "plain",
    tags: ["test"],
    usageOptionKeys: ["sportswear"],
    seasonOptionKeys: ["spring_summer"],
    certificationOptionKeys: ["oeko_tex"],
    elasticity: "four_way",
    sourceContact: "Source Contact",
    sourceDate: new Date("2026-08-01T00:00:00.000Z"),
    finishedReferencePrice: "28.80",
    repurchaseStatus: "available",
    tubeWeight: "0.8kg",
    tolerance: "3%",
    greigeStatus: "none" as const,
    dyeingStatus: "none" as const,
    postProcessStatus: "none" as const,
    colorFastness: "4",
    pilling: "4",
    inspectionConclusion: "passed",
    handFeel: "soft",
    remarks: "read API fixture",
    completenessPercent: 90,
    missingInfoFlags: [],
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides,
  };
}

before(async () => {
  const tenant = await getServerTenant();
  tenantId = tenant.id;
  await cleanup();

  const otherTenant = await prisma.tenant.create({
    data: { code: `fabric-read-other-${runId}`, name: "Fabric Read Other Tenant" },
  });
  otherTenantId = otherTenant.id;

  const [supplierA, supplierB, supplierC] = await Promise.all([
    prisma.supplier.create({
      data: { tenantId, name: `${supplierPrefix} Alpha`, roles: ["fabric_supplier"] },
    }),
    prisma.supplier.create({
      data: { tenantId, name: `${supplierPrefix} Preferred`, roles: ["dyeing_factory"] },
    }),
    prisma.supplier.create({
      data: { tenantId, name: `${supplierPrefix} Fallback`, roles: ["trading_company"] },
    }),
  ]);
  await prisma.supplier.create({
    data: { tenantId: otherTenant.id, name: `${supplierPrefix} Other Tenant` },
  });
  preferredSupplierId = supplierB.id;
  fallbackSupplierId = supplierC.id;

  const [preferredUnit, historicalUnit] = await Promise.all([
    prisma.supplierUnit.create({
      data: {
        tenantId,
        supplierId: supplierB.id,
        name: "染色一车间",
        unitForm: "workshop",
        businessTypes: ["dyeing", "finishing"],
      },
    }),
    prisma.supplierUnit.create({
      data: {
        tenantId,
        supplierId: supplierB.id,
        name: "染色二车间",
        unitForm: "workshop",
        businessTypes: ["dyeing"],
      },
    }),
    prisma.supplierUnit.create({
      data: {
        tenantId,
        supplierId: supplierC.id,
        name: "贸易业务部",
        unitForm: "department",
        businessTypes: ["other"],
      },
    }),
  ]);
  preferredUnitId = preferredUnit.id;
  historicalUnitId = historicalUnit.id;

  const [fabricA, fabricB, fabricC, fabricD, otherFabric] = await Promise.all([
    prisma.fabric.create({
      data: fabricData("A", {
        name: "星云弹力针织布",
        englishName: "Nebula Stretch Jersey",
        composition: "88% polyester 12% spandex",
        updatedAt: new Date("2026-09-12T00:00:00.000Z"),
      }),
    }),
    prisma.fabric.create({
      data: fabricData("B", {
        name: "月影梭织布",
        englishName: "Moonlight Woven",
        fabricType: "woven",
        pricingUnit: "meter",
        developmentSource: "market_purchase",
        status: "incomplete",
        composition: "100% nylon",
        completenessPercent: 60,
        warpWeftDensity: "110x76",
        updatedAt: new Date("2026-09-11T00:00:00.000Z"),
      }),
    }),
    prisma.fabric.create({
      data: {
        ...fabricData("C", {
          name: "仅旧货源字段面料",
          updatedAt: new Date("2026-09-10T00:00:00.000Z"),
        }),
        supplierId: supplierA.id,
        supplierQuote: "999.99",
        minimumOrderQty: "legacy MOQ",
      },
    }),
    prisma.fabric.create({
      data: fabricData("D", {
        name: "无报价货源面料",
        updatedAt: new Date("2026-09-09T00:00:00.000Z"),
      }),
    }),
    prisma.fabric.create({
      data: {
        ...fabricData("OTHER", { name: "其他租户秘密面料" }),
        tenantId: otherTenant.id,
      },
    }),
  ]);
  fabricAId = fabricA.id;
  fabricBId = fabricB.id;
  fabricCId = fabricC.id;
  fabricDId = fabricD.id;
  otherFabricId = otherFabric.id;

  const [sourceAEarly, sourceAPreferred, sourceBEarly] = await Promise.all([
    prisma.fabricSupplier.create({
      data: {
        tenantId,
        fabricId: fabricA.id,
        supplierId: supplierA.id,
        supplierFabricCode: `ALPHA-${runId}`,
        createdAt: new Date("2026-08-02T00:00:00.000Z"),
      },
    }),
    prisma.fabricSupplier.create({
      data: {
        tenantId,
        fabricId: fabricA.id,
        supplierId: supplierB.id,
        supplierUnitId: preferredUnit.id,
        supplierFabricCode: `PREFERRED-${runId}`,
        sampleStatus: "tested",
        qualityDifferences: "Dark shades are stable",
        isPreferred: true,
        createdAt: new Date("2026-08-03T00:00:00.000Z"),
      },
    }),
    prisma.fabricSupplier.create({
      data: {
        tenantId,
        fabricId: fabricB.id,
        supplierId: supplierC.id,
        supplierFabricCode: `FALLBACK-EARLY-${runId}`,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    }),
  ]);

  await Promise.all([
    prisma.fabricSupplier.create({
      data: {
        tenantId,
        fabricId: fabricB.id,
        supplierId: supplierB.id,
        supplierFabricCode: `FALLBACK-LATE-${runId}`,
        createdAt: new Date("2026-08-04T00:00:00.000Z"),
      },
    }),
    prisma.fabricSupplier.create({
      data: {
        tenantId,
        fabricId: fabricD.id,
        supplierId: supplierA.id,
        supplierFabricCode: `NO-QUOTE-${runId}`,
      },
    }),
    prisma.fabricSupplierQuote.create({
      data: {
        tenantId,
        fabricSupplierId: sourceAEarly.id,
        purchasePrice: "19.50",
        currency: "CNY",
        pricingUnit: "kg",
        quoteDate: new Date("2026-08-05T00:00:00.000Z"),
      },
    }),
    prisma.fabricSupplierQuote.create({
      data: {
        tenantId,
        fabricSupplierId: sourceAPreferred.id,
        supplierUnitId: historicalUnit.id,
        purchasePrice: "23.10",
        currency: "CNY",
        pricingUnit: "kg",
        minimumOrderQty: "500kg/color",
        leadTime: "12-15 days",
        contactName: "Wang Manager",
        quoteDate: new Date("2026-08-10T00:00:00.000Z"),
        createdAt: new Date("2026-08-10T01:00:00.000Z"),
      },
    }),
    prisma.fabricSupplierQuote.create({
      data: {
        tenantId,
        fabricSupplierId: sourceAPreferred.id,
        supplierUnitId: preferredUnit.id,
        purchasePrice: "24.80",
        currency: "CNY",
        pricingUnit: "kg",
        minimumOrderQty: "600kg/color",
        leadTime: "10-12 days",
        contactName: "Li Manager",
        quoteDate: new Date("2026-09-01T00:00:00.000Z"),
        createdAt: new Date("2026-09-01T01:00:00.000Z"),
        qualityDifferences: "Improved color consistency",
        remarks: "Latest quote",
      },
    }),
    prisma.fabricSupplierQuote.create({
      data: {
        tenantId,
        fabricSupplierId: sourceAPreferred.id,
        purchasePrice: "22.00",
        currency: "CNY",
        pricingUnit: "kg",
        quoteDate: new Date("2026-07-01T00:00:00.000Z"),
        createdAt: new Date("2026-07-01T01:00:00.000Z"),
        remarks: "Quote without production unit",
      },
    }),
  ]);

  await Promise.all([
    prisma.greigeFabric.create({
      data: {
        fabricId: fabricA.id,
        supplierId: supplierA.id,
        code: "GREIGE-001",
        composition: "88% polyester 12% spandex",
        unitPrice: "12.30",
      },
    }),
    prisma.greigeFabric.create({
      data: {
        fabricId: fabricA.id,
        supplierId: supplierB.id,
        code: "GREIGE-002",
        composition: "92% polyester 8% spandex",
        unitPrice: "13.10",
      },
    }),
    prisma.dyeingFinishing.create({
      data: {
        fabricId: fabricA.id,
        processType: "solid_dyeing",
        factoryId: supplierB.id,
        unitPrice: "4.20",
        cautions: "Watch shade variation",
      },
    }),
    prisma.dyeingFinishing.create({
      data: {
        fabricId: fabricA.id,
        processType: "heat_setting",
        factoryId: supplierB.id,
        unitPrice: "1.80",
      },
    }),
    prisma.postProcess.create({
      data: {
        fabricId: fabricA.id,
        processType: "calendering",
        factoryId: supplierB.id,
        effectDescription: "Soft sheen",
        unitPrice: "1.50",
      },
    }),
  ]);

  assert.ok(sourceBEarly.id);
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("GET /api/fabrics", () => {
  test("returns the default list in updatedAt and id descending order", async () => {
    const defaultResult = await readList();
    const defaultIds = defaultResult.body.data.map((fabric: { id: string }) => fabric.id);

    assert.equal(defaultResult.response.status, 200);
    assert.equal(defaultResult.body.pagination.page, 1);
    assert.equal(defaultResult.body.pagination.pageSize, 50);
    assert.ok(defaultIds.indexOf(fabricAId) < defaultIds.indexOf(fabricBId));
    assert.ok(defaultIds.indexOf(fabricBId) < defaultIds.indexOf(fabricCId));
    assert.ok(defaultIds.indexOf(fabricCId) < defaultIds.indexOf(fabricDId));

    const { response, body } = await readList(`q=${encodeURIComponent(codePrefix)}&pageSize=50`);
    assert.equal(response.status, 200);
    assert.deepEqual(
      body.data.map((fabric: { id: string }) => fabric.id),
      [fabricAId, fabricBId, fabricCId, fabricDId],
    );
    assert.deepEqual(body.pagination, { page: 1, pageSize: 50, total: 4, totalPages: 1 });
  });

  test("paginates results", async () => {
    const { body } = await readList(`q=${encodeURIComponent(codePrefix)}&page=2&pageSize=2`);
    assert.deepEqual(body.data.map((fabric: { id: string }) => fabric.id), [fabricCId, fabricDId]);
    assert.deepEqual(body.pagination, { page: 2, pageSize: 2, total: 4, totalPages: 2 });
  });

  test("searches code, Chinese and English names, composition, supplier name, and supplier fabric code", async () => {
    const searches: Array<[string, string]> = [
      [`${codePrefix}A`, fabricAId],
      ["星云弹力", fabricAId],
      ["Moonlight Woven", fabricBId],
      ["100% nylon", fabricBId],
      [`${supplierPrefix} Preferred`, fabricAId],
      [`FALLBACK-EARLY-${runId}`, fabricBId],
    ];

    for (const [query, expectedId] of searches) {
      const { response, body } = await readList(`q=${encodeURIComponent(query)}`);
      assert.equal(response.status, 200);
      assert.equal(body.data.some((fabric: { id: string }) => fabric.id === expectedId), true);
    }
  });

  test("filters by type, status, source, completeness, and combined conditions", async () => {
    const cases: Array<[string, string[]]> = [
      [`q=${encodeURIComponent(codePrefix)}&fabricType=woven`, [fabricBId]],
      [`q=${encodeURIComponent(codePrefix)}&status=incomplete`, [fabricBId]],
      [`q=${encodeURIComponent(codePrefix)}&developmentSource=market_purchase`, [fabricBId]],
      [`q=${encodeURIComponent(codePrefix)}&completeness=needs_attention`, [fabricBId]],
      [`q=${encodeURIComponent(codePrefix)}&completeness=complete`, [fabricAId, fabricCId, fabricDId]],
      [
        `q=${encodeURIComponent(codePrefix)}&fabricType=woven&status=incomplete&developmentSource=market_purchase&completeness=needs_attention`,
        [fabricBId],
      ],
    ];

    for (const [query, expectedIds] of cases) {
      const { response, body } = await readList(query);
      assert.equal(response.status, 200);
      assert.deepEqual(body.data.map((fabric: { id: string }) => fabric.id), expectedIds);
    }
  });

  test("selects the preferred source and its latest quote with Decimal serialized as a string", async () => {
    const { body } = await readList(`q=${encodeURIComponent(`${codePrefix}A`)}`);
    const item = body.data[0];

    assert.equal(item.supplierSourceCount, 2);
    assert.equal(item.preferredSupplierSource.supplierId, preferredSupplierId);
    assert.equal(item.preferredSupplierSource.supplierUnitId, preferredUnitId);
    assert.equal(item.preferredSupplierSource.supplierUnitName, "染色一车间");
    assert.equal(item.preferredSupplierSource.latestQuote.purchasePrice, "24.8");
    assert.equal(typeof item.preferredSupplierSource.latestQuote.purchasePrice, "string");
    assert.equal(item.preferredSupplierSource.latestQuote.contactName, "Li Manager");
  });

  test("falls back to the earliest source and returns null for missing sources or quotes", async () => {
    const fallback = (await readList(`q=${encodeURIComponent(`${codePrefix}B`)}`)).body.data[0];
    const noSource = (await readList(`q=${encodeURIComponent(`${codePrefix}C`)}`)).body.data[0];
    const noQuote = (await readList(`q=${encodeURIComponent(`${codePrefix}D`)}`)).body.data[0];

    assert.equal(fallback.preferredSupplierSource.supplierId, fallbackSupplierId);
    assert.equal(noSource.supplierSourceCount, 0);
    assert.equal(noSource.preferredSupplierSource, null);
    assert.equal("supplierQuote" in noSource, false);
    assert.equal(noQuote.preferredSupplierSource.latestQuote, null);
  });

  test("rejects invalid query parameters and disabled config keys", async () => {
    for (const query of [
      "fabricType=invalid",
      "completeness=unknown",
      "page=0",
      "pageSize=101",
      "status=not_a_config_key",
      "developmentSource=not_a_config_key",
    ]) {
      const { response } = await readList(query);
      assert.equal(response.status, 400);
    }
  });

  test("does not expose another tenant through search or a forged tenantId parameter", async () => {
    const { body } = await readList(`q=${encodeURIComponent("其他租户秘密面料")}&tenantId=${otherTenantId}`);
    assert.deepEqual(body.data, []);
    assert.equal(body.pagination.total, 0);
  });
});

describe("GET /api/fabrics/[id]", () => {
  test("returns non-legacy business fields, all sources, quote history, and production units", async () => {
    const response = await getFabricDetailRoute(
      new Request(`http://localhost/api/fabrics/${fabricAId}`),
      routeContext(fabricAId),
    );
    const body = await response.json();
    const detail = body.data;

    assert.equal(response.status, 200);
    assert.equal(detail.code, `${codePrefix}A`);
    assert.equal(detail.finishedReferencePrice, "28.8");
    assert.equal("supplierId" in detail, false);
    assert.equal("supplierQuote" in detail, false);
    assert.equal("minimumOrderQty" in detail, false);
    assert.equal(detail.supplierSources.length, 2);

    const preferred = detail.supplierSources.find((source: { isPreferred: boolean }) => source.isPreferred);
    assert.equal(preferred.supplier.id, preferredSupplierId);
    assert.equal(preferred.supplierUnit.id, preferredUnitId);
    assert.equal(preferred.supplierUnit.unitForm, "workshop");
    assert.deepEqual(
      preferred.quotes.map((quote: { purchasePrice: string }) => quote.purchasePrice),
      ["24.8", "23.1", "22"],
    );
    assert.equal(preferred.quotes.every((quote: { purchasePrice: unknown }) => typeof quote.purchasePrice === "string"), true);

    const [currentUnitQuote, historicalUnitQuote, noUnitQuote] = preferred.quotes;
    assert.equal(currentUnitQuote.supplierUnitId, preferredUnitId);
    assert.deepEqual(currentUnitQuote.supplierUnit, {
      id: preferredUnitId,
      name: "染色一车间",
      unitForm: "workshop",
      status: "active",
    });
    assert.equal(historicalUnitQuote.supplierUnitId, historicalUnitId);
    assert.deepEqual(historicalUnitQuote.supplierUnit, {
      id: historicalUnitId,
      name: "染色二车间",
      unitForm: "workshop",
      status: "active",
    });
    assert.notEqual(historicalUnitQuote.supplierUnitId, preferred.supplierUnit.id);
    assert.equal(noUnitQuote.supplierUnitId, null);
    assert.equal(noUnitQuote.supplierUnit, null);
  });

  test("returns structured greige, dyeing, and post-process data", async () => {
    const response = await getFabricDetailRoute(
      new Request(`http://localhost/api/fabrics/${fabricAId}`),
      routeContext(fabricAId),
    );
    const detail = (await response.json()).data;

    assert.equal(detail.greigeFabrics.length, 2);
    assert.equal(detail.greigeFabrics[0].code, "GREIGE-001");
    assert.equal(detail.greigeFabrics[0].unitPrice, "12.3");
    assert.equal(detail.greigeFabrics[1].code, "GREIGE-002");
    assert.equal(detail.dyeingFinishings.length, 2);
    assert.equal(detail.dyeingFinishings[0].processType, "solid_dyeing");
    assert.equal(detail.dyeingFinishings[0].unitPrice, "4.2");
    assert.equal(detail.dyeingFinishings[1].processType, "heat_setting");
    assert.equal(detail.postProcesses.length, 1);
    assert.equal(detail.postProcesses[0].effectDescription, "Soft sheen");
    assert.equal(detail.postProcesses[0].unitPrice, "1.5");
  });

  test("returns 404 for missing or cross-tenant fabrics", async () => {
    for (const id of ["missing-fabric-id", otherFabricId]) {
      const response = await getFabricDetailRoute(
        new Request(`http://localhost/api/fabrics/${id}`),
        routeContext(id),
      );
      assert.equal(response.status, 404);
    }
  });
});
