import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { shanghaiDateStamp, startOfBusinessDay } from "../lib/business-date";
import { formatShanghaiDate } from "../lib/business-date";
import {
  computeLineDelivery,
  computeSalesOrderDelivery,
  computeSalesOrderItemFigures,
  computeSalesOrderTotals,
  deriveDeliveryOverdue,
} from "../lib/sales-order-math";
import { deriveOverdue } from "./customer-quotes";
import { assertEnabledConfigKeys, configGroups } from "./config-options";
import { AppError } from "./errors";
import { getServerTenant } from "./tenant";
import {
  CNY_CURRENCY,
  OPERATION_LOG_MODULE,
  canBookSalesOrderDelivery,
  canEditSalesOrder,
  isSalesOrderTerminal,
  salesOrderCurrencies,
  salesOrderDeliveryStatuses,
  salesOrderStatuses,
  salesOrderTransitions,
  type SalesOrderStatus,
} from "./sales-orders/constants";
import {
  createSalesOrderFromQuoteSchema,
  createSalesOrderSchema,
  updateSalesOrderDeliverySchema,
  updateSalesOrderSchema,
  updateSalesOrderStatusSchema,
} from "./sales-orders/schemas";

type OrderSearchOptions = {
  q?: string | null;
  status?: string | null;
  customerId?: string | null;
  fabricId?: string | null;
  deliveryStatus?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number | string | null;
};

const fabricBriefSelect = {
  id: true,
  code: true,
  name: true,
  englishName: true,
  fabricType: true,
  pricingUnit: true,
  composition: true,
} as const;

const customerBriefSelect = { id: true, name: true, status: true, city: true } as const;
const contactBriefSelect = { id: true, name: true, title: true, phone: true } as const;
const supplierBriefSelect = { id: true, name: true } as const;
const sourceQuoteBriefSelect = {
  id: true,
  code: true,
  quoteDate: true,
  validUntil: true,
  status: true,
} as const;

const purchaseQuoteBriefSelect = {
  id: true,
  purchasePrice: true,
  currency: true,
  pricingUnit: true,
  minimumOrderQty: true,
  leadTime: true,
  fabricSupplierId: true,
} as const;

const fabricSupplierBriefSelect = {
  id: true,
  supplier: { select: supplierBriefSelect },
  supplierUnit: { select: { id: true, name: true } },
  supplierFabricCode: true,
  isPreferred: true,
} as const;

const orderItemSelect = {
  id: true,
  orderId: true,
  fabricId: true,
  sourceQuoteItemId: true,
  fabricSupplierId: true,
  fabricSupplierQuoteId: true,
  unit: true,
  quantity: true,
  deliveredQuantity: true,
  unitPrice: true,
  costPrice: true,
  taxRate: true,
  leadTime: true,
  colorOrRemark: true,
  remark: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  fabric: { select: fabricBriefSelect },
  fabricSupplier: { select: fabricSupplierBriefSelect },
  fabricSupplierQuote: { select: purchaseQuoteBriefSelect },
} as const;

const orderListSelect = {
  id: true,
  code: true,
  customerId: true,
  contactId: true,
  sourceQuoteId: true,
  status: true,
  orderDate: true,
  requestedDeliveryDate: true,
  currency: true,
  exchangeRate: true,
  priceTerms: true,
  deliveryTerms: true,
  paymentTerms: true,
  taxRate: true,
  receiverName: true,
  receiverPhone: true,
  receiverAddress: true,
  remark: true,
  confirmedAt: true,
  completedAt: true,
  cancelledAt: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: customerBriefSelect },
  contact: { select: contactBriefSelect },
  sourceQuote: { select: sourceQuoteBriefSelect },
  _count: { select: { items: true } },
  // Only enough to derive delivery status; line detail is a separate request.
  items: { select: { id: true, quantity: true, deliveredQuantity: true } },
} as const;

