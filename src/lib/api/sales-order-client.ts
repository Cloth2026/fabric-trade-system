import type {
  SalesOrderCurrency,
  SalesOrderDeliveryStatus,
  SalesOrderStatus,
} from "@/server/sales-orders/constants";
import type { SalesOrderItemDelivery } from "@/lib/sales-order-math";

export type OrderFabricBrief = {
  id: string;
  code: string;
  name: string;
  englishName: string | null;
  fabricType: string | null;
  pricingUnit: string | null;
  composition: string | null;
};

export type OrderCustomerBrief = {
  id: string;
  name: string;
  status: string;
  city: string | null;
};

export type OrderContactBrief = {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
};

export type OrderSupplierBrief = { id: string; name: string } | null;

export type OrderFabricSupplierBrief = {
  id: string;
  supplier: OrderSupplierBrief;
  supplierUnit: { id: string; name: string } | null;
  supplierFabricCode: string | null;
  isPreferred: boolean;
} | null;

export type OrderPurchaseQuoteBrief = {
  id: string;
  purchasePrice: string;
  currency: string;
  pricingUnit: string;
  minimumOrderQty: string | null;
  leadTime: string | null;
  fabricSupplierId: string;
} | null;

export type OrderSourceQuoteBrief = {
  id: string;
  code: string;
  quoteDate: string;
  validUntil: string | null;
  status: string;
} | null;

// Derived figures come from src/lib/sales-order-math.ts on both sides, so the
// form preview and the stored order can never disagree.
export type OrderItemAmounts = {
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

export type OrderTotals = {
  currency: string;
  exchangeRate: number;
  netAmount: number;
  taxAmount: number;
  taxInclusiveAmount: number;
  costCny: number | null;
  marginCny: number | null;
  marginRate: number | null;
  linesWithoutQuantity: number;
  linesWithoutCost: number;
};

export type OrderDelivery = {
  deliveryStatus: SalesOrderDeliveryStatus;
  deliveredLines: number;
  partialLines: number;
  pendingLines: number;
  totalLines: number;
};

export type SalesOrderLineRecord = {
  id: string;
  quantity: string | null;
  deliveredQuantity: string;
};

export type SalesOrderItemRecord = {
  id: string;
  orderId: string;
  fabricId: string;
  sourceQuoteItemId: string | null;
  fabricSupplierId: string | null;
  fabricSupplierQuoteId: string | null;
  unit: string | null;
  quantity: string | null;
  deliveredQuantity: string;
  unitPrice: string;
  costPrice: string | null;
  taxRate: string | null;
  leadTime: string | null;
  colorOrRemark: string | null;
  remark: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  fabric: OrderFabricBrief;
  fabricSupplier: OrderFabricSupplierBrief;
  fabricSupplierQuote: OrderPurchaseQuoteBrief;
  amounts: OrderItemAmounts & { delivery: SalesOrderItemDelivery };
};

export type SalesOrderRecord = {
  id: string;
  code: string;
  customerId: string;
  contactId: string | null;
  sourceQuoteId: string | null;
  status: SalesOrderStatus;
  orderDate: string;
  requestedDeliveryDate: string | null;
  currency: SalesOrderCurrency;
  exchangeRate: string;
  priceTerms: string | null;
  deliveryTerms: string | null;
  paymentTerms: string | null;
  taxRate: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  receiverAddress: string | null;
  remark: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomerBrief;
  contact: OrderContactBrief | null;
  sourceQuote: OrderSourceQuoteBrief;
  items: SalesOrderLineRecord[];
  delivery: OrderDelivery;
  isOverdue: boolean;
  overdueDays: number;
  _count: { items: number };
};

export type SalesOrderDetailRecord = Omit<SalesOrderRecord, "items" | "_count"> & {
  items: SalesOrderItemRecord[];
  totals: OrderTotals;
};

export type SalesOrderItemInput = {
  id?: string | null;
  sourceQuoteItemId?: string | null;
  fabricId: string;
  fabricSupplierId?: string | null;
  fabricSupplierQuoteId?: string | null;
  quantity: string;
  unitPrice: string;
  costPrice?: string | null;
  taxRate?: string | null;
  leadTime?: string | null;
  colorOrRemark?: string | null;
  remark?: string | null;
};

export type SalesOrderPayload = {
  customerId: string;
  contactId?: string | null;
  currency?: SalesOrderCurrency;
  exchangeRate?: string | null;
  orderDate?: string | null;
  requestedDeliveryDate?: string | null;
  priceTerms?: string | null;
  deliveryTerms?: string | null;
  paymentTerms?: string | null;
  taxRate?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverAddress?: string | null;
  remark?: string | null;
  items: SalesOrderItemInput[];
};

export type SalesOrderUpdatePayload = Partial<SalesOrderPayload>;

export type SalesOrderStatusPayload = {
  status: SalesOrderStatus;
  cancelReason?: string | null;
};

export type SalesOrderDeliveryPayload = {
  items: Array<{ id: string; deliveredQuantity: string }>;
};

export class SalesOrderApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "SalesOrderApiError";
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as { error?: string; details?: unknown } & T;

  if (!response.ok) {
    throw new SalesOrderApiError(response.status, body.error ?? "请求失败，请稍后重试", body.details);
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

export function getOrderFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof SalesOrderApiError)) return {};
  const details = error.details as { properties?: Record<string, { errors?: string[] }> } | undefined;
  const properties = details?.properties ?? {};

  return Object.fromEntries(
    Object.entries(properties)
      .filter((entry): entry is [string, { errors: string[] }] => Boolean(entry[1].errors?.[0]))
      .map(([field, value]) => [field, value.errors[0]]),
  );
}

