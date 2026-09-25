import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { createFabric } from "../src/server/fabrics/create-fabric";
import { updateFabric } from "../src/server/fabrics/update-fabric";
import { getServerTenant } from "../src/server/tenant";
import { assertSafeTestDatabaseUrl } from "./test-database";

assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);

const codePrefix = `SDD-UPD-${Date.now()}-`;

let tenantId = "";
let fabricId = "";
let supplierId = "";
let quotedFabricId = "";
let freeFabricId = "";

function basePayload(codeSuffix: string) {
  return {
    code: `${codePrefix}${codeSuffix}`,
    name: `Update Test Fabric ${codeSuffix}`,
    fabricType: "woven",
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

  await prisma.supplier.deleteMany({ where: { tenantId, name: { startsWith: "UPD-SUP-" } } });
}

before(async () => {
  const tenant = await getServerTenant();
  tenantId = tenant.id;
  await cleanup();

  const supplier = await prisma.supplier.create({
    data: {
      tenantId,
      name: `UPD-SUP-${Date.now()}`,
      roles: ["fabric_supplier"],
      status: "active",
    },
    select: { id: true },
  });
  supplierId = supplier.id;

  const fabric = await createFabric(basePayload("MAIN"));
  fabricId = fabric.id;

  const quoted = await createFabric({
    ...basePayload("QUOTED"),
    suppliers: [{ supplierId, initialQuote: { purchasePrice: "10" } }],
  });
  quotedFabricId = quoted.id;

  const free = await createFabric(basePayload("FREE"));
  freeFabricId = free.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("updateFabric", () => {
  test("partial update changes only provided fields", async () => {
    const before = await prisma.fabric.findUniqueOrThrow({
      where: { id: fabricId },
      select: { composition: true, weight: true, remarks: true },
    });

    const detail = await updateFabric(fabricId, { weight: "220g", remarks: "已复测" });

    assert.equal(detail.weight, "220g");
    assert.equal(detail.remarks, "已复测");
    assert.equal(detail.composition, before.composition);

    const row = await prisma.fabric.findUniqueOrThrow({
      where: { id: fabricId },
      select: { composition: true, weight: true, remarks: true },
    });
    assert.equal(row.composition, before.composition);
    assert.equal(row.weight, "220g");
    assert.equal(row.remarks, "已复测");
  });

  test("clearing an optional field sends null", async () => {
    const detail = await updateFabric(fabricId, { remarks: null });
    assert.equal(detail.remarks, null);
  });

  test("empty string for a required field is rejected", async () => {
    await assert.rejects(() => updateFabric(fabricId, { name: "   " }), /Invalid fabric update payload/);
  });

  test("unknown payload field is rejected", async () => {
    await assert.rejects(
      () => updateFabric(fabricId, { pricingUnit: "kg", name: "x" }),
      /Invalid fabric update payload/,
    );
  });

  test("empty payload is rejected", async () => {
    await assert.rejects(() => updateFabric(fabricId, {}), /Invalid fabric update payload/);
  });

  test("invalid config key is rejected", async () => {
    await assert.rejects(
      () => updateFabric(fabricId, { status: "not_a_status" }),
      /Invalid or disabled config option key/,
    );
  });

  test("option key arrays replace previous values", async () => {
    await updateFabric(fabricId, { usageOptionKeys: ["shirt", "skirt"] });
    const withTwo = await prisma.fabric.findUniqueOrThrow({
      where: { id: fabricId },
      select: { usageOptionKeys: true },
    });
    assert.deepEqual(withTwo.usageOptionKeys, ["shirt", "skirt"]);

    await updateFabric(fabricId, { usageOptionKeys: ["skirt"] });
    const withOne = await prisma.fabric.findUniqueOrThrow({
      where: { id: fabricId },
      select: { usageOptionKeys: true },
    });
    assert.deepEqual(withOne.usageOptionKeys, ["skirt"]);
  });

  test("warpWeftDensity update recalculates completeness", async () => {
    const before = await prisma.fabric.findUniqueOrThrow({
      where: { id: fabricId },
      select: { completenessPercent: true, missingInfoFlags: true },
    });

    const detail = await updateFabric(fabricId, { warpWeftDensity: "133x72" });

    const after = await prisma.fabric.findUniqueOrThrow({
      where: { id: fabricId },
      select: { completenessPercent: true, missingInfoFlags: true },
    });

    assert.equal(detail.warpWeftDensity, "133x72");
    assert.ok(after.completenessPercent > before.completenessPercent);
    assert.equal(after.missingInfoFlags.includes("missing_warp_weft_density"), false);
  });

  test("nonexistent fabric returns 404", async () => {
    await assert.rejects(() => updateFabric("missing-fabric-id", { name: "x" }), /not found/i);
  });

  test("fabric code can be changed and stays unique per tenant", async () => {
    const renamed = await updateFabric(fabricId, { code: `${codePrefix}RENAMED` });
    assert.equal(renamed.code, `${codePrefix}RENAMED`);

    await assert.rejects(
      () => updateFabric(fabricId, { code: `${codePrefix}FREE` }),
      /Fabric code already exists/,
    );

    await updateFabric(fabricId, { code: `${codePrefix}MAIN` });
  });

  test("fabric code must keep the SDD- prefix", async () => {
    await assert.rejects(
      () => updateFabric(fabricId, { code: "NO-PREFIX" }),
      /Invalid fabric update payload/,
    );
  });

  test("fabricType is editable while no purchase quote exists", async () => {
    const before = await prisma.fabric.findUniqueOrThrow({
      where: { id: freeFabricId },
      select: { fabricType: true, pricingUnit: true },
    });
    assert.equal(before.pricingUnit, "meter");

    const detail = await updateFabric(freeFabricId, { fabricType: "knitted" });
    assert.equal(detail.fabricType, "knitted");
    assert.equal(detail.pricingUnit, "kg");

    const row = await prisma.fabric.findUniqueOrThrow({
      where: { id: freeFabricId },
      select: { fabricType: true, pricingUnit: true },
    });
    assert.equal(row.fabricType, "knitted");
    assert.equal(row.pricingUnit, "kg");
  });

  test("fabricType is frozen once a purchase quote exists", async () => {
    await assert.rejects(
      () => updateFabric(quotedFabricId, { fabricType: "knitted" }),
      /面料已存在采购报价/,
    );
  });

  test("multiple greige, dyeing and post-process rows are saved and replaced", async () => {
    const detail = await updateFabric(freeFabricId, {
      greigeStatus: "available",
      dyeingStatus: "available",
      postProcessStatus: "available",
      greigeFabrics: [
        { code: "G-1", name: "坯布一", unitPrice: 12.5 },
        { code: "G-2", name: "坯布二", unitPrice: 13.5 },
      ],
      dyeingFinishings: [
        { processType: "dyeing", unitPrice: 4.2 },
        { processType: "heat_setting", unitPrice: 1.8 },
      ],
      postProcesses: [{ processType: "embossing", unitPrice: 1.5 }],
    });

    assert.equal(detail.greigeFabrics.length, 2);
    assert.deepEqual(detail.greigeFabrics.map((greige) => greige.code), ["G-1", "G-2"]);
    assert.equal(detail.greigeFabrics[0].unitPrice, "12.5");
    assert.equal(detail.dyeingFinishings.length, 2);
    assert.deepEqual(detail.dyeingFinishings.map((dyeing) => dyeing.processType), [
      "dyeing",
      "heat_setting",
    ]);
    assert.equal(detail.postProcesses.length, 1);

    const shrunk = await updateFabric(freeFabricId, {
      greigeFabrics: [{ code: "G-3", name: "坯布三" }],
      dyeingFinishings: [],
      dyeingStatus: "none",
    });
    assert.equal(shrunk.greigeFabrics.length, 1);
    assert.equal(shrunk.greigeFabrics[0].code, "G-3");
    assert.equal(shrunk.dyeingFinishings.length, 0);
    assert.equal(shrunk.dyeingStatus, "none");
  });

  test("process status must match the submitted details", async () => {
    // Rows are on file from the previous test, so flipping the status to "none"
    // without clearing them must be rejected.
    await assert.rejects(() => updateFabric(freeFabricId, { greigeStatus: "none" }), /坯布信息/);

    await assert.rejects(
      () => updateFabric(freeFabricId, { dyeingStatus: "available" }),
      /染整信息/,
    );
  });

  test("update is logged in operation log", async () => {
    const logs = await prisma.operationLog.findMany({
      where: { tenantId, targetType: "Fabric", targetId: fabricId, action: "update" },
      orderBy: { createdAt: "asc" },
      select: { detail: true },
    });

    assert.ok(logs.length > 0);
    const fields = logs.flatMap((log) => (log.detail as { updatedFields?: string[] }).updatedFields ?? []);
    assert.ok(fields.includes("warpWeftDensity"));
    assert.ok(fields.includes("code"));
  });
});