const orderDetailSelect = {
  ...orderListSelect,
  items: { select: orderItemSelect, orderBy: { sortOrder: "asc" as const } },
} as const;

function parsePayload<T>(schema: z.ZodType<T>, input: unknown, message: string) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, message, z.treeifyError(parsed.error));
  }
  return parsed.data;
}

export function normalizeOrderLimit(limit: number | string | null | undefined) {
  if (limit === null || limit === undefined || limit === "") return 20;
  const numericLimit = typeof limit === "number" ? limit : Number(limit);
  if (!Number.isFinite(numericLimit)) return 20;
  return Math.min(Math.max(Math.trunc(numericLimit), 1), 50);
}

async function generateOrderCode(tx: Prisma.TransactionClient, tenantId: string) {
  const prefix = `SO-${shanghaiDateStamp()}-`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const sameDayCount = await tx.salesOrder.count({
      where: { tenantId, code: { startsWith: prefix } },
    });
    const candidate = `${prefix}${String(sameDayCount + 1 + attempt).padStart(3, "0")}`;
    const existing = await tx.salesOrder.findUnique({
      where: { tenantId_code: { tenantId, code: candidate } },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new AppError(409, "Could not allocate an order code. Please retry.");
}

type OrderWithItems = Prisma.SalesOrderGetPayload<{ select: typeof orderDetailSelect }>;
type OrderListItem = Prisma.SalesOrderGetPayload<{ select: typeof orderListSelect }>;

// Amounts, margins, delivery progress and the late flag are derived, never
// stored: the same helpers run on the server and in the browser form preview,
// so the two can never disagree.
function decorateOrder(order: OrderWithItems) {
  const context = {
    currency: order.currency,
    exchangeRate: order.exchangeRate,
    taxRate: order.taxRate,
  };
  const figures = order.items.map((item) => computeSalesOrderItemFigures(item, context));
  const items = order.items.map((item, index) => ({ ...item, amounts: figures[index] }));
  const delivery = computeSalesOrderDelivery(figures);

  return {
    ...order,
    items,
    totals: computeSalesOrderTotals(figures, context),
    delivery,
    ...deriveDeliveryOverdue(order.requestedDeliveryDate, {
      isClosed: isSalesOrderTerminal(order.status),
      deliveryStatus: delivery.deliveryStatus,
    }),
  };
}

function decorateOrderList(orders: OrderListItem[]) {
  return orders.map((order) => {
    const delivery = computeSalesOrderDelivery(
      order.items.map((item) => ({
        delivery: computeLineDelivery(item.quantity, item.deliveredQuantity),
      })),
    );
    return {
      ...order,
      delivery,
      ...deriveDeliveryOverdue(order.requestedDeliveryDate, {
        isClosed: isSalesOrderTerminal(order.status),
        deliveryStatus: delivery.deliveryStatus,
      }),
    };
  });
}

function resolveExchangeRate(currency: string, exchangeRate: number | null | undefined) {
  if (currency === CNY_CURRENCY) return 1;
  if (exchangeRate === null || exchangeRate === undefined || exchangeRate <= 0) {
    throw new AppError(400, "An exchange rate is required for non-CNY orders.");
  }
  return exchangeRate;
}

function parseDayRange(value: string | null | undefined, label: string) {
  if (!value) return undefined;
  const parsed = z.coerce.date().safeParse(value);
  if (!parsed.success) throw new AppError(400, `Invalid ${label} date.`);
  return startOfBusinessDay(parsed.data);
}

type ItemInput = z.infer<typeof createSalesOrderSchema>["items"][number];

async function resolveItems(
  tx: Prisma.TransactionClient,
  tenantId: string,
  items: ItemInput[],
  orderCurrency: string,
  exchangeRate: number,
  bookedDeliveries?: Map<string, number>,
) {
  const fabricIds = [...new Set(items.map((item) => item.fabricId))];
  const fabrics = await tx.fabric.findMany({
    where: { id: { in: fabricIds }, tenantId },
    select: { id: true, pricingUnit: true },
  });
  if (fabrics.length !== fabricIds.length) {
    throw new AppError(404, "One or more fabrics were not found.");
  }
  const fabricMap = new Map(fabrics.map((fabric) => [fabric.id, fabric]));

  const supplierIds = [
    ...new Set(items.map((item) => item.fabricSupplierId).filter((id): id is string => !!id)),
  ];
  const suppliers = supplierIds.length
    ? await tx.fabricSupplier.findMany({
        where: { id: { in: supplierIds }, tenantId },
        select: { id: true, fabricId: true },
      })
    : [];
  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

  const purchaseQuoteIds = [
    ...new Set(
      items.map((item) => item.fabricSupplierQuoteId).filter((id): id is string => !!id),
    ),
  ];
  const purchaseQuotes = purchaseQuoteIds.length
    ? await tx.fabricSupplierQuote.findMany({
        where: { id: { in: purchaseQuoteIds }, tenantId },
        select: { ...purchaseQuoteBriefSelect, fabricSupplier: { select: { fabricId: true } } },
      })
    : [];
  const purchaseQuoteMap = new Map(purchaseQuotes.map((quote) => [quote.id, quote]));

  return items.map((item, index) => {
    const fabric = fabricMap.get(item.fabricId);
    if (!fabric) throw new AppError(404, "One or more fabrics were not found.");

    let fabricSupplierId: string | null = null;
    if (item.fabricSupplierId) {
      const supplier = supplierMap.get(item.fabricSupplierId);
      if (!supplier || supplier.fabricId !== item.fabricId) {
        throw new AppError(400, "The supplier source does not belong to the selected fabric.");
      }
      fabricSupplierId = supplier.id;
    }

    let costPrice = item.costPrice ?? null;

    if (item.fabricSupplierQuoteId) {
      const purchaseQuote = purchaseQuoteMap.get(item.fabricSupplierQuoteId);
      // Purchase quotes hang off a supplier offer, so the fabric is reached
      // through FabricSupplier.
      if (!purchaseQuote || purchaseQuote.fabricSupplier.fabricId !== item.fabricId) {
        throw new AppError(400, "The purchase quote does not belong to the selected fabric.");
      }
      if (fabricSupplierId && purchaseQuote.fabricSupplierId !== fabricSupplierId) {
        throw new AppError(400, "The purchase quote belongs to a different supplier source.");
      }
      fabricSupplierId = purchaseQuote.fabricSupplierId;

      // A cost typed by hand always wins: the purchase quote only seeds the
      // value when the line has none.
      if (costPrice === null) {
        // Cost is always stored in CNY. A purchase quote in CNY is taken as
        // is; one in the order currency is converted with this order's own
        // rate. Any other pairing has no rate available and must be typed in.
        if (purchaseQuote.currency === "CNY") {
          costPrice = Number(purchaseQuote.purchasePrice);
        } else if (purchaseQuote.currency === orderCurrency) {
          costPrice = Number(purchaseQuote.purchasePrice) * exchangeRate;
        } else {
          throw new AppError(
            400,
            "The purchase quote currency cannot be converted automatically. Enter the cost manually.",
          );
        }
      }
    }

    return {
      tenantId,
      fabricId: item.fabricId,
      sourceQuoteItemId: item.sourceQuoteItemId ?? null,
      fabricSupplierId,
      fabricSupplierQuoteId: item.fabricSupplierQuoteId ?? null,
      unit: String(fabric.pricingUnit),
      quantity: item.quantity,
      // Editing an order replaces its lines, but a delivery already booked
      // against a line must survive that.
      deliveredQuantity: bookedDeliveries?.get(item.id ?? "") ?? 0,
      unitPrice: item.unitPrice,
      costPrice,
      taxRate: item.taxRate ?? null,
      leadTime: item.leadTime ?? null,
      colorOrRemark: item.colorOrRemark ?? null,
      remark: item.remark ?? null,
      sortOrder: index,
    };
  });
}

export async function searchSalesOrders(options: OrderSearchOptions = {}) {
  const tenant = await getServerTenant();
  const query = options.q?.trim();
  const status =
    options.status && options.status !== "all"
      ? parsePayload(z.enum(salesOrderStatuses), options.status, "Invalid order status.")
      : undefined;
  const deliveryStatus =
    options.deliveryStatus && options.deliveryStatus !== "all"
      ? parsePayload(
          z.enum(salesOrderDeliveryStatuses),
          options.deliveryStatus,
          "Invalid delivery status.",
        )
      : undefined;
  const from = parseDayRange(options.from, "from");
  const to = parseDayRange(options.to, "to");

  const orders = await prisma.salesOrder.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status } : {}),
      ...(options.customerId ? { customerId: options.customerId } : {}),
      ...(options.fabricId ? { items: { some: { fabricId: options.fabricId } } } : {}),
      ...(from || to ? { orderDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(query
        ? {
            OR: [
              { code: { contains: query, mode: "insensitive" as const } },
              { remark: { contains: query, mode: "insensitive" as const } },
              { customer: { name: { contains: query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    select: orderListSelect,
    orderBy: [{ orderDate: "desc" as const }, { createdAt: "desc" as const }],
    take: normalizeOrderLimit(options.limit),
  });

  const decorated = decorateOrderList(orders);
  if (!deliveryStatus) return decorated;
  return decorated.filter((order) => order.delivery.deliveryStatus === deliveryStatus);
}

export async function getSalesOrder(id: string) {
  const tenant = await getServerTenant();
  const order = await prisma.salesOrder.findFirst({
    where: { id, tenantId: tenant.id },
    select: orderDetailSelect,
  });
  if (!order) throw new AppError(404, "Sales order not found.");
  return decorateOrder(order);
}

export async function createSalesOrder(input: unknown) {
  const data = parsePayload(createSalesOrderSchema, input, "Invalid sales order payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({
      where: { id: data.customerId, tenantId: tenant.id },
      select: { id: true },
    });
    if (!customer) throw new AppError(404, "Customer not found.");

    let contactId: string | null = null;
    if (data.contactId) {
      const contact = await tx.customerContact.findFirst({
        where: { id: data.contactId, tenantId: tenant.id, customerId: customer.id },
        select: { id: true },
      });
      if (!contact) throw new AppError(404, "Customer contact not found.");
      contactId = contact.id;
    }

    const currency = data.currency ?? CNY_CURRENCY;
    const exchangeRate = resolveExchangeRate(currency, data.exchangeRate);

    await assertEnabledConfigKeys(tx, tenant.id, [
      { group: configGroups.salesOrderStatus, keys: ["draft"], label: "status" },
    ]);

    const items = await resolveItems(tx, tenant.id, data.items, currency, exchangeRate);
    const code = await generateOrderCode(tx, tenant.id);

    const order = await tx.salesOrder.create({
      data: {
        tenantId: tenant.id,
        code,
        customerId: customer.id,
        contactId,
        status: "draft",
        orderDate: data.orderDate ?? new Date(),
        requestedDeliveryDate: data.requestedDeliveryDate ?? null,
        currency,
        exchangeRate,
        priceTerms: data.priceTerms ?? null,
        deliveryTerms: data.deliveryTerms ?? null,
        paymentTerms: data.paymentTerms ?? null,
        taxRate: data.taxRate ?? null,
        receiverName: data.receiverName ?? null,
        receiverPhone: data.receiverPhone ?? null,
        receiverAddress: data.receiverAddress ?? null,
        remark: data.remark ?? null,
        items: { create: items },
      },
      select: orderDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: OPERATION_LOG_MODULE,
        action: "create",
        targetType: "SalesOrder",
        targetId: order.id,
        detail: { code: order.code, customerId: customer.id, currency, itemCount: items.length },
      },
    });

    return decorateOrder(order);
  });
}

export async function updateSalesOrder(id: string, input: unknown) {
  const data = parsePayload(updateSalesOrderSchema, input, "Invalid sales order payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.salesOrder.findFirst({
      where: { id, tenantId: tenant.id },
      select: {
        id: true,
        code: true,
        status: true,
        currency: true,
        exchangeRate: true,
        customerId: true,
      },
    });
    if (!existing) throw new AppError(404, "Sales order not found.");
    // Draft and confirmed stay editable: production has not started yet.
    if (!canEditSalesOrder(existing.status)) {
      throw new AppError(400, "Only draft or confirmed orders can be edited.");
    }

    const customerId = data.customerId ?? existing.customerId;
    if (data.customerId && data.customerId !== existing.customerId) {
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, tenantId: tenant.id },
        select: { id: true },
      });
      if (!customer) throw new AppError(404, "Customer not found.");
    }

    let contactId: string | null | undefined;
    if (data.contactId) {
      const contact = await tx.customerContact.findFirst({
        where: { id: data.contactId, tenantId: tenant.id, customerId },
        select: { id: true },
      });
      if (!contact) throw new AppError(404, "Customer contact not found.");
      contactId = contact.id;
    } else if (data.contactId === null) {
      contactId = null;
    }

    const currency = data.currency ?? existing.currency;
    if (!(salesOrderCurrencies as readonly string[]).includes(currency)) {
      throw new AppError(400, "Unsupported order currency.");
    }
    const exchangeRate = resolveExchangeRate(
      currency,
      data.exchangeRate !== undefined ? data.exchangeRate : Number(existing.exchangeRate),
    );

    const updateData: Prisma.SalesOrderUncheckedUpdateInput = { exchangeRate };
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (contactId !== undefined) updateData.contactId = contactId;
    if (data.currency !== undefined) updateData.currency = currency;
    if (data.orderDate) updateData.orderDate = data.orderDate;
    if (data.requestedDeliveryDate !== undefined) {
      updateData.requestedDeliveryDate = data.requestedDeliveryDate;
    }
    if (data.priceTerms !== undefined) updateData.priceTerms = data.priceTerms;
    if (data.deliveryTerms !== undefined) updateData.deliveryTerms = data.deliveryTerms;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
    if (data.receiverName !== undefined) updateData.receiverName = data.receiverName;
    if (data.receiverPhone !== undefined) updateData.receiverPhone = data.receiverPhone;
    if (data.receiverAddress !== undefined) updateData.receiverAddress = data.receiverAddress;
    if (data.remark !== undefined) updateData.remark = data.remark;

    await tx.salesOrder.update({
      where: { id: existing.id },
      data: updateData,
      select: { id: true },
    });

    if (data.items) {
      // Read what has already been booked before replacing the lines, so a
      // delivered quantity is never silently lost.
      const previousItems = await tx.salesOrderItem.findMany({
        where: { orderId: existing.id, tenantId: tenant.id },
        select: { id: true, deliveredQuantity: true },
      });
      const bookedDeliveries = new Map(
        previousItems
          .filter((item) => Number(item.deliveredQuantity) > 0)
          .map((item) => [item.id, Number(item.deliveredQuantity)]),
      );

      const items = await resolveItems(
        tx,
        tenant.id,
        data.items,
        currency,
        exchangeRate,
        bookedDeliveries,
      );
      await tx.salesOrderItem.deleteMany({ where: { orderId: existing.id, tenantId: tenant.id } });
      await tx.salesOrderItem.createMany({
        data: items.map((item) => ({ ...item, orderId: existing.id })),
      });
    }

    const refreshed = await tx.salesOrder.findUniqueOrThrow({
      where: { id: existing.id },
      select: orderDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: OPERATION_LOG_MODULE,
        action: "update",
        targetType: "SalesOrder",
        targetId: existing.id,
        detail: { code: existing.code, changedFields: Object.keys(data) },
      },
    });

    return decorateOrder(refreshed);
  });
}

