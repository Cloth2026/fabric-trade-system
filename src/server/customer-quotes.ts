import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { computeQuoteItemAmounts, computeQuoteTotals } from "../lib/customer-quote-math";
import { assertEnabledConfigKeys, configGroups } from "./config-options";
import { AppError } from "./errors";
import { getServerTenant } from "./tenant";
import {
  CNY_CURRENCY,
  customerQuoteCurrencies,
  customerQuoteStatuses,
  customerQuoteTransitions,
  isCustomerQuoteTerminal,
} from "./customer-quotes/constants";
import {
  createCustomerQuoteSchema,
  updateCustomerQuoteSchema,
  updateCustomerQuoteStatusSchema,
} from "./customer-quotes/schemas";

type QuoteSearchOptions = {
  q?: string | null;
  status?: string | null;
  customerId?: string | null;
  fabricId?: string | null;
  overdue?: string | null;
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

const purchaseQuoteBriefSelect = {
  id: true,
  purchasePriceExclTax: true,
  currency: true,
  pricingUnit: true,
  minimumOrderQty: true,
  leadTime: true,
} as const;

const quoteItemSelect = {
  id: true,
  quoteId: true,
  fabricId: true,
  fabricSupplierQuoteId: true,
  unit: true,
  quantity: true,
  minimumOrderQty: true,
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
  fabricSupplierQuote: { select: purchaseQuoteBriefSelect },
} as const;

const quoteListSelect = {
  id: true,
  code: true,
  customerId: true,
  contactId: true,
  status: true,
  version: true,
  currency: true,
  exchangeRate: true,
  quoteDate: true,
  validUntil: true,
  priceTerms: true,
  deliveryTerms: true,
  leadTime: true,
  paymentTerms: true,
  taxRate: true,
  remark: true,
  sentAt: true,
  decidedAt: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: customerBriefSelect },
  contact: { select: contactBriefSelect },
  _count: { select: { items: true } },
} as const;

const quoteDetailSelect = {
  ...quoteListSelect,
  items: { select: quoteItemSelect, orderBy: { sortOrder: "asc" as const } },
} as const;

function parsePayload<T>(schema: z.ZodType<T>, input: unknown, message: string) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, message, z.treeifyError(parsed.error));
  }
  return parsed.data;
}

export function normalizeQuoteLimit(limit: number | string | null | undefined) {
  if (limit === null || limit === undefined || limit === "") return 20;
  const numericLimit = typeof limit === "number" ? limit : Number(limit);
  if (!Number.isFinite(numericLimit)) return 20;
  return Math.min(Math.max(Math.trunc(numericLimit), 1), 50);
}

import { shanghaiDateStamp, startOfBusinessDay } from "../lib/business-date";

export function deriveOverdue(validUntil: Date | null, status: string, now = new Date()) {
  if (!validUntil || isCustomerQuoteTerminal(status)) {
    return { isOverdue: false, overdueDays: 0 };
  }
  const today = startOfBusinessDay(now);
  // Count in business days: a quote is overdue from the day after its
  // validity date, regardless of the time of day it was created.
  const dueDay = startOfBusinessDay(validUntil);
  if (dueDay >= today) return { isOverdue: false, overdueDays: 0 };
  const days = Math.round((today.getTime() - dueDay.getTime()) / 86_400_000);
  return { isOverdue: true, overdueDays: days };
}

