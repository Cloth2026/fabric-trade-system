import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { isUniqueConstraintError } from "../src/server/errors";
import { createFabric } from "../src/server/fabrics/create-fabric";
import { getServerTenant } from "../src/server/tenant";

const testId = Date.now().toString();
const fabricCode = `SDD-SUPPLIER-UNIT-${testId}`;

let tenantId = "";
let supplierAId = "";
let supplierBId = "";
let defaultTenantId = "";
let legacyFlowSupplierId = "";

function unitData(supplierId: string, name: string) {
  return {
    tenantId,
    supplierId,
    name,
    unitForm: "workshop",
    businessTypes: ["dyeing"],
  };
}

before(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      code: `supplier-unit-model-${testId}`,
      name: "Supplier Unit Model Test Tenant",
    },
  });
  tenantId = tenant.id;

  const [supplierA, supplierB] = await Promise.all([
    prisma.supplier.create({ data: { tenantId, name: `Supplier Unit A ${testId}`, roles: ["dyeing_factory"] } }),
    prisma.supplier.create({ data: { tenantId, name: `Supplier Unit B ${testId}`, roles: ["printing_factory"] } }),
  ]);
  supplierAId = supplierA.id;
  supplierBId = supplierB.id;

  const defaultTenant = await getServerTenant();
  defaultTenantId = defaultTenant.id;
  const legacyFlowSupplier = await prisma.supplier.create({
    data: { tenantId: defaultTenantId, name: `Legacy Fabric Supplier ${testId}`, type: "fabric_supplier" },
  });
  legacyFlowSupplierId = legacyFlowSupplier.id;
});

after(async () => {
  const fabric = await prisma.fabric.findUnique({
    where: { tenantId_code: { tenantId: defaultTenantId, code: fabricCode } },
    select: { id: true },
  });

  if (fabric) {
    await prisma.operationLog.deleteMany({ where: { tenantId: defaultTenantId, targetId: fabric.id } });
    await prisma.fabric.delete({ where: { id: fabric.id } });
  }

  if (legacyFlowSupplierId) {
    await prisma.supplier.deleteMany({ where: { id: legacyFlowSupplierId } });
  }
  if (tenantId) {
    await prisma.supplier.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  }
  await prisma.$disconnect();
});

describe("supplier production unit data model", () => {
  test("a supplier can own multiple production units", async () => {
    await prisma.supplierUnit.createMany({
      data: [
        unitData(supplierAId, "Dyeing Workshop One"),
        { ...unitData(supplierAId, "Finishing Workshop"), businessTypes: ["dyeing", "finishing"] },
      ],
    });

    const supplier = await prisma.supplier.findUniqueOrThrow({
      where: { id: supplierAId },
      include: { productionUnits: { orderBy: { name: "asc" } } },
    });

    assert.equal(supplier.productionUnits.length, 2);
    assert.deepEqual(supplier.productionUnits[0]?.businessTypes, ["dyeing"]);
    assert.deepEqual(supplier.productionUnits[1]?.businessTypes, ["dyeing", "finishing"]);
  });

  test("production unit names are unique under the same supplier", async () => {
    const name = "Duplicate Workshop";
    await prisma.supplierUnit.create({ data: unitData(supplierAId, name) });

    await assert.rejects(
      () => prisma.supplierUnit.create({ data: unitData(supplierAId, name) }),
      (error: unknown) => isUniqueConstraintError(error),
    );
  });

  test("different suppliers can use the same production unit name", async () => {
    const name = "Shared Workshop Name";
    const [unitA, unitB] = await Promise.all([
      prisma.supplierUnit.create({ data: unitData(supplierAId, name) }),
      prisma.supplierUnit.create({ data: unitData(supplierBId, name) }),
    ]);

    assert.equal(unitA.name, unitB.name);
    assert.notEqual(unitA.supplierId, unitB.supplierId);
  });

  test("deleting a supplier cascades to its production units", async () => {
    const supplier = await prisma.supplier.create({
      data: { tenantId, name: `Cascade Supplier ${testId}`, roles: ["dyeing_factory"] },
    });
    const unit = await prisma.supplierUnit.create({ data: unitData(supplier.id, "Cascade Workshop") });

    await prisma.supplier.delete({ where: { id: supplier.id } });

    assert.equal(await prisma.supplierUnit.count({ where: { id: unit.id } }), 0);
  });

  test("legacy fabric creation works without supplierUnitId", async () => {
    const fabric = await createFabric({
      code: fabricCode,
      name: `Supplier Unit Compatibility Fabric ${testId}`,
      fabricType: "knitted",
      developmentSource: "market_purchase",
      composition: "100% polyester",
      weight: "180g",
      width: "160cm",
      greigeStatus: "none",
      dyeingStatus: "none",
      postProcessStatus: "none",
      suppliers: [
        {
          supplierId: legacyFlowSupplierId,
          initialQuote: { purchasePrice: 18.5, currency: "CNY" },
        },
      ],
    });

    assert.equal(fabric.supplierSources.length, 1);
    assert.equal(fabric.supplierSources[0]?.supplierUnitId, null);
    assert.equal(fabric.supplierSources[0]?.quotes[0]?.supplierUnitId, null);

    const unit = await prisma.supplierUnit.create({
      data: {
        tenantId: defaultTenantId,
        supplierId: legacyFlowSupplierId,
        name: "Quoted Workshop",
        unitForm: "workshop",
        businessTypes: ["dyeing"],
      },
    });
    const sourceId = fabric.supplierSources[0]?.id;
    const quoteId = fabric.supplierSources[0]?.quotes[0]?.id;
    assert.ok(sourceId);
    assert.ok(quoteId);

    await prisma.fabricSupplier.update({ where: { id: sourceId }, data: { supplierUnitId: unit.id } });
    await prisma.fabricSupplierQuote.update({ where: { id: quoteId }, data: { supplierUnitId: unit.id } });
    await prisma.fabricSupplier.update({ where: { id: sourceId }, data: { supplierUnitId: null } });

    const historicalQuote = await prisma.fabricSupplierQuote.findUniqueOrThrow({ where: { id: quoteId } });
    assert.equal(historicalQuote.supplierUnitId, unit.id);
  });
});
