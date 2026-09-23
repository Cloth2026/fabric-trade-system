export const salesOrderStatuses = [
  "draft",
  "confirmed",
  "producing",
  "shipped",
  "completed",
  "cancelled",
] as const;
export type SalesOrderStatus = (typeof salesOrderStatuses)[number];

// An order in one of these states has left the pipeline: no further edits,
// delivery bookings or transitions.
export const salesOrderTerminalStatuses = ["completed", "cancelled"] as const;

// Unlike quotes, an order stays editable after it is confirmed: in textiles
// the customer changes quantities before production actually starts.
export const salesOrderEditableStatuses = ["draft", "confirmed"] as const;

// Booking deliveries is allowed once the goods are being prepared, until the
// order is closed.
export const salesOrderDeliverableStatuses = ["producing", "shipped"] as const;

export const salesOrderStatusLabels: Record<SalesOrderStatus, string> = {
  draft: "草稿",
  confirmed: "已确认",
  producing: "备货中",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
};

export const salesOrderStatusOptions = salesOrderStatuses.map((value) => ({
  value,
  label: salesOrderStatusLabels[value],
}));

export function isSalesOrderTerminal(status: string) {
  return (salesOrderTerminalStatuses as readonly string[]).includes(status);
}

export function canEditSalesOrder(status: string) {
  return (salesOrderEditableStatuses as readonly string[]).includes(status);
}

export function canBookSalesOrderDelivery(status: string) {
  return (salesOrderDeliverableStatuses as readonly string[]).includes(status);
}

export const salesOrderTransitions: Record<SalesOrderStatus, readonly SalesOrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["producing", "cancelled"],
  producing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

export const salesOrderCurrencies = ["CNY", "USD"] as const;
export type SalesOrderCurrency = (typeof salesOrderCurrencies)[number];

export const salesOrderCurrencyLabels: Record<SalesOrderCurrency, string> = {
  CNY: "人民币 CNY",
  USD: "美元 USD",
};

export const salesOrderCurrencyOptions = salesOrderCurrencies.map((value) => ({
  value,
  label: salesOrderCurrencyLabels[value],
}));

export const CNY_CURRENCY: SalesOrderCurrency = "CNY";

export const salesOrderDeliveryStatuses = ["none", "partial", "done"] as const;
export type SalesOrderDeliveryStatus = (typeof salesOrderDeliveryStatuses)[number];

export const salesOrderDeliveryStatusLabels: Record<SalesOrderDeliveryStatus, string> = {
  none: "未交付",
  partial: "部分交付",
  done: "已交付",
};

export const salesOrderDeliveryStatusOptions = salesOrderDeliveryStatuses.map((value) => ({
  value,
  label: salesOrderDeliveryStatusLabels[value],
}));

export const OPERATION_LOG_MODULE = "sales_order";
