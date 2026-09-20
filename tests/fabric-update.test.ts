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
}

before(async () => {
  const tenant = await getServerTenant();
  tenantId = tenant.id;
  await cleanup();

  const fabric = await createFabric(basePayload("MAIN"));
  fabricId = fabric.id;
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
      () => updateFabric(fabricId, { code: "SDD-HACK", name: "x" }),
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

  test("update is logged in operation log", async () => {
    const logs = await prisma.operationLog.findMany({
      where: { tenantId, targetType: "Fabric", targetId: fabricId, action: "update" },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { detail: true },
    });

    assert.ok(logs.length > 0);
    const detail = logs[0].detail as { updatedFields?: string[] };
    assert.ok(Array.isArray(detail.updatedFields));
    assert.ok(detail.updatedFields!.includes("warpWeftDensity"));
  });
});