export function getOrderErrorMessage(error: unknown, fallback: string) {
  if (error instanceof SalesOrderApiError) {
    if (error.status === 404) return "订单不存在或无权访问";
    if (error.status === 409) return "数据冲突，请刷新后重试";
    if (error.status === 400) return "请检查填写内容，修正标记字段后再保存";
  }
  return error instanceof Error ? error.message : fallback;
}

// Booking a delivery has only a few ways to fail and all of them are the
// user's to fix, so the server reason is translated instead of collapsed into
// the generic "check your input" message.
const deliveryErrorMessages: Record<string, string> = {
  "Delivered quantity cannot exceed the ordered quantity.": "已交付数量不能大于订单数量",
  "Fill in the line quantity before booking a delivery.": "请先补全该行的订单数量，再登记交付",
  "Deliveries can only be booked while the order is being prepared.": "只有备货中与已发货的订单可以登记交付",
  "One or more order lines were not found.": "订单明细已变化，请刷新后重试",
};

export function getDeliveryErrorMessage(error: unknown, fallback: string) {
  if (error instanceof SalesOrderApiError && deliveryErrorMessages[error.message]) {
    return deliveryErrorMessages[error.message];
  }
  return getOrderErrorMessage(error, fallback);
}

export async function fetchSalesOrders(
  filters: {
    q?: string;
    status?: SalesOrderStatus | "all";
    customerId?: string;
    fabricId?: string;
    deliveryStatus?: SalesOrderDeliveryStatus | "all";
    from?: string;
    to?: string;
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.fabricId) params.set("fabricId", filters.fabricId);
  if (filters.deliveryStatus && filters.deliveryStatus !== "all") {
    params.set("deliveryStatus", filters.deliveryStatus);
  }
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("limit", String(filters.limit ?? 50));

  const result = await requestJson<{ salesOrders: SalesOrderRecord[] }>(
    `/api/sales-orders?${params}`,
    { signal, cache: "no-store" },
  );
  return result.salesOrders;
}

export async function createSalesOrder(payload: SalesOrderPayload) {
  const result = await requestJson<{ salesOrder: SalesOrderDetailRecord }>(
    "/api/sales-orders",
    jsonRequest("POST", payload),
  );
  return result.salesOrder;
}

export async function createSalesOrderFromQuote(quoteId: string) {
  const result = await requestJson<{ salesOrder: SalesOrderDetailRecord }>(
    "/api/sales-orders/from-quote",
    jsonRequest("POST", { quoteId }),
  );
  return result.salesOrder;
}

export async function fetchSalesOrder(id: string, signal?: AbortSignal) {
  const result = await requestJson<{ salesOrder: SalesOrderDetailRecord }>(
    `/api/sales-orders/${encodeURIComponent(id)}`,
    { signal, cache: "no-store" },
  );
  return result.salesOrder;
}

export async function patchSalesOrder(id: string, payload: SalesOrderUpdatePayload) {
  const result = await requestJson<{ salesOrder: SalesOrderDetailRecord }>(
    `/api/sales-orders/${encodeURIComponent(id)}`,
    jsonRequest("PATCH", payload),
  );
  return result.salesOrder;
}

export async function patchSalesOrderStatus(id: string, payload: SalesOrderStatusPayload) {
  const result = await requestJson<{ salesOrder: SalesOrderDetailRecord }>(
    `/api/sales-orders/${encodeURIComponent(id)}/status`,
    jsonRequest("PATCH", payload),
  );
  return result.salesOrder;
}

export async function patchSalesOrderDelivery(id: string, payload: SalesOrderDeliveryPayload) {
  const result = await requestJson<{ salesOrder: SalesOrderDetailRecord }>(
    `/api/sales-orders/${encodeURIComponent(id)}/delivery`,
    jsonRequest("PATCH", payload),
  );
  return result.salesOrder;
}