async function generateQuoteCode(tx: Prisma.TransactionClient, tenantId: string) {
  const prefix = `QT-${shanghaiDateStamp()}-`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const sameDayCount = await tx.customerQuote.count({
      where: { tenantId, code: { startsWith: prefix } },
    });
    const candidate = `${prefix}${String(sameDayCount + 1 + attempt).padStart(3, "0")}`;
    const existing = await tx.customerQuote.findUnique({
      where: { tenantId_code: { tenantId, code: candidate } },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new AppError(409, "Could not allocate a quote code. Please retry.");
}

type QuoteWithItems = Prisma.CustomerQuoteGetPayload<{ select: typeof quoteDetailSelect }>;
type QuoteListItem = Prisma.CustomerQuoteGetPayload<{ select: typeof quoteListSelect }>;

// Amounts, margins and the overdue flag are derived, never stored: the same
// helper runs on the server (response payload) and in the browser (form
// preview) so the two can never disagree.
function decorateQuote(quote: QuoteWithItems) {
  const amounts = quote.items.map((item) =>
    computeQuoteItemAmounts(
      {
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        taxRate: item.taxRate,
      },
      {
        currency: quote.currency,
        exchangeRate: quote.exchangeRate,
        taxRate: quote.taxRate,
      },
    ),
  );
  const items = quote.items.map((item, index) => ({ ...item, amounts: amounts[index] }));
  const totals = computeQuoteTotals(
    items.map((item) => item.amounts),
    { currency: quote.currency, exchangeRate: quote.exchangeRate, taxRate: quote.taxRate },
  );
  return {
    ...quote,
    items,
    totals,
    ...deriveOverdue(quote.validUntil, quote.status),
  };
}

function decorateQuoteList(quotes: QuoteListItem[]) {
  return quotes.map((quote) => ({ ...quote, ...deriveOverdue(quote.validUntil, quote.status) }));
}

function resolveExchangeRate(currency: string, exchangeRate: number | null | undefined) {
  if (currency === CNY_CURRENCY) return 1;
  if (exchangeRate === null || exchangeRate === undefined || exchangeRate <= 0) {
    throw new AppError(400, "An exchange rate is required for non-CNY quotes.");
  }
  return exchangeRate;
}

type ItemInput = z.infer<typeof createCustomerQuoteSchema>["items"][number];

async function resolveItems(
  tx: Prisma.TransactionClient,
  tenantId: string,
  items: ItemInput[],
  quoteCurrency: string,
  exchangeRate: number,
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

  const purchaseQuoteIds = [
    ...new Set(items.map((item) => item.fabricSupplierQuoteId).filter((id): id is string => !!id)),
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

    let costPrice = item.costPrice ?? null;
    let minimumOrderQty = item.minimumOrderQty ?? null;

    if (item.fabricSupplierQuoteId) {
      const purchaseQuote = purchaseQuoteMap.get(item.fabricSupplierQuoteId);
      // Purchase quotes hang off a supplier offer, so the fabric is reached
      // through FabricSupplier.
      if (!purchaseQuote || purchaseQuote.fabricSupplier.fabricId !== item.fabricId) {
        throw new AppError(400, "The purchase quote does not belong to the selected fabric.");
      }
      // A cost typed by hand always wins: the purchase quote only seeds the
      // value when the line has none.
      if (costPrice === null) {
        // Cost is always stored in CNY. A purchase quote in CNY is taken as
        // is; one in the quote currency is converted with this quote's own
        // rate. Any other pairing has no rate available and must be typed in.
        if (purchaseQuote.currency === "CNY") {
          costPrice = Number(purchaseQuote.purchasePriceExclTax);
        } else if (purchaseQuote.currency === quoteCurrency) {
          costPrice = Number(purchaseQuote.purchasePriceExclTax) * exchangeRate;
        } else {
          throw new AppError(
            400,
            "The purchase quote currency cannot be converted automatically. Enter the cost manually.",
          );
        }
      }
      minimumOrderQty = minimumOrderQty ?? purchaseQuote.minimumOrderQty ?? null;
    }

    return {
      tenantId,
      fabricId: item.fabricId,
      fabricSupplierQuoteId: item.fabricSupplierQuoteId ?? null,
      unit: String(fabric.pricingUnit),
      quantity: item.quantity ?? null,
      minimumOrderQty,
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

export async function searchCustomerQuotes(options: QuoteSearchOptions = {}) {
  const tenant = await getServerTenant();
  const query = options.q?.trim();
  const status =
    options.status && options.status !== "all"
      ? parsePayload(z.enum(customerQuoteStatuses), options.status, "Invalid quote status.")
      : undefined;

  const quotes = await prisma.customerQuote.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status } : {}),
      ...(options.customerId ? { customerId: options.customerId } : {}),
      ...(options.fabricId ? { items: { some: { fabricId: options.fabricId } } } : {}),
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
    select: quoteListSelect,
    orderBy: [{ createdAt: "desc" as const }],
    take: normalizeQuoteLimit(options.limit),
  });

  const decorated = decorateQuoteList(quotes);
  if (options.overdue !== "true") return decorated;
  return decorated.filter((quote) => quote.isOverdue);
}

export async function getCustomerQuote(id: string) {
  const tenant = await getServerTenant();
  const quote = await prisma.customerQuote.findFirst({
    where: { id, tenantId: tenant.id },
    select: quoteDetailSelect,
  });
  if (!quote) throw new AppError(404, "Customer quote not found.");
  return decorateQuote(quote);
}

export async function createCustomerQuote(input: unknown) {
  const data = parsePayload(createCustomerQuoteSchema, input, "Invalid customer quote payload.");
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
      { group: configGroups.customerQuoteStatus, keys: ["draft"], label: "status" },
    ]);

    const items = await resolveItems(tx, tenant.id, data.items, currency, exchangeRate);
    const code = await generateQuoteCode(tx, tenant.id);

    const quote = await tx.customerQuote.create({
      data: {
        tenantId: tenant.id,
        code,
        customerId: customer.id,
        contactId,
        status: "draft",
        currency,
        exchangeRate,
        quoteDate: data.quoteDate ?? new Date(),
        validUntil: data.validUntil ?? null,
        priceTerms: data.priceTerms ?? null,
        deliveryTerms: data.deliveryTerms ?? null,
        leadTime: data.leadTime ?? null,
        paymentTerms: data.paymentTerms ?? null,
        taxRate: data.taxRate ?? null,
        remark: data.remark ?? null,
        items: { create: items },
      },
      select: quoteDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "customer_quote",
        action: "create",
        targetType: "CustomerQuote",
        targetId: quote.id,
        detail: { code: quote.code, customerId: customer.id, currency, itemCount: items.length },
      },
    });

    return decorateQuote(quote);
  });
}

