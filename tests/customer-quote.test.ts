import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { createFabric } from "../src/server/fabrics/create-fabric";
import { createCustomer } from "../src/server/customers";
import {
  createCustomerQuote,
  getCustomerQuote,
  searchCustomerQuotes,
  updateCustomerQuote,
  updateCustomerQuoteStatus,
} from "../src/server/customer-quotes";
import { getServerTenant } from "../src/server/tenant";
import { assertSafeTestDatabaseUrl } from "./test-database";

assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);

const stamp = Date.now();
const customerPrefix = `QT-CUST-${stamp}-`;
// Fabric codes must start with SDD- (see createFabricInputSchema).
const codePrefix = `SDD-QT-${stamp}-`;

let tenantId = "";
let otherTenantId = "";
let customerId = "";
let otherCustomerId = "";
let fabricId = "";
let purchaseQuoteId = "";

async function makeCustomer(name: string) {
  return createCustomer({
    name,
    type: "garment_factory",
    status: "active",
    paymentTerms: "月结30天",
  });
}

async function cleanup() {
  if (!tenantId) return;

  const quotes = await prisma.customerQuote.findMany({
    where: { tenantId, customer: { name: { startsWith: customerPrefix } } },
    select: { id: true },
  });
  const quoteIds = quotes.map((quote) => quote.id);
  if (quoteIds.length > 0) {
    await prisma.operationLog.deleteMany({ where: { tenantId, targetId: { in: quoteIds } } });
    await prisma.customerQuote.deleteMany({ where: { id: { in: quoteIds } } });
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
    await prisma.fabricSupplierQuote.deleteMany({
      where: { tenantId, fabricSupplier: { fabricId: { in: fabricIds } } },
    });
    await prisma.fabricSupplier.deleteMany({ where: { tenantId, fabricId: { in: fabricIds } } });
    await prisma.operationLog.deleteMany({ where: { tenantId, targetId: { in: fabricIds } } });
    await prisma.fabric.deleteMany({ where: { id: { in: fabricIds } } });
  }

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId, name: { startsWith: `QT-SUP-${stamp}` } },
    select: { id: true },
  });
  if (suppliers.length > 0) {
    await prisma.supplier.deleteMany({ where: { id: { in: suppliers.map((s) => s.id) } } });
  }

  if (otherTenantId) {
    await prisma.customer.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
  }
}