export async function updateSalesOrderStatus(id: string, input: unknown) {
  const data = parsePayload(updateSalesOrderStatusSchema, input, "Invalid order status payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.salesOrder.findFirst({
      where: { id, tenantId: tenant.id },
      select: {
        id: true,
        code: true,
        status: true,
        confirmedAt: true,
        items: { select: { id: true, quantity: true } },
      },
    });
    if (!existing) throw new AppError(404, "Sales order not found.");

    if (isSalesOrderTerminal(existing.status)) {
      throw new AppError(400, "This order is already closed and cannot change status.");
    }
    const allowed = salesOrderTransitions[existing.status as SalesOrderStatus] ?? [];
    if (!allowed.includes(data.status)) {
      throw new AppError(400, `Cannot move a ${existing.status} order to ${data.status}.`);
    }

    const reason = data.cancelReason?.trim();
    if (data.status === "cancelled" && !reason) {
      throw new AppError(400, "A cancel reason is required.");
    }
    // Confirming is the point where the lines become a real commitment, so
    // every one of them must have a quantity by then.
    if (data.status === "confirmed") {
      const missingQuantity = existing.items.filter(
        (item) => item.quantity === null || Number(item.quantity) <= 0,
      );
      if (missingQuantity.length > 0) {
        throw new AppError(400, "Every line needs a quantity before the order can be confirmed.");
      }
    }

    await assertEnabledConfigKeys(tx, tenant.id, [
      { group: configGroups.salesOrderStatus, keys: [data.status], label: "status" },
    ]);

    const now = new Date();
    const order = await tx.salesOrder.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        ...(data.status === "confirmed" && !existing.confirmedAt ? { confirmedAt: now } : {}),
        ...(data.status === "completed" ? { completedAt: now } : {}),
        ...(data.status === "cancelled" ? { cancelledAt: now, cancelReason: reason } : {}),
      },
      select: orderDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: OPERATION_LOG_MODULE,
        action: "update_status",
        targetType: "SalesOrder",
        targetId: order.id,
        detail: {
          code: order.code,
          from: existing.status,
          to: data.status,
          ...(reason ? { cancelReason: reason } : {}),
        },
      },
    });

    return decorateOrder(order);
  });
}

