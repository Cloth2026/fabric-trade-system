import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { createFabric } from "../src/server/fabrics/create-fabric";
import { createCustomer } from "../src/server/customers";
import { createCustomerQuote, updateCustomerQuoteStatus } from "../src/server/customer-quotes";
import {
  createSalesOrder,
  createSalesOrderFromQuote,
  getSalesOrder,
  searchSalesOrders,
  updateSalesOrder,
  updateSalesOrderDelivery,
  updateSalesOrderStatus,
} from "../src/server/sales-orders";
import { getServerTenant } from "../src/server/tenant";
import { assertSafeTestDatabaseUrl } from "./test-database";

assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);

const stamp = Date.now();
const customerPrefix = `SO-CUST-${stamp}-`;
// Fabric codes must start with SDD- (see createFabricInputSchema).
const codePrefix = `SDD-SO-${stamp}-`;

let tenantId = "";
let otherTenantId = "";
let customerId = "";
let otherCustomerId = "";
let fabricId = "";
let secondFabricId = "";
let otherFabricId = "";
let fabricSupplierId = "";
let cnyPurchaseQuoteId = "";
let usdPurchaseQuoteId = "";


async function expectRejection(promise: Promise<unknown>, status: number, matcher: RegExp) {
  await assert.rejects(promise, (error: { status?: number; message?: string }) => {
    assert.equal(error.status, status);
    assert.match(error.message ?? "", matcher);
    return true;
  });
}

function buildItem(overrides: Record<string, unknown> = {}) {
  return { fabricId, quantity: "100", unitPrice: "20", ...overrides };
}

async function cleanup() {
  if (!tenantId) return;

  const orders = await prisma.salesOrder.findMany({
    where: { tenantId, customer: { name: { startsWith: customerPrefix } } },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);
  if (orderIds.length > 0) {
    await prisma.salesOrderItem.deleteMany({ where: { tenantId, orderId: { in: orderIds } } });
    await prisma.operationLog.deleteMany({ where: { tenantId, targetId: { in: orderIds } } });
    await prisma.salesOrder.deleteMany({ where: { id: { in: orderIds } } });
  }

  const quotes = await prisma.customerQuote.findMany({
    where: { tenantId, customer: { name: { startsWith: customerPrefix } } },
    select: { id: true },
  });
  const quoteIds = quotes.map((quote) => quote.id);
  if (quoteIds.length > 0) {
    await prisma.customerQuoteItem.deleteMany({ where: { tenantId, quoteId: { in: quoteIds } } });
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
    where: { tenantId, name: { startsWith: `SO-SUP-${stamp}` } },
    select: { id: true },
  });
  if (suppliers.length > 0) {
    await prisma.supplier.deleteMany({ where: { id: { in: suppliers.map((item) => item.id) } } });
  }

  if (otherTenantId) {
    await prisma.customer.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.fabric.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
  }
}