before(async () => {
  await cleanup();

  const tenant = await getServerTenant();
  tenantId = tenant.id;

  const otherTenant = await prisma.tenant.create({
    data: { name: `QT Other Tenant ${stamp}`, code: `qt-other-${stamp}` },
    select: { id: true },
  });
  otherTenantId = otherTenant.id;

  const customer = await makeCustomer(`${customerPrefix}A`);
  customerId = customer.id;
  const otherCustomer = await prisma.customer.create({
    data: { tenantId: otherTenantId, name: `${customerPrefix}Other`, type: "brand" },
    select: { id: true },
  });
  otherCustomerId = otherCustomer.id;

  const fabric = await createFabric({
    code: `${codePrefix}A`,
    name: `Quotation Test Fabric ${stamp}`,
    fabricType: "woven",
    developmentSource: "market_purchase",
    composition: "100% cotton",
    weight: "200g",
    width: "150cm",
    greigeStatus: "none",
    dyeingStatus: "none",
    postProcessStatus: "none",
  });
  fabricId = fabric.id;

  const supplier = await prisma.supplier.create({
    data: { tenantId, name: `QT-SUP-${stamp}`, roles: ["weaving_factory"] },
    select: { id: true },
  });
  const source = await prisma.fabricSupplier.create({
    data: { tenantId, fabricId, supplierId: supplier.id },
    select: { id: true },
  });
  const purchaseQuote = await prisma.fabricSupplierQuote.create({
    data: {
      tenantId,
      fabricSupplierId: source.id,
      purchasePrice: "9.50",
      currency: "CNY",
      pricingUnit: "meter",
      minimumOrderQty: "500m/color",
      leadTime: "15 days",
    },
    select: { id: true },
  });
  purchaseQuoteId = purchaseQuote.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("customer quotes", () => {
  test("creates a quote with two lines of the same fabric and derives amounts", async () => {
    const quote = await createCustomerQuote({
      customerId,
      currency: "CNY",
      taxRate: "0.13",
      items: [
        { fabricId, quantity: "100", unitPrice: "12.5" },
        { fabricId, colorOrRemark: "navy", unitPrice: "11.8" },
      ],
    });

    assert.equal(quote.code.startsWith("QT-"), true);
    assert.equal(quote.status, "draft");
    assert.equal(quote.items.length, 2);
    // The second line quotes a unit price only: no quantity, no amount.
    assert.equal(quote.items[1].quantity, null);
    assert.equal(quote.items[1].amounts.netAmount, null);
    assert.equal(quote.items[0].amounts.netAmount, 1250);
    assert.equal(quote.items[0].amounts.taxInclusiveAmount, 1412.5);
    assert.equal(quote.totals.linesWithoutQuantity, 1);
    assert.equal(quote.totals.taxInclusiveAmount, 1412.5);
  });

  test("snapshots the purchase price as cost and keeps it editable", async () => {
    const quote = await createCustomerQuote({
      customerId,
      currency: "CNY",
      items: [{ fabricId, fabricSupplierQuoteId: purchaseQuoteId, quantity: "10", unitPrice: "15" }],
    });

    assert.equal(quote.items[0].costPrice?.toString(), "9.5");
    assert.equal(quote.items[0].amounts.marginCny, 55);
    assert.equal(quote.items[0].minimumOrderQty, "500m/color");

    // Overriding the snapshot is allowed and never writes back to the
    // purchase quote.
    const edited = await updateCustomerQuote(quote.id, {
      items: [{ fabricId, fabricSupplierQuoteId: purchaseQuoteId, quantity: "10", unitPrice: "15", costPrice: "11" }],
    });
    assert.equal(edited.items[0].costPrice?.toString(), "11");
    assert.equal(edited.items[0].amounts.marginCny, 40);

    const purchaseQuote = await prisma.fabricSupplierQuote.findUniqueOrThrow({
      where: { id: purchaseQuoteId },
      select: { purchasePrice: true },
    });
    assert.equal(purchaseQuote.purchasePrice.toString(), "9.5");
  });

  test("requires an exchange rate for USD and reports margin in CNY", async () => {
    await assert.rejects(
      () =>
        createCustomerQuote({
          customerId,
          currency: "USD",
          items: [{ fabricId, quantity: "10", unitPrice: "2" }],
        }),
      (error: { status?: number }) => error.status === 400,
    );

    const quote = await createCustomerQuote({
      customerId,
      currency: "USD",
      exchangeRate: "7.2",
      taxRate: "0",
      items: [{ fabricId, quantity: "500", unitPrice: "2.5", costPrice: "12" }],
    });

    assert.equal(quote.currency, "USD");
    assert.equal(quote.totals.netAmount, 1250);
    // 2.5 USD x 7.2 = 18 CNY, minus 12 CNY cost = 6 CNY per unit.
    assert.equal(quote.totals.marginCny, 3000);
    assert.equal(quote.totals.marginRate, 0.3333);
  });

  test("rejects a purchase quote that belongs to another fabric", async () => {
    const otherFabric = await createFabric({
      code: `${codePrefix}B`,
      name: `Quotation Other Fabric ${stamp}`,
      fabricType: "knitted",
      developmentSource: "market_purchase",
      composition: "100% cotton",
      weight: "200g",
      width: "150cm",
      greigeStatus: "none",
      dyeingStatus: "none",
      postProcessStatus: "none",
    });

    await assert.rejects(
      () =>
        createCustomerQuote({
          customerId,
          currency: "CNY",
          items: [{ fabricId: otherFabric.id, fabricSupplierQuoteId: purchaseQuoteId, unitPrice: "10" }],
        }),
      (error: { status?: number }) => error.status === 400,
    );
  });

  test("highlights overdue quotes without changing the stored status", async () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);

    const quote = await createCustomerQuote({
      customerId,
      currency: "CNY",
      validUntil: past.toISOString(),
      items: [{ fabricId, unitPrice: "10" }],
    });

    assert.equal(quote.status, "draft");
    assert.equal(quote.isOverdue, true);
    assert.equal(quote.overdueDays, 5);

    const reread = await getCustomerQuote(quote.id);
    assert.equal(reread.status, "draft");

    const overdue = await searchCustomerQuotes({ overdue: "true" });
    assert.equal(overdue.some((item) => item.id === quote.id), true);

    const expired = await updateCustomerQuoteStatus(quote.id, { status: "expired" });
    assert.equal(expired.status, "expired");
    assert.equal(expired.isOverdue, false);
    assert.ok(expired.decidedAt);
  });

  test("moves draft to sent to accepted and locks the quote", async () => {
    const quote = await createCustomerQuote({
      customerId,
      currency: "CNY",
      items: [{ fabricId, quantity: "1", unitPrice: "10" }],
    });

    await assert.rejects(
      () => updateCustomerQuoteStatus(quote.id, { status: "accepted" }),
      (error: { status?: number }) => error.status === 400,
    );

    const sent = await updateCustomerQuoteStatus(quote.id, { status: "sent" });
    assert.equal(sent.status, "sent");
    assert.ok(sent.sentAt);

    await assert.rejects(
      () => updateCustomerQuote(quote.id, { remark: "changed after sending" }),
      (error: { status?: number }) => error.status === 400,
    );

    const accepted = await updateCustomerQuoteStatus(quote.id, { status: "accepted" });
    assert.equal(accepted.status, "accepted");
    assert.ok(accepted.decidedAt);

    await assert.rejects(
      () => updateCustomerQuoteStatus(quote.id, { status: "sent" }),
      (error: { status?: number }) => error.status === 400,
    );
  });

  test("rejects customers from another tenant", async () => {
    await assert.rejects(
      () =>
        createCustomerQuote({
          customerId: otherCustomerId,
          currency: "CNY",
          items: [{ fabricId, unitPrice: "10" }],
        }),
      (error: { status?: number }) => error.status === 404,
    );
  });

  test("validates items and currency values", async () => {
    await assert.rejects(
      () => createCustomerQuote({ customerId, currency: "CNY", items: [] }),
      (error: { status?: number }) => error.status === 400,
    );

    await assert.rejects(
      () =>
        createCustomerQuote({
          customerId,
          currency: "EUR",
          items: [{ fabricId, unitPrice: "10" }],
        }),
      (error: { status?: number }) => error.status === 400,
    );

    await assert.rejects(
      () =>
        createCustomerQuote({
          customerId,
          currency: "CNY",
          items: [{ fabricId, unitPrice: "-1" }],
        }),
      (error: { status?: number }) => error.status === 400,
    );
  });

  test("allocates consecutive codes per day", async () => {
    const first = await createCustomerQuote({
      customerId,
      currency: "CNY",
      items: [{ fabricId, unitPrice: "10" }],
    });
    const second = await createCustomerQuote({
      customerId,
      currency: "CNY",
      items: [{ fabricId, unitPrice: "10" }],
    });

    assert.notEqual(first.code, second.code);
    assert.equal(first.code.slice(0, 13), second.code.slice(0, 13));
  });
});