export async function updateSalesOrderDelivery(id: string, input: unknown) {
  const data = parsePayload(
    updateSalesOrderDeliverySchema,
    input,
    "Invalid delivery booking payload.",
  );
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.salesOrder.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, code: true, status: true },
    });
    if (!existing) throw new AppError(404, "Sales order not found.");
    if (!canBookSalesOrderDelivery(existing.status)) {
      throw new AppError(400, "Deliveries can only be booked while the order is being prepared.");
    }

    const lines = await tx.salesOrderItem.findMany({
      where: { orderId: existing.id, tenantId: tenant.id },
      select: { id: true, quantity: true },
    });
    const lineMap = new Map(lines.map((line) => [line.id, line]));

    for (const booking of data.items) {
      const line = lineMap.get(booking.id);
      if (!line) throw new AppError(404, "One or more order lines were not found.");
      if (line.quantity === null) {
        throw new AppError(400, "Fill in the line quantity before booking a delivery.");
      }
      if (booking.deliveredQuantity > Number(line.quantity)) {
        throw new AppError(400, "Delivered quantity cannot exceed the ordered quantity.");
      }
      await tx.salesOrderItem.update({
        where: { id: line.id },
        data: { deliveredQuantity: booking.deliveredQuantity },
      });
    }

    const refreshed = await tx.salesOrder.findUniqueOrThrow({
      where: { id: existing.id },
      select: orderDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: OPERATION_LOG_MODULE,
        action: "book_delivery",
        targetType: "SalesOrder",
        targetId: existing.id,
        detail: {
          code: existing.code,
          lines: data.items.map((item) => ({
            id: item.id,
            deliveredQuantity: item.deliveredQuantity,
          })),
        },
      },
    });

    return decorateOrder(refreshed);
  });
}