before(async () => {
  await cleanup();

  const tenant = await getServerTenant();
  tenantId = tenant.id;

  const otherTenant = await prisma.tenant.create({
    data: { name: `SO Other Tenant ${stamp}`, code: `so-other-${stamp}` },
    select: { id: true },
  });
  otherTenantId = otherTenant.id;

  const customer = await createCustomer({
    name: `${customerPrefix}A`,
    type: "garment_factory",
    status: "active",
    paymentTerms: "月结30天",
  });
  customerId = customer.id;

  const otherCustomer = await prisma.customer.create({
    data: { tenantId: otherTenantId, name: `${customerPrefix}Other`, type: "brand" },
    select: { id: true },
  });
  otherCustomerId = otherCustomer.id;

  const otherFabric = await prisma.fabric.create({
    data: {
      tenantId: otherTenantId,
      code: `${codePrefix}OTHER`,
      name: `Other Tenant Fabric ${stamp}`,
      fabricType: "woven",
      developmentSource: "market_purchase",
      composition: "100% polyester",
      weight: "150g",
      width: "140cm",
      pricingUnit: "meter",
    },
    select: { id: true },
  });
  otherFabricId = otherFabric.id;

  const fabric = await createFabric({
    code: `${codePrefix}A`,
    name: `Order Test Fabric ${stamp}`,
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

  const secondFabric = await createFabric({
    code: `${codePrefix}B`,
    name: `Second Order Fabric ${stamp}`,
    fabricType: "knitted",
    developmentSource: "market_purchase",
    composition: "95% cotton 5% spandex",
    weight: "240g",
    width: "160cm",
    greigeStatus: "none",
    dyeingStatus: "none",
    postProcessStatus: "none",
  });
  secondFabricId = secondFabric.id;

  const supplier = await prisma.supplier.create({
    data: { tenantId, name: `SO-SUP-${stamp}`, roles: ["weaving_factory"] },
    select: { id: true },
  });
  const source = await prisma.fabricSupplier.create({
    data: { tenantId, fabricId, supplierId: supplier.id },
    select: { id: true },
  });
  fabricSupplierId = source.id;

  const cnyPurchaseQuote = await prisma.fabricSupplierQuote.create({
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
  cnyPurchaseQuoteId = cnyPurchaseQuote.id;

  const usdPurchaseQuote = await prisma.fabricSupplierQuote.create({
    data: {
      tenantId,
      fabricSupplierId: source.id,
      purchasePrice: "2.40",
      currency: "USD",
      pricingUnit: "meter",
    },
    select: { id: true },
  });
  usdPurchaseQuoteId = usdPurchaseQuote.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("sales orders", () => {
  test("creates an order with the same fabric on two lines and derives amounts", async () => {
    const order = await createSalesOrder({
      customerId,
      currency: "CNY",
      taxRate: "0.13",
      requestedDeliveryDate: new Date("2026-10-30"),
      items: [
        buildItem({ colorOrRemark: "black" }),
        buildItem({ quantity: "50", unitPrice: "18", colorOrRemark: "navy" }),
      ],
    });

    assert.equal(order.code.startsWith("SO-"), true);
    assert.equal(order.status, "draft");
    assert.equal(order.items.length, 2);
    assert.equal(order.items[0].amounts.netAmount, 2000);
    assert.equal(order.items[0].amounts.taxInclusiveAmount, 2260);
    assert.equal(order.totals.taxInclusiveAmount, 3277);
    assert.equal(order.delivery.deliveryStatus, "none");
    assert.equal(order.items[0].amounts.delivery.deliveredQuantity, 0);
    assert.equal(order.items[0].amounts.delivery.remainingQuantity, 100);
  });

  test("rejects a line without a quantity", async () => {
    await expectRejection(
      createSalesOrder({
        customerId,
        items: [{ fabricId, unitPrice: "20" }],
      }),
      400,
      /Invalid sales order payload/,
    );
  });

  test("keeps orders inside their own tenant", async () => {
    await expectRejection(
      createSalesOrder({ customerId: otherCustomerId, items: [buildItem()] }),
      404,
      /Customer not found/,
    );

    await expectRejection(
      createSalesOrder({
        customerId,
        items: [{ fabricId: otherFabricId, quantity: "1", unitPrice: "2" }],
      }),
      404,
      /fabrics/i,
    );
  });

  test("pins CNY orders to rate 1 and requires a rate for USD orders", async () => {
    const cnyOrder = await createSalesOrder({
      customerId,
      currency: "CNY",
      exchangeRate: "7.2",
      items: [buildItem()],
    });
    assert.equal(String(cnyOrder.exchangeRate), "1");

    await expectRejection(
      createSalesOrder({ customerId, currency: "USD", items: [buildItem()] }),
      400,
      /exchange rate/i,
    );

    const usdOrder = await createSalesOrder({
      customerId,
      currency: "USD",
      exchangeRate: "7.2",
      items: [buildItem({ fabricSupplierQuoteId: usdPurchaseQuoteId })],
    });
    // A USD purchase quote converts with this order's own rate: 2.40 * 7.2.
    assert.equal(String(usdOrder.items[0].costPrice), "17.28");
    assert.equal(usdOrder.items[0].amounts.unitPriceCny, 144);
    assert.equal(usdOrder.items[0].amounts.unitMarginCny, 126.72);
  });

  test("validates the purchase side references", async () => {
    await expectRejection(
      createSalesOrder({
        customerId,
        items: [buildItem({ fabricId: secondFabricId, fabricSupplierQuoteId: cnyPurchaseQuoteId })],
      }),
      400,
      /purchase quote does not belong/i,
    );

    await expectRejection(
      createSalesOrder({
        customerId,
        items: [buildItem({ fabricId: secondFabricId, fabricSupplierId })],
      }),
      400,
      /supplier source does not belong/i,
    );

    const order = await createSalesOrder({
      customerId,
      items: [buildItem({ fabricSupplierId, fabricSupplierQuoteId: cnyPurchaseQuoteId })],
    });
    assert.equal(Number(order.items[0].costPrice), 9.5);
  });

  test("leaves cost and margin unknown when no line carries a cost snapshot", async () => {
    const order = await createSalesOrder({ customerId, items: [buildItem()] });

    assert.equal(order.totals.netAmount, 2000);
    assert.equal(order.totals.linesWithoutCost, 1);
    // Revenue must never be reported back as cost: with no cost snapshot the
    // margin is simply not known yet.
    assert.equal(order.totals.costCny, null);
    assert.equal(order.totals.marginCny, null);
    assert.equal(order.totals.marginRate, null);
  });

  test("keeps a hand-typed cost over the purchase snapshot", async () => {
    const order = await createSalesOrder({
      customerId,
      items: [
        buildItem({
          fabricSupplierQuoteId: cnyPurchaseQuoteId,
          costPrice: "11.25",
        }),
      ],
    });

    assert.equal(Number(order.items[0].costPrice), 11.25);
    // The supplier's own quote is never rewritten by our orders.
    const purchaseQuote = await prisma.fabricSupplierQuote.findUniqueOrThrow({
      where: { id: cnyPurchaseQuoteId },
      select: { purchasePrice: true },
    });
    assert.equal(Number(purchaseQuote.purchasePrice), 9.5);
  });

  test("walks the status pipeline and blocks illegal jumps", async () => {
    const order = await createSalesOrder({ customerId, items: [buildItem()] });

    await expectRejection(
      updateSalesOrderStatus(order.id, { status: "shipped" }),
      400,
      /Cannot move a draft order to shipped/,
    );

    const confirmed = await updateSalesOrderStatus(order.id, { status: "confirmed" });
    assert.equal(confirmed.status, "confirmed");
    assert.ok(confirmed.confirmedAt);

    const producing = await updateSalesOrderStatus(order.id, { status: "producing" });
    assert.equal(producing.status, "producing");

    const cancelled = await updateSalesOrderStatus(order.id, {
      status: "cancelled",
      cancelReason: "客户取消订单",
    });
    assert.equal(cancelled.status, "cancelled");
    assert.equal(cancelled.cancelReason, "客户取消订单");

    await expectRejection(updateSalesOrderStatus(order.id, { status: "producing" }), 400, /closed/);
  });

  test("requires a cancel reason and refuses to cancel shipped orders", async () => {
    const order = await createSalesOrder({ customerId, items: [buildItem()] });
    await updateSalesOrderStatus(order.id, { status: "confirmed" });
    await updateSalesOrderStatus(order.id, { status: "producing" });
    await updateSalesOrderStatus(order.id, { status: "shipped" });

    await expectRejection(
      updateSalesOrderStatus(order.id, { status: "cancelled" }),
      400,
      /Cannot move a shipped order to cancelled/,
    );

    const completed = await updateSalesOrderStatus(order.id, { status: "completed" });
    assert.equal(completed.status, "completed");
    assert.ok(completed.completedAt);
  });

  test("only draft and confirmed orders can be edited", async () => {
    const order = await createSalesOrder({ customerId, items: [buildItem({ quantity: "100" })] });

    const edited = await updateSalesOrder(order.id, {
      items: [buildItem({ id: order.items[0].id, quantity: "120", unitPrice: "21" })],
    });
    assert.equal(String(edited.items[0].quantity), "120");

    await updateSalesOrderStatus(order.id, { status: "confirmed" });
    const stillEditable = await updateSalesOrder(order.id, { remark: "客户追加交期要求" });
    assert.equal(stillEditable.remark, "客户追加交期要求");

    await updateSalesOrderStatus(order.id, { status: "producing" });
    await expectRejection(updateSalesOrder(order.id, { remark: "x" }), 400, /can be edited/i);
  });

  test("requires every line to have a quantity before confirming", async () => {
    const quote = await createCustomerQuote({
      customerId,
      currency: "CNY",
      items: [{ fabricId, unitPrice: "20" }],
    });
    await updateCustomerQuoteStatus(quote.id, { status: "sent" });
    await updateCustomerQuoteStatus(quote.id, { status: "accepted" });

    const order = await createSalesOrderFromQuote({ quoteId: quote.id });
    assert.equal(order.items[0].quantity, null);
    assert.equal(order.sourceQuote?.code, quote.code);

    await expectRejection(
      updateSalesOrderStatus(order.id, { status: "confirmed" }),
      400,
      /Every line needs a quantity/,
    );

    const filled = await updateSalesOrder(order.id, {
      items: [
        buildItem({
          id: order.items[0].id,
          sourceQuoteItemId: order.items[0].sourceQuoteItemId,
        }),
      ],
    });
    assert.equal(String(filled.items[0].quantity), "100");
    const confirmed = await updateSalesOrderStatus(order.id, { status: "confirmed" });
    assert.equal(confirmed.status, "confirmed");
  });

  test("books deliveries only while being prepared, and never past the ordered quantity", async () => {
    const order = await createSalesOrder({ customerId, items: [buildItem({ quantity: "100" })] });

    await expectRejection(
      updateSalesOrderDelivery(order.id, {
        items: [{ id: order.items[0].id, deliveredQuantity: "10" }],
      }),
      400,
      /Deliveries can only be booked while the order is being prepared/,
    );

    await updateSalesOrderStatus(order.id, { status: "confirmed" });
    await updateSalesOrderStatus(order.id, { status: "producing" });

    await expectRejection(
      updateSalesOrderDelivery(order.id, {
        items: [{ id: order.items[0].id, deliveredQuantity: "101" }],
      }),
      400,
      /cannot exceed the ordered quantity/,
    );

    const partial = await updateSalesOrderDelivery(order.id, {
      items: [{ id: order.items[0].id, deliveredQuantity: "40" }],
    });
    assert.equal(partial.delivery.deliveryStatus, "partial");
    assert.equal(partial.items[0].amounts.delivery.remainingQuantity, 60);

    const done = await updateSalesOrderDelivery(order.id, {
      items: [{ id: order.items[0].id, deliveredQuantity: "100" }],
    });
    assert.equal(done.delivery.deliveryStatus, "done");
    assert.equal(done.items[0].amounts.delivery.progress, 1);
  });

  test("keeps the traceability and purchase side when a confirmed order is edited", async () => {
    const quote = await createCustomerQuote({
      customerId,
      items: [{ fabricId, fabricSupplierQuoteId: cnyPurchaseQuoteId, quantity: "80", unitPrice: "20" }],
    });
    await updateCustomerQuoteStatus(quote.id, { status: "sent" });
    await updateCustomerQuoteStatus(quote.id, { status: "accepted" });

    const order = await createSalesOrderFromQuote({ quoteId: quote.id });
    await updateSalesOrderStatus(order.id, { status: "confirmed" });

    const edited = await updateSalesOrder(order.id, {
      items: [
        buildItem({
          id: order.items[0].id,
          sourceQuoteItemId: order.items[0].sourceQuoteItemId,
          fabricSupplierId,
          fabricSupplierQuoteId: cnyPurchaseQuoteId,
          quantity: "90",
          unitPrice: "21",
        }),
      ],
    });

    assert.equal(String(edited.items[0].quantity), "90");
    assert.equal(edited.items[0].sourceQuoteItemId, order.items[0].sourceQuoteItemId);
    assert.equal(edited.items[0].fabricSupplierId, fabricSupplierId);
    assert.equal(edited.items[0].fabricSupplierQuoteId, cnyPurchaseQuoteId);
    assert.equal(Number(edited.items[0].costPrice), 9.5);
  });

  test("refuses to convert a quote that is not accepted", async () => {
    const quote = await createCustomerQuote({
      customerId,
      items: [{ fabricId, quantity: "10", unitPrice: "20" }],
    });

    await expectRejection(
      createSalesOrderFromQuote({ quoteId: quote.id }),
      400,
      /Only an accepted quote/,
    );
    await expectRejection(
      createSalesOrderFromQuote({ quoteId: "missing-quote-id" }),
      404,
      /Customer quote not found/,
    );
  });

  test("converts the same accepted quote more than once for split orders", async () => {
    const quote = await createCustomerQuote({
      customerId,
      currency: "USD",
      exchangeRate: "7.1",
      paymentTerms: "月结60天",
      items: [{ fabricId, quantity: "200", unitPrice: "3.5" }],
    });
    await updateCustomerQuoteStatus(quote.id, { status: "sent" });
    await updateCustomerQuoteStatus(quote.id, { status: "accepted" });

    const first = await createSalesOrderFromQuote({ quoteId: quote.id });
    const second = await createSalesOrderFromQuote({ quoteId: quote.id });

    assert.notEqual(first.id, second.id);
    assert.equal(first.sourceQuoteId, quote.id);
    assert.equal(first.currency, "USD");
    assert.equal(String(first.exchangeRate), "7.1");
    assert.equal(first.paymentTerms, "月结60天");
    assert.equal(String(first.items[0].unitPrice), "3.5");

    // Each order is an independent copy: changing one never touches the other
    // nor the quote it came from.
    await updateSalesOrder(second.id, { paymentTerms: "月结90天" });
    const unchanged = await getSalesOrder(first.id);
    assert.equal(unchanged.paymentTerms, "月结60天");
  });

  test("searches by text, status and delivery status", async () => {
    const marker = `SEARCHMARK${stamp}`;
    const order = await createSalesOrder({
      customerId,
      remark: marker,
      requestedDeliveryDate: new Date("2020-01-05"),
      items: [buildItem()],
    });

    const byKeyword = await searchSalesOrders({ q: marker, limit: 20 });
    assert.equal(byKeyword.length, 1);
    assert.equal(byKeyword[0].id, order.id);
    // The requested date is long past, yet nothing is rewritten in the record.
    assert.equal(byKeyword[0].isOverdue, true);
    assert.equal(byKeyword[0].delivery.deliveryStatus, "none");

    const drafts = await searchSalesOrders({ status: "draft", limit: 50 });
    assert.ok(drafts.some((item) => item.id === order.id));

    const shipped = await searchSalesOrders({ status: "shipped", limit: 50 });
    assert.equal(shipped.some((item) => item.id === order.id), false);

    const pending = await searchSalesOrders({ deliveryStatus: "none", limit: 50 });
    assert.ok(pending.some((item) => item.id === order.id));

    const delivered = await searchSalesOrders({ deliveryStatus: "done", limit: 50 });
    assert.equal(delivered.some((item) => item.id === order.id), false);
  });

  test("writes an operation log for every mutation", async () => {
    const order = await createSalesOrder({ customerId, items: [buildItem()] });
    await updateSalesOrderStatus(order.id, { status: "confirmed" });

    const logs = await prisma.operationLog.findMany({
      where: { tenantId, module: "sales_order", targetId: order.id },
      orderBy: { createdAt: "asc" },
      select: { action: true, detail: true },
    });

    assert.deepEqual(
      logs.map((log) => log.action),
      ["create", "update_status"],
    );
    const statusLog = logs.find((log) => log.action === "update_status");
    const detail = statusLog?.detail as { from?: string; to?: string } | null;
    assert.equal(detail?.from, "draft");
    assert.equal(detail?.to, "confirmed");
  });
});
