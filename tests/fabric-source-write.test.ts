import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { createFabric } from "../src/server/fabrics/create-fabric";
import { addFabricSource, addFabricSourceQuote, updateFabricSource } from "../src/server/fabrics/source-quotes";
import { getServerTenant } from "../src/server/tenant";
import { assertSafeTestDatabaseUrl } from "./test-database";

assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);

const codePrefix = `SDD-SRC-${Date.now()}-`;
const supplierPrefix = `Source Test Supplier ${Date.now()}`;

let tenantId = "";
let supplierAId = "";
let supplierBId = "";
let unitA1Id = "";
let fabricWithoutSourceId = "";
let fabricWithSourceId = "";
let sourceOnFabricWithId = "";

function basePayload(codeSuffix: string) {
  return {
    code: `${codePrefix}${codeSuffix}`,
    name: `Source Test Fabric ${codeSuffix}`,
    fabricType: "knitted",
    developmentSource: "market_purchase",
    composition: "100% cotton",
    weight: "200g",
    width: "150cm",
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
}

async function sourceIdOf(fabricId: string, supplierId: string) {
  const source = await prisma.fabricSupplier.findFirstOrThrow({
    where: { tenantId, fabricId, supplierId },
    select: { id: true },
  });
  return source.id;
}

async function preferredSourceOf(fabricId: string) {
  const source = await prisma.fabricSupplier.findFirstOrThrow({
    where: { tenantId, fabricId, isPreferred: true },
    select: { id: true, supplierId: true },
  });
  return source;
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
  supplierAId = supplierA.id;
  supplierBId = supplierB.id;

  const unitA1 = await prisma.supplierUnit.create({
    data: {
      tenantId,
      supplierId: supplierA.id,
      name: `${supplierPrefix} A 车间一`,
      unitForm: "workshop",
      businessTypes: ["dyeing"],
    },
  });
  unitA1Id = unitA1.id;

  const fabricWithoutSource = await createFabric(basePayload("EMPTY"));
  fabricWithoutSourceId = fabricWithoutSource.id;

  const fabricWithSource = await createFabric({
    ...basePayload("SEEDED"),
    suppliers: [
      {
        supplierId: supplierA.id,
        initialQuote: { purchasePrice: "12.50" },
      },
    ],
  });
  fabricWithSourceId = fabricWithSource.id;
  sourceOnFabricWithId = fabricWithSource.supplierSources[0].id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("addFabricSource", () => {
  test("first source on empty fabric becomes preferred automatically", async () => {
    const detail = await addFabricSource(fabricWithoutSourceId, {
      supplierId: supplierAId,
      supplierUnitId: unitA1Id,
      supplierFabricCode: "SA-001",
    });

    assert.equal(detail.supplierSources.length, 1);
    assert.equal(detail.supplierSources[0].isPreferred, true);
    assert.equal(detail.supplierSources[0].supplierUnit?.id, unitA1Id);
  });

  test("duplicate supplier is rejected with 409", async () => {
    await assert.rejects(
      () => addFabricSource(fabricWithoutSourceId, { supplierId: supplierAId }),
      /already a source/,
    );
  });

  test("second source is not preferred unless requested", async () => {
    const detail = await addFabricSource(fabricWithoutSourceId, {
      supplierId: supplierBId,
    });

    const sources = detail.supplierSources;
    assert.equal(sources.length, 2);
    assert.equal(sources.find((source) => source.supplierId === supplierAId)?.isPreferred, true);
    assert.equal(sources.find((source) => source.supplierId === supplierBId)?.isPreferred, false);
  });

  test("unit from another supplier is rejected", async () => {
    await assert.rejects(
      () =>
        addFabricSource(fabricWithSourceId, {
          supplierId: supplierBId,
          supplierUnitId: unitA1Id,
        }),
      /does not belong/,
    );
  });

  test("nonexistent fabric returns 404", async () => {
    await assert.rejects(() => addFabricSource("missing-fabric-id", { supplierId: supplierAId }), /not found/i);
  });

  test("unknown payload field is rejected", async () => {
    await assert.rejects(
      () =>
        addFabricSource(fabricWithoutSourceId, {
          supplierId: supplierBId,
          tenantId: "hack",
        }),
      /Invalid fabric source payload/,
    );
  });
});

describe("addFabricSourceQuote", () => {
  test("quote inherits source current unit snapshot and updates completeness", async () => {
    const before = await prisma.fabric.findUniqueOrThrow({
      where: { id: fabricWithoutSourceId },
      select: { completenessPercent: true, missingInfoFlags: true },
    });
    assert.equal(before.missingInfoFlags.includes("missing_preferred_supplier_quote"), true);

    const preferred = await preferredSourceOf(fabricWithoutSourceId);
    const updated = await addFabricSourceQuote(fabricWithoutSourceId, preferred.id, {
      purchasePrice: "15.80",
      minimumOrderQty: "300kg",
      contactName: "王经理",
    });

    const preferredAfter = updated.supplierSources.find((source) => source.id === preferred.id);
    assert.ok(preferredAfter);
    assert.equal(preferredAfter.quotes.length, 1);
    assert.equal(preferredAfter.quotes[0].purchasePrice, "15.8");
    assert.equal(preferredAfter.quotes[0].supplierUnitId, unitA1Id);
    assert.equal(preferredAfter.quotes[0].pricingUnit, "kg");

    const after = await prisma.fabric.findUniqueOrThrow({
      where: { id: fabricWithoutSourceId },
      select: { completenessPercent: true, missingInfoFlags: true },
    });
    assert.ok(after.completenessPercent > before.completenessPercent);
    assert.equal(after.missingInfoFlags.includes("missing_preferred_supplier_quote"), false);
  });

  test("quote with explicit unit keeps it as snapshot", async () => {
    const detail = await addFabricSourceQuote(fabricWithSourceId, sourceOnFabricWithId, {
      purchasePrice: "13.00",
      supplierUnitId: unitA1Id,
    });

    const source = detail.supplierSources.find((item) => item.id === sourceOnFabricWithId);
    assert.ok(source);
    assert.equal(source.quotes.length, 2);
    assert.equal(source.quotes[0].supplierUnitId, unitA1Id);
  });

  test("missing price is rejected", async () => {
    await assert.rejects(
      () => addFabricSourceQuote(fabricWithSourceId, sourceOnFabricWithId, { purchasePrice: "" }),
      /Invalid fabric quote payload/,
    );
  });

  test("unknown source id returns 404", async () => {
    await assert.rejects(
      () => addFabricSourceQuote(fabricWithSourceId, "missing-source-id", { purchasePrice: "10.00" }),
      /not found/i,
    );
  });
});

describe("updateFabricSource", () => {
  test("switching preferred unsets the other source", async () => {
    const sourceBId = await sourceIdOf(fabricWithoutSourceId, supplierBId);
    const detail = await updateFabricSource(fabricWithoutSourceId, sourceBId, {
      isPreferred: true,
    });

    assert.equal(detail.supplierSources.find((source) => source.supplierId === supplierBId)?.isPreferred, true);
    assert.equal(detail.supplierSources.find((source) => source.supplierId === supplierAId)?.isPreferred, false);
  });

  test("clearing preferred promotes another source automatically", async () => {
    const sourceBId = await sourceIdOf(fabricWithoutSourceId, supplierBId);
    const detail = await updateFabricSource(fabricWithoutSourceId, sourceBId, {
      isPreferred: false,
    });

    const preferredSources = detail.supplierSources.filter((source) => source.isPreferred);
    assert.equal(preferredSources.length, 1);
    assert.equal(preferredSources[0].supplierId, supplierAId);
  });

  test("changing source unit does not rewrite historical quotes", async () => {
    const sourceAId = await sourceIdOf(fabricWithoutSourceId, supplierAId);
    const quotesBefore = await prisma.fabricSupplierQuote.findMany({
      where: { tenantId, fabricSupplierId: sourceAId },
      orderBy: { createdAt: "asc" },
      select: { id: true, supplierUnitId: true },
    });
    assert.ok(quotesBefore.length > 0);

    await updateFabricSource(fabricWithoutSourceId, sourceAId, { supplierUnitId: null });

    const quotesAfter = await prisma.fabricSupplierQuote.findMany({
      where: { tenantId, fabricSupplierId: sourceAId },
      orderBy: { createdAt: "asc" },
      select: { id: true, supplierUnitId: true },
    });

    assert.deepEqual(
      quotesAfter.map((quote) => quote.supplierUnitId),
      quotesBefore.map((quote) => quote.supplierUnitId),
    );
  });

  test("empty update payload is rejected", async () => {
    const sourceBId = await sourceIdOf(fabricWithoutSourceId, supplierBId);
    await assert.rejects(
      () => updateFabricSource(fabricWithoutSourceId, sourceBId, {}),
      /Invalid fabric source update payload/,
    );
  });

  test("cross-fabric source id returns 404", async () => {
    const sourceBId = await sourceIdOf(fabricWithoutSourceId, supplierBId);
    await assert.rejects(
      () =>
        updateFabricSource(fabricWithSourceId, sourceBId, {
          remarks: "should fail",
        }),
      /not found/i,
    );
  });
});

describe("operation logs", () => {
  test("source and quote writes are logged", async () => {
    const logs = await prisma.operationLog.findMany({
      where: { tenantId, targetType: { in: ["FabricSupplier", "FabricSupplierQuote"] } },
      select: { action: true, targetType: true },
    });

    assert.ok(logs.some((log) => log.action === "create_source"));
    assert.ok(logs.some((log) => log.action === "create_quote"));
    assert.ok(logs.some((log) => log.action === "update_source"));
  });
});