export async function createSalesOrderFromQuote(input: unknown) {
  const data = parsePayload(createSalesOrderFromQuoteSchema, input, "Invalid quote reference.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const quote = await tx.customerQuote.findFirst({
      where: { id: data.quoteId, tenantId: tenant.id },
      select: {
        id: true,
        code: true,
        customerId: true,
        contactId: true,
        status: true,
        currency: true,
        exchangeRate: true,
        priceTerms: true,
        deliveryTerms: true,
        paymentTerms: true,
        taxRate: true,
        validUntil: true,
        remark: true,
        items: {
          select: {
            id: true,
            fabricId: true,
            fabricSupplierQuoteId: true,
            unit: true,
            quantity: true,
            unitPrice: true,
            costPrice: true,
            taxRate: true,
            leadTime: true,
            colorOrRemark: true,
            remark: true,
            sortOrder: true,
            fabricSupplierQuote: { select: { id: true, fabricSupplierId: true } },
          },
          orderBy: { sortOrder: "asc" as const },
        },
      },
    });
    if (!quote) throw new AppError(404, "Customer quote not found.");
    // Only an accepted quote is a commitment we can execute on.
    if (quote.status !== "accepted") {
      throw new AppError(400, "Only an accepted quote can be turned into an order.");
    }
    if (quote.items.length === 0) {
      throw new AppError(400, "This quote has no lines to copy.");
    }

    const currency = quote.currency;
    if (!(salesOrderCurrencies as readonly string[]).includes(currency)) {
      throw new AppError(400, "Unsupported order currency.");
    }
    const exchangeRate = Number(quote.exchangeRate);

    await assertEnabledConfigKeys(tx, tenant.id, [
      { group: configGroups.salesOrderStatus, keys: ["draft"], label: "status" },
    ]);

    const code = await generateOrderCode(tx, tenant.id);
    const overdue = deriveOverdue(quote.validUntil, quote.status);
    const overdueNote = overdue.isOverdue
      ? `来源报价单 ${quote.code} 已于 ${formatShanghaiDate(quote.validUntil as Date)} 超期。`
      : null;

    // The order copies the quote once. Neither document is synced afterwards,
    // so changing the quote can never rewrite this order.
    const order = await tx.salesOrder.create({
      data: {
        tenantId: tenant.id,
        code,
        customerId: quote.customerId,
        contactId: quote.contactId,
        sourceQuoteId: quote.id,
        status: "draft",
        currency,
        exchangeRate,
        priceTerms: quote.priceTerms,
        deliveryTerms: quote.deliveryTerms,
        paymentTerms: quote.paymentTerms,
        taxRate: quote.taxRate,
        remark: [overdueNote, quote.remark].filter(Boolean).join(" ") || null,
        items: {
          create: quote.items.map((item, index) => ({
            tenantId: tenant.id,
            fabricId: item.fabricId,
            sourceQuoteItemId: item.id,
            fabricSupplierId: item.fabricSupplierQuote?.fabricSupplierId ?? null,
            fabricSupplierQuoteId: item.fabricSupplierQuoteId,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            taxRate: item.taxRate,
            leadTime: item.leadTime,
            colorOrRemark: item.colorOrRemark,
            remark: item.remark,
            sortOrder: index,
          })),
        },
      },
      select: orderDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: OPERATION_LOG_MODULE,
        action: "create_from_quote",
        targetType: "SalesOrder",
        targetId: order.id,
        detail: {
          code: order.code,
          sourceQuoteCode: quote.code,
          itemCount: quote.items.length,
          linesWithoutQuantity: quote.items.filter((item) => item.quantity === null).length,
        },
      },
    });

    return decorateOrder(order);
  });
}
