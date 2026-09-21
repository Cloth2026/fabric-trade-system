import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import {
  createCustomer,
  createCustomerContact,
  getCustomer,
  searchCustomers,
  updateCustomer,
  updateCustomerContact,
} from "../src/server/customers";
import { getServerTenant } from "../src/server/tenant";
import { assertSafeTestDatabaseUrl } from "./test-database";

assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);

const namePrefix = `CUST-TEST-${Date.now()}-`;

let tenantId = "";
let otherTenantId = "";

function basePayload(suffix: string) {
  return {
    name: `${namePrefix}${suffix}`,
    type: "brand" as const,
    level: "a" as const,
    city: "杭州",
    contactName: "张经理",
    phone: "13800000000",
    mainProducts: "针织女装",
  };
}

async function cleanupTenant(scopeTenantId: string) {
  const customers = await prisma.customer.findMany({
    where: { tenantId: scopeTenantId, name: { startsWith: namePrefix } },
    select: { id: true },
  });
  const customerIds = customers.map((customer) => customer.id);

  if (customerIds.length > 0) {
    await prisma.operationLog.deleteMany({ where: { tenantId: scopeTenantId, targetId: { in: customerIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  }
}

async function cleanup() {
  if (tenantId) await cleanupTenant(tenantId);
  if (otherTenantId) await cleanupTenant(otherTenantId);
  if (otherTenantId) {
    await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
  }
}

before(async () => {
  const tenant = await getServerTenant();
  tenantId = tenant.id;
  await cleanup();

  const other = await prisma.tenant.create({
    data: { name: "Other Test Tenant", code: `other-${Date.now()}` },
    select: { id: true },
  });
  otherTenantId = other.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("customer master data", () => {
  test("creates a customer with default active status and logs the operation", async () => {
    const customer = await createCustomer(basePayload("CREATE"));

    assert.equal(customer.name, `${namePrefix}CREATE`);
    assert.equal(customer.status, "active");
    assert.equal(customer.type, "brand");
    assert.equal(customer._count.contacts, 0);

    const log = await prisma.operationLog.findFirst({
      where: { tenantId, targetId: customer.id, targetType: "Customer", action: "create" },
    });
    assert.ok(log, "expected a create operation log");
    assert.equal(log?.module, "customer_management");
  });

  test("rejects duplicate customer names inside the same tenant", async () => {
    await createCustomer(basePayload("DUPLICATE"));

    await assert.rejects(
      () => createCustomer(basePayload("DUPLICATE")),
      (error: { status?: number }) => error.status === 409,
    );
  });

  test("rejects invalid payloads", async () => {
    await assert.rejects(
      () => createCustomer({ name: "" }),
      (error: { status?: number }) => error.status === 400,
    );

    await assert.rejects(
      () => createCustomer({ ...basePayload("BADTYPE"), type: "unknown_type" }),
      (error: { status?: number }) => error.status === 400,
    );
  });

  test("searches customers by keyword, type, level and status", async () => {
    await createCustomer(basePayload("SEARCH-A"));
    await createCustomer({ ...basePayload("SEARCH-B"), type: "garment_factory", level: "c", city: "广州" });
    const inactive = await createCustomer({ ...basePayload("SEARCH-C"), status: "inactive" });

    const all = await searchCustomers({ status: "all" });
    const names = all.map((customer) => customer.name);
    assert.ok(names.includes(`${namePrefix}SEARCH-A`));
    assert.ok(names.includes(`${namePrefix}SEARCH-C`));

    const byType = await searchCustomers({ type: "garment_factory", status: "all" });
    assert.ok(byType.every((customer) => customer.type === "garment_factory"));

    const byLevel = await searchCustomers({ level: "c", status: "all" });
    assert.ok(byLevel.some((customer) => customer.level === "c"));

    const activeOnly = await searchCustomers();
    assert.ok(!activeOnly.some((customer) => customer.id === inactive.id));

    const byKeyword = await searchCustomers({ q: "广州", status: "all" });
    assert.ok(byKeyword.some((customer) => customer.name === `${namePrefix}SEARCH-B`));
  });

  test("returns customer detail with contacts", async () => {
    const customer = await createCustomer(basePayload("DETAIL"));
    await createCustomerContact(customer.id, { name: "李主管", title: "采购", isPrimary: true });
    await createCustomerContact(customer.id, { name: "王经理", title: "跟单" });

    const detail = await getCustomer(customer.id);
    assert.equal(detail.id, customer.id);
    assert.equal(detail.contacts.length, 2);
    assert.equal(detail.contacts[0].isPrimary, true, "primary contact should be ordered first");
  });

  test("treats customers from another tenant as not found", async () => {
    const foreign = await prisma.customer.create({
      data: { tenantId: otherTenantId, name: `${namePrefix}FOREIGN` },
      select: { id: true },
    });

    await assert.rejects(
      () => getCustomer(foreign.id),
      (error: { status?: number }) => error.status === 404,
    );

    await assert.rejects(
      () => updateCustomer(foreign.id, { level: "b" }),
      (error: { status?: number }) => error.status === 404,
    );
  });

  test("rejects empty update payloads and duplicate renames", async () => {
    const first = await createCustomer(basePayload("UPDATE-A"));
    const second = await createCustomer(basePayload("UPDATE-B"));

    await assert.rejects(
      () => updateCustomer(first.id, {}),
      (error: { status?: number }) => error.status === 400,
    );

    await assert.rejects(
      () => updateCustomer(first.id, { name: second.name }),
      (error: { status?: number }) => error.status === 409,
    );
  });

  test("updates fields and logs status transitions", async () => {
    const customer = await createCustomer(basePayload("UPDATE-C"));

    const updated = await updateCustomer(customer.id, { level: "strategic", mainProducts: "梭织外套" });
    assert.equal(updated.level, "strategic");
    assert.equal(updated.mainProducts, "梭织外套");

    const deactivated = await updateCustomer(customer.id, { status: "inactive" });
    assert.equal(deactivated.status, "inactive");

    const logs = await prisma.operationLog.findMany({
      where: { tenantId, targetId: customer.id, targetType: "Customer" },
      orderBy: { createdAt: "asc" },
      select: { action: true },
    });
    assert.deepEqual(logs.map((log) => log.action), ["create", "update", "deactivate"]);
  });
});

describe("customer contacts", () => {
  test("creates contacts and keeps a single primary contact per customer", async () => {
    const customer = await createCustomer(basePayload("CONTACT-A"));

    const first = await createCustomerContact(customer.id, { name: "陈经理", isPrimary: true });
    assert.equal(first.isPrimary, true);

    const second = await createCustomerContact(customer.id, { name: "陈副理", isPrimary: true });
    assert.equal(second.isPrimary, true);

    const detail = await getCustomer(customer.id);
    const primaryCount = detail.contacts.filter((contact) => contact.isPrimary).length;
    assert.equal(primaryCount, 1, "only one contact may stay primary");
    assert.equal(detail.contacts.find((contact) => contact.isPrimary)?.id, second.id);
  });

  test("rejects duplicate contact names and inactive customers", async () => {
    const customer = await createCustomer(basePayload("CONTACT-B"));
    await createCustomerContact(customer.id, { name: "周经理" });

    await assert.rejects(
      () => createCustomerContact(customer.id, { name: "周经理" }),
      (error: { status?: number }) => error.status === 409,
    );

    const inactive = await createCustomer({ ...basePayload("CONTACT-C"), status: "inactive" });
    await assert.rejects(
      () => createCustomerContact(inactive.id, { name: "孙经理" }),
      (error: { status?: number }) => error.status === 409,
    );
  });

  test("updates contacts and logs contact changes", async () => {
    const customer = await createCustomer(basePayload("CONTACT-D"));
    const contact = await createCustomerContact(customer.id, { name: "吴经理", title: "主管" });

    const updated = await updateCustomerContact(contact.id, { title: "总监", isPrimary: true });
    assert.equal(updated.title, "总监");
    assert.equal(updated.isPrimary, true);

    await assert.rejects(
      () => updateCustomerContact(contact.id, {}),
      (error: { status?: number }) => error.status === 400,
    );

    const logs = await prisma.operationLog.findMany({
      where: { tenantId, targetId: contact.id, targetType: "CustomerContact" },
      select: { action: true },
    });
    assert.ok(logs.some((log) => log.action === "update"));
  });

  test("rejects renaming a contact to an existing sibling name", async () => {
    const customer = await createCustomer(basePayload("CONTACT-E"));
    const first = await createCustomerContact(customer.id, { name: "郑经理" });
    await createCustomerContact(customer.id, { name: "冯经理" });

    await assert.rejects(
      () => updateCustomerContact(first.id, { name: "冯经理" }),
      (error: { status?: number }) => error.status === 409,
    );
  });
});
