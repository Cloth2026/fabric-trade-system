import type {
  CustomerQuoteCurrency,
  CustomerQuoteStatus,
} from "@/server/customer-quotes/constants";
import {
  customerQuoteStatusLabels,
  customerQuoteTransitions,
} from "@/server/customer-quotes/constants";
import type {
  CustomerQuoteDetailRecord,
  CustomerQuoteItemInput,
  CustomerQuotePayload,
  CustomerQuoteRecord,
  CustomerQuoteUpdatePayload,
} from "@/lib/api/customer-quote-client";

export type QuoteItemDraft = {
  key: string;
  fabricId: string;
  fabricCode: string;
  fabricName: string;
  fabricUnit: string;
  fabricSupplierQuoteId: string;
  purchaseQuoteLabel: string;
  quantity: string;
  minimumOrderQty: string;
  unitPrice: string;
  costPrice: string;
  taxRate: string;
  leadTime: string;
  colorOrRemark: string;
  remark: string;
};

export type QuoteFormState = {
  customerId: string;
  customerName: string;
  contactId: string;
  contactName: string;
  currency: CustomerQuoteCurrency;
  exchangeRate: string;
  quoteDate: string;
  validUntil: string;
  priceTerms: string;
  deliveryTerms: string;
  leadTime: string;
  paymentTerms: string;
  taxRate: string;
  remark: string;
  items: QuoteItemDraft[];
};

let draftKeySeed = 0;
const nextKey = () => {
  draftKeySeed += 1;
  return `quote-item-${draftKeySeed}`;
};

export function todayInputValue() {
  const now = new Date();
  return localDateToInputValue(now);
}

// The API stores dates at UTC midnight, so slicing the raw ISO string would
// show the previous day west of UTC. Always convert back through local time.
export function isoDateToInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return localDateToInputValue(date);
}

function localDateToInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function createEmptyQuoteItem(): QuoteItemDraft {
  return {
    key: nextKey(),
    fabricId: "",
    fabricCode: "",
    fabricName: "",
    fabricUnit: "",
    fabricSupplierQuoteId: "",
    purchaseQuoteLabel: "",
    quantity: "",
    minimumOrderQty: "",
    unitPrice: "",
    costPrice: "",
    taxRate: "",
    leadTime: "",
    colorOrRemark: "",
    remark: "",
  };
}

export function createEmptyQuoteFormState(): QuoteFormState {
  return {
    customerId: "",
    customerName: "",
    contactId: "",
    contactName: "",
    currency: "CNY",
    exchangeRate: "1",
    quoteDate: todayInputValue(),
    validUntil: "",
    priceTerms: "",
    deliveryTerms: "",
    leadTime: "",
    paymentTerms: "",
    taxRate: "13",
    remark: "",
    items: [createEmptyQuoteItem()],
  };
}

export function quoteFormStateFromRecord(record: CustomerQuoteDetailRecord): QuoteFormState {
  return {
    customerId: record.customerId,
    customerName: record.customer.name,
    contactId: record.contactId ?? "",
    contactName: record.contact?.name ?? "",
    currency: record.currency,
    exchangeRate: record.exchangeRate,
    quoteDate: isoDateToInputValue(record.quoteDate),
    validUntil: isoDateToInputValue(record.validUntil),
    priceTerms: record.priceTerms ?? "",
    deliveryTerms: record.deliveryTerms ?? "",
    leadTime: record.leadTime ?? "",
    paymentTerms: record.paymentTerms ?? "",
    taxRate: rateToPercent(record.taxRate),
    remark: record.remark ?? "",
    items:
      record.items.length > 0
        ? record.items.map((item) => ({
            key: nextKey(),
            fabricId: item.fabricId,
            fabricCode: item.fabric.code,
            fabricName: item.fabric.name,
            fabricUnit: item.unit ?? "",
            fabricSupplierQuoteId: item.fabricSupplierQuoteId ?? "",
            purchaseQuoteLabel: item.fabricSupplierQuote
              ? `${item.fabricSupplierQuote.purchasePriceExclTax} ${item.fabricSupplierQuote.currency}/${item.fabricSupplierQuote.pricingUnit}`
              : "",
            quantity: item.quantity ?? "",
            minimumOrderQty: item.minimumOrderQty ?? "",
            unitPrice: item.unitPrice,
            costPrice: item.costPrice ?? "",
            taxRate: rateToPercent(item.taxRate),
            leadTime: item.leadTime ?? "",
            colorOrRemark: item.colorOrRemark ?? "",
            remark: item.remark ?? "",
          }))
        : [createEmptyQuoteItem()],
  };
}

// Tax rates travel as 0..1 (13% -> 0.13) but are typed as percent.
export function rateToPercent(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "";
  return String(Math.round(numeric * 1000) / 10);
}

export function percentToRate(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  return String(Math.round((numeric / 100) * 1000) / 1000);
}

export type QuoteFormErrors = Partial<
  Record<"customerId" | "exchangeRate" | "taxRate" | "items" | "quoteDate" | "validUntil", string>
