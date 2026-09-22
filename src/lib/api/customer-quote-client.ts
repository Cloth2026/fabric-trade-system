import type { CustomerQuoteCurrency, CustomerQuoteStatus } from "@/server/customer-quotes/constants";

export type QuoteFabricBrief = {
  id: string;
  code: string;
  name: string;
  englishName: string | null;
  fabricType: string | null;
  pricingUnit: string | null;
  composition: string | null;
};

export type QuoteCustomerBrief = {
  id: string;
  name: string;
  status: string;
  city: string | null;
};

export type QuoteContactBrief = {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
};

export type QuotePurchaseQuoteBrief = {
  id: string;
  purchasePrice: string;
  currency: string;
  pricingUnit: string;
  minimumOrderQty: string | null;
  leadTime: string | null;
} | null;

// Derived figures are computed with src/lib/customer-quote-math.ts, on both
// the server and the client, so the form preview and the stored quote agree.
export type QuoteItemAmounts = {
  taxRate: number;
  unitPrice: number;
  quantity: number | null;
  taxInclusiveUnitPrice: number;
  netAmount: number | null;
  taxAmount: number | null;
  taxInclusiveAmount: number | null;
  unitPriceCny: number;
  unitCostCny: number | null;
  unitMarginCny: number | null;
  marginCny: number | null;
  marginRate: number | null;
};

export type QuoteTotals = {
  currency: string;
  exchangeRate: number;
  netAmount: number;
  taxAmount: number;
  taxInclusiveAmount: number;
  costCny: number;
  marginCny: number;
  marginRate: number | null;
  linesWithoutQuantity: number;
};

export type CustomerQuoteItemRecord = {
  id: string;
  quoteId: string;
  fabricId: string;
  fabricSupplierQuoteId: string | null;
  unit: string | null;
  quantity: string | null;
  minimumOrderQty: string | null;
  unitPrice: string;
  costPrice: string | null;
  taxRate: string | null;
  leadTime: string | null;
  colorOrRemark: string | null;
  remark: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  fabric: QuoteFabricBrief;
  fabricSupplierQuote: QuotePurchaseQuoteBrief;
  amounts: QuoteItemAmounts;
};

export type CustomerQuoteRecord = {
  id: string;
  code: string;
  customerId: string;
  contactId: string | null;
  status: CustomerQuoteStatus;
  version: number;
  currency: CustomerQuoteCurrency;
  exchangeRate: string;
  quoteDate: string;
  validUntil: string | null;
  priceTerms: string | null;
  deliveryTerms: string | null;
  leadTime: string | null;
  paymentTerms: string | null;
  taxRate: string | null;
  remark: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: QuoteCustomerBrief;
  contact: QuoteContactBrief | null;
  _count: { items: number };
  isOverdue: boolean;
  overdueDays: number;
};

export type CustomerQuoteDetailRecord = Omit<CustomerQuoteRecord, "_count"> & {
  items: CustomerQuoteItemRecord[];
  totals: QuoteTotals;
};

export type CustomerQuoteItemInput = {
  fabricId: string;
  fabricSupplierQuoteId?: string | null;
  quantity?: string | null;
  minimumOrderQty?: string | null;
  unitPrice: string;
  costPrice?: string | null;
  taxRate?: string | null;
  leadTime?: string | null;
  colorOrRemark?: string | null;
  remark?: string | null;
};

export type CustomerQuotePayload = {
  customerId: string;
  contactId?: string | null;
  currency?: CustomerQuoteCurrency;
  exchangeRate?: string | null;
  quoteDate?: string | null;
  validUntil?: string | null;
  priceTerms?: string | null;
  deliveryTerms?: string | null;
  leadTime?: string | null;
  paymentTerms?: string | null;
  taxRate?: string | null;
  remark?: string | null;
  items: CustomerQuoteItemInput[];
};

export type CustomerQuoteUpdatePayload = Partial<CustomerQuotePayload>;

export type CustomerQuoteStatusPayload = {
  status: CustomerQuoteStatus;
};

export class CustomerQuoteApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CustomerQuoteApiError";
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as { error?: string; details?: unknown } & T;

  if (!response.ok) {
    throw new CustomerQuoteApiError(response.status, body.error ?? "请求失败，请稍后重试", body.details);
  }

  return body;
}

function jsonRequest(method: "POST" | "PATCH", body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function getQuoteFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof CustomerQuoteApiError)) return {};
  const details = error.details as { properties?: Record<string, { errors?: string[] }> } | undefined;
  const properties = details?.properties ?? {};

  return Object.fromEntries(
    Object.entries(properties)
      .filter((entry): entry is [string, { errors: string[] }] => Boolean(entry[1].errors?.[0]))
      .map(([field, value]) => [field, value.errors[0]]),
  );
}

export function getQuoteErrorMessage(error: unknown, fallback: string) {
  if (error instanceof CustomerQuoteApiError) {
    if (error.status === 404) return "报价单不存在或无权访问";
    if (error.status === 409) return "数据冲突，请刷新后重试";
    if (error.status === 400) return "请检查填写内容，修正标记字段后再保存";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function fetchCustomerQuotes(
  filters: {
    q?: string;
    status?: CustomerQuoteStatus | "all";
    customerId?: string;
    overdue?: boolean;
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.overdue) params.set("overdue", "true");
  params.set("limit", String(filters.limit ?? 50));

  const result = await requestJson<{ customerQuotes: CustomerQuoteRecord[] }>(
    `/api/customer-quotes?${params}`,
    { signal, cache: "no-store" },
  );
  return result.customerQuotes;
}

export async function createCustomerQuote(payload: CustomerQuotePayload) {
  const result = await requestJson<{ customerQuote: CustomerQuoteDetailRecord }>(
    "/api/customer-quotes",
    jsonRequest("POST", payload),
  );
  return result.customerQuote;
}

export async function fetchCustomerQuote(id: string, signal?: AbortSignal) {
  const result = await requestJson<{ customerQuote: CustomerQuoteDetailRecord }>(
    `/api/customer-quotes/${encodeURIComponent(id)}`,
    { signal, cache: "no-store" },
  );
  return result.customerQuote;
}

export async function patchCustomerQuote(id: string, payload: CustomerQuoteUpdatePayload) {
  const result = await requestJson<{ customerQuote: CustomerQuoteDetailRecord }>(
    `/api/customer-quotes/${encodeURIComponent(id)}`,
    jsonRequest("PATCH", payload),
  );
  return result.customerQuote;
}

export async function patchCustomerQuoteStatus(id: string, payload: CustomerQuoteStatusPayload) {
  const result = await requestJson<{ customerQuote: CustomerQuoteDetailRecord }>(
    `/api/customer-quotes/${encodeURIComponent(id)}/status`,
    jsonRequest("PATCH", payload),
  );
  return result.customerQuote;
}
