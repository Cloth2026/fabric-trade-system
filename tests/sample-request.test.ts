import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { createFabric } from "../src/server/fabrics/create-fabric";
import {
  createSampleRequest,
  getSampleRequest,
  searchSampleRequests,
  updateSampleItemFeedback,
  updateSampleRequest,
  updateSampleRequestStatus,
} from "../src/server/samples";
import { createCustomer } from "../src/server/customers";
import { getServerTenant } from "../src/server/tenant";
import { assertSafeTestDatabaseUrl } from "./test-database";

assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);

const stamp = Date.now();
const customerPrefix = `SMP-CUST-${stamp}-`;
const codePrefix = `SDD-SMP-${stamp}-`;

let tenantId = "";
let otherTenantId = "";
let customerId = "";
let wovenFabricId = "";
let knittedFabricId = "";

async function makeFabric(codeSuffix: string, fabricType: "woven" | "knitted") {
  return createFabric({
    code: `${codePrefix}${codeSuffix}`,
    name: `Sample Test Fabric ${codeSuffix}`,
    fabricType,
    developmentSource: "market_purchase",
    composition: "100% cotton",
    weight: "200g",
    width: "150cm",
    greigeStatus: "none",
    dyeingStatus: "none",
    postProcessStatus: "none",
  });
}