> & {
  itemErrors?: Record<string, string>;
};

function isPositiveNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric > 0;
}

export function validateQuoteForm(state: QuoteFormState): QuoteFormErrors {
  const errors: QuoteFormErrors = {};
  if (!state.customerId.trim()) errors.customerId = "请选择报价客户";

  if (state.currency !== "CNY") {
    const rate = Number(state.exchangeRate);
    if (!state.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
      errors.exchangeRate = "非人民币报价必须填写汇率";
    }
  }

  const tax = state.taxRate.trim();
  if (tax !== "") {
    const numeric = Number(tax);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
      errors.taxRate = "税率需在 0 到 100 之间";
    }
  }

  if (state.quoteDate && state.validUntil && state.validUntil < state.quoteDate) {
    errors.validUntil = "有效期不能早于报价日期";
  }

  const pricedItems = state.items.filter((item) => item.fabricId.trim());
  if (pricedItems.length === 0) errors.items = "至少要有 1 行报价明细";

  const itemErrors: Record<string, string> = {};
  state.items.forEach((item) => {
    if (!item.fabricId.trim()) {
      itemErrors[item.key] = "请选择面料";
      return;
    }
    if (!item.unitPrice.trim() || isPositiveNumber(item.unitPrice) !== true) {
      itemErrors[item.key] = "单价必须是大于 0 的数字";
      return;
    }
    if (item.quantity.trim() !== "" && isPositiveNumber(item.quantity) !== true) {
      itemErrors[item.key] = "留空表示只报单价，填写时须大于 0";
      return;
    }
    if (item.costPrice.trim() !== "") {
      const cost = Number(item.costPrice);
      if (!Number.isFinite(cost) || cost < 0) itemErrors[item.key] = "参考成本不能为负数";
    }
    if (item.taxRate.trim() !== "") {
      const lineTax = Number(item.taxRate);
      if (!Number.isFinite(lineTax) || lineTax < 0 || lineTax > 100) {
        itemErrors[item.key] = "行税率需在 0 到 100 之间";
      }
    }
  });
  if (Object.keys(itemErrors).length > 0) errors.itemErrors = itemErrors;

  return errors;
}

const orNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

function itemToInput(item: QuoteItemDraft): CustomerQuoteItemInput {
  return {
    fabricId: item.fabricId.trim(),
    fabricSupplierQuoteId: item.fabricSupplierQuoteId.trim() || null,
    quantity: orNull(item.quantity),
    minimumOrderQty: orNull(item.minimumOrderQty),
    unitPrice: item.unitPrice.trim(),
    costPrice: orNull(item.costPrice),
    taxRate: percentToRate(item.taxRate),
    leadTime: orNull(item.leadTime),
    colorOrRemark: orNull(item.colorOrRemark),
    remark: orNull(item.remark),
  };
}

const dateOrNull = (value: string) => (value ? new Date(`${value}T00:00:00`).toISOString() : null);

export function quoteFormToPayload(state: QuoteFormState): CustomerQuotePayload {
  return {
    customerId: state.customerId.trim(),
    contactId: orNull(state.contactId),
    currency: state.currency,
    exchangeRate: state.currency === "CNY" ? "1" : orNull(state.exchangeRate),
    quoteDate: dateOrNull(state.quoteDate),
    validUntil: dateOrNull(state.validUntil),
    priceTerms: orNull(state.priceTerms),
    deliveryTerms: orNull(state.deliveryTerms),
    leadTime: orNull(state.leadTime),
    paymentTerms: orNull(state.paymentTerms),
    taxRate: percentToRate(state.taxRate),
    remark: orNull(state.remark),
    items: state.items.filter((item) => item.fabricId.trim()).map(itemToInput),
  };
}

export function quoteFormToUpdatePayload(state: QuoteFormState): CustomerQuoteUpdatePayload {
  return quoteFormToPayload(state);
}

export function formatQuoteDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatMoney(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined) return "—";
  const symbol = currency === "USD" ? "$" : "¥";
  return `${symbol}${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCny(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

export const quoteStatusTones: Record<CustomerQuoteStatus, string> = {
  draft: "bg-stone-200/76 text-stone-700",
  sent: "bg-blue-50/82 text-blue-800",
  accepted: "bg-emerald-50/82 text-emerald-800",
  rejected: "bg-rose-50/82 text-rose-800",
  expired: "bg-amber-50/82 text-amber-800",
};

export function quoteStatusLabel(status: string) {
  return customerQuoteStatusLabels[status as CustomerQuoteStatus] ?? status;
}

export function isQuoteOverdue(
  quote: Pick<CustomerQuoteRecord, "isOverdue"> | Pick<CustomerQuoteRecord, "isOverdue">,
) {
  return quote.isOverdue;
}

export function quoteTransitions(status: CustomerQuoteStatus) {
  return customerQuoteTransitions[status] ?? [];
}

export function countQuoteItems(quote: Pick<CustomerQuoteRecord, "_count">) {
  return quote._count.items;
}