export async function updateCustomerQuote(id: string, input: unknown) {
  const data = parsePayload(updateCustomerQuoteSchema, input, "Invalid customer quote payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customerQuote.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, code: true, status: true, currency: true, exchangeRate: true, customerId: true },
    });
    if (!existing) throw new AppError(404, "Customer quote not found.");
    // Only drafts stay editable: a sent quote is a commitment on record.
    if (existing.status !== "draft") {
      throw new AppError(400, "Only draft quotes can be edited.");
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
    if (!(customerQuoteCurrencies as readonly string[]).includes(currency)) {
      throw new AppError(400, "Unsupported quote currency.");
    }
    const exchangeRate = resolveExchangeRate(
      currency,
      data.exchangeRate !== undefined ? data.exchangeRate : Number(existing.exchangeRate),
    );

    const updateData: Prisma.CustomerQuoteUncheckedUpdateInput = { exchangeRate };
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (contactId !== undefined) updateData.contactId = contactId;
    if (data.currency !== undefined) updateData.currency = currency;
    if (data.quoteDate) updateData.quoteDate = data.quoteDate;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil;
    if (data.priceTerms !== undefined) updateData.priceTerms = data.priceTerms;
    if (data.deliveryTerms !== undefined) updateData.deliveryTerms = data.deliveryTerms;
    if (data.leadTime !== undefined) updateData.leadTime = data.leadTime;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
    if (data.remark !== undefined) updateData.remark = data.remark;

    await tx.customerQuote.update({
      where: { id: existing.id },
      data: updateData,
      select: { id: true },
    });

    if (data.items) {
      const items = await resolveItems(tx, tenant.id, data.items, currency, exchangeRate);
      await tx.customerQuoteItem.deleteMany({ where: { quoteId: existing.id, tenantId: tenant.id } });
      await tx.customerQuoteItem.createMany({ data: items.map((item) => ({ ...item, quoteId: existing.id })) });
    }

    const refreshed = await tx.customerQuote.findUniqueOrThrow({
      where: { id: existing.id },
      select: quoteDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "customer_quote",
        action: "update",
        targetType: "CustomerQuote",
        targetId: existing.id,
        detail: { code: existing.code, changedFields: Object.keys(data) },
      },
    });

    return decorateQuote(refreshed);
  });
}

export async function updateCustomerQuoteStatus(id: string, input: unknown) {
  const data = parsePayload(updateCustomerQuoteStatusSchema, input, "Invalid quote status payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customerQuote.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, code: true, status: true, sentAt: true },
    });
    if (!existing) throw new AppError(404, "Customer quote not found.");

    const currentStatus = existing.status as keyof typeof customerQuoteTransitions;
    const allowed = customerQuoteTransitions[currentStatus] ?? [];
    if (isCustomerQuoteTerminal(existing.status)) {
      throw new AppError(400, "This quote is already closed and cannot change status.");
    }
    if (!allowed.includes(data.status)) {
      throw new AppError(400, `Cannot move a ${existing.status} quote to ${data.status}.`);
    }

    await assertEnabledConfigKeys(tx, tenant.id, [
      { group: configGroups.customerQuoteStatus, keys: [data.status], label: "status" },
    ]);

    const now = new Date();
    const quote = await tx.customerQuote.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        ...(data.status === "sent" && !existing.sentAt ? { sentAt: now } : {}),
        ...(data.status !== "sent" ? { decidedAt: now } : {}),
      },
      select: quoteDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "customer_quote",
        action: "update_status",
        targetType: "CustomerQuote",
        targetId: quote.id,
        detail: { code: quote.code, from: existing.status, to: data.status },
      },
    });

    return decorateQuote(quote);
  });
}