async function cleanup() {
  if (!tenantId) return;

  const requests = await prisma.sampleRequest.findMany({
    where: { tenantId, customer: { name: { startsWith: customerPrefix } } },
    select: { id: true },
  });
  const requestIds = requests.map((request) => request.id);

  if (requestIds.length > 0) {
    await prisma.operationLog.deleteMany({ where: { tenantId, targetId: { in: requestIds } } });
    await prisma.sampleRequest.deleteMany({ where: { id: { in: requestIds } } });
  }

  const customers = await prisma.customer.findMany({
    where: { tenantId, name: { startsWith: customerPrefix } },
    select: { id: true },
  });
  const customerIds = customers.map((customer) => customer.id);
  if (customerIds.length > 0) {
    await prisma.operationLog.deleteMany({ where: { tenantId, targetId: { in: customerIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
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

  const other = await prisma.tenant.create({
    data: { name: "Other Sample Tenant", code: `other-smp-${stamp}` },
    select: { id: true },
  });
  otherTenantId = other.id;

  const customer = await createCustomer({
    name: `${customerPrefix}MAIN`,
    type: "brand",
    city: "杭州",
  });
  customerId = customer.id;

  const woven = await makeFabric("WOVEN", "woven");
  const knitted = await makeFabric("KNIT", "knitted");
  wovenFabricId = woven.id;
  knittedFabricId = knitted.id;
});

after(async () => {
  await cleanup();
  if (otherTenantId) await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
  await prisma.$disconnect();
});

describe("sample request lifecycle", () => {
  test("creates a request with items and snapshots the unit per fabric type", async () => {
    const request = await createSampleRequest({
      customerId,
      purpose: "春季新品打样",
      items: [
        { fabricId: wovenFabricId, quantity: 2.5, colorOrRemark: "胚布样" },
        { fabricId: knittedFabricId, quantity: 3, colorOrRemark: "色纱样" },
      ],
    });

    assert.equal(request.status, "preparing");
    assert.match(request.code, /^SMP-\d{8}-\d{3}$/);
    assert.equal(request.items.length, 2);
    assert.equal(request.customer.id, customerId);

    const units = Object.fromEntries(request.items.map((item) => [item.fabricId, item.unit]));
    assert.equal(units[wovenFabricId], "meter");
    assert.equal(units[knittedFabricId], "kg");

    const log = await prisma.operationLog.findFirst({
      where: { tenantId, targetId: request.id, targetType: "SampleRequest", action: "create" },
    });
    assert.ok(log, "expected a create operation log");
    assert.equal(log?.module, "sample_management");
  });

  test("rejects a request without items and unknown fabrics", async () => {
    await assert.rejects(() => createSampleRequest({ customerId, items: [] }), /Invalid sample request payload/);
    await assert.rejects(
      () => createSampleRequest({ customerId, items: [{ fabricId: "missing-fabric-id" }] }),
      /One or more fabrics were not found/,
    );
  });

  test("rejects customers that belong to another tenant", async () => {
    const foreignCustomer = await prisma.customer.create({
      data: { tenantId: otherTenantId, name: `${customerPrefix}FOREIGN` },
      select: { id: true },
    });

    await assert.rejects(
      () => createSampleRequest({ customerId: foreignCustomer.id, items: [{ fabricId: wovenFabricId }] }),
      /Customer not found/,
    );

    await prisma.customer.delete({ where: { id: foreignCustomer.id } });
  });

  test("search filters by status and free text", async () => {
    const request = await createSampleRequest({
      customerId,
      purpose: "搜索用寄样单",
      carrier: "顺丰",
      trackingNo: `SF${stamp}`,
      items: [{ fabricId: wovenFabricId, quantity: 1 }],
    });

    const byStatus = await searchSampleRequests({ status: "preparing" });
    assert.ok(byStatus.some((item) => item.id === request.id));

    const byKeyword = await searchSampleRequests({ q: `SF${stamp}` });
    assert.ok(byKeyword.some((item) => item.id === request.id));

    await updateSampleRequestStatus(request.id, { status: "shipped", carrier: "顺丰", trackingNo: `SF${stamp}` });
    const shipped = await searchSampleRequests({ status: "shipped" });
    assert.ok(shipped.some((item) => item.id === request.id && item.trackingNo === `SF${stamp}`));
  });

  test("status transition stamps sentAt and returnedAt automatically", async () => {
    const request = await createSampleRequest({
      customerId,
      purpose: "状态流转测试",
      items: [{ fabricId: wovenFabricId, quantity: 1 }],
    });

    const shipped = await updateSampleRequestStatus(request.id, { status: "shipped" });
    assert.equal(shipped.status, "shipped");
    assert.ok(shipped.sentAt, "expected sentAt to be stamped");

    const returned = await updateSampleRequestStatus(request.id, { status: "returned" });
    assert.equal(returned.status, "returned");
    assert.ok(returned.returnedAt, "expected returnedAt to be stamped");

    const log = await prisma.operationLog.findFirst({
      where: { tenantId, targetId: request.id, action: "update_status" },
      orderBy: { createdAt: "desc" },
    });
    const logDetail = log?.detail as { to?: string } | null | undefined;
    assert.equal(logDetail?.to, "returned");
  });

  test("rejects unknown status and feedback results", async () => {
    const request = await createSampleRequest({
      customerId,
      items: [{ fabricId: wovenFabricId, quantity: 1 }],
    });

    await assert.rejects(
      () => updateSampleRequestStatus(request.id, { status: "teleported" }),
      /Invalid sample status payload/,
    );
    await assert.rejects(
      () => updateSampleRequest(request.id, { status: "teleported" }),
      /Invalid sample request payload/,
    );
  });

  test("item feedback is recorded per fabric with a timestamp", async () => {
    const request = await createSampleRequest({
      customerId,
      items: [{ fabricId: knittedFabricId, quantity: 2 }],
    });
    const itemId = request.items[0].id;

    const updated = await updateSampleItemFeedback(request.id, itemId, {
      feedback: "手感偏硬，需要再打一版",
      feedbackResult: "rejected",
    });

    assert.equal(updated.feedbackResult, "rejected");
    assert.ok(updated.feedbackAt, "expected feedbackAt to be stamped");

    const detail = await getSampleRequest(request.id);
    assert.equal(detail.items[0].feedbackResult, "rejected");

    const log = await prisma.operationLog.findFirst({
      where: { tenantId, targetId: itemId, targetType: "SampleRequestItem", action: "feedback" },
    });
    assert.ok(log, "expected a feedback operation log");
  });

  test("cross-tenant access returns 404", async () => {
    const request = await createSampleRequest({
      customerId,
      items: [{ fabricId: wovenFabricId, quantity: 1 }],
    });

    await prisma.sampleRequest.update({ where: { id: request.id }, data: { tenantId: otherTenantId } });
    await assert.rejects(() => getSampleRequest(request.id), /Sample request not found/);
    await prisma.sampleRequest.update({ where: { id: request.id }, data: { tenantId } });
  });

  test("update keeps items untouched", async () => {
    const request = await createSampleRequest({
      customerId,
      items: [{ fabricId: wovenFabricId, quantity: 1 }],
    });

    const updated = await updateSampleRequest(request.id, { remark: "客户要求一周内回复" });
    assert.equal(updated.remark, "客户要求一周内回复");
    assert.equal(updated.items.length, 1);
    assert.ok(["preparing", "shipped", "delivered", "returned", "closed"].includes(updated.status));
  });
});
