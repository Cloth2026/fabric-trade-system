// Form state, client validation and payload mapping for sales orders.
// The arithmetic helpers are imported from the quote module on purpose: both
// documents must display money exactly the same way.

import type {
  SalesOrderDetailRecord,
  SalesOrderItemInput,
  SalesOrderPayload,
  SalesOrderRecord,
  SalesOrderUpdatePayload,
} from "@/lib/api/sales-order-client";
import {
  isoDateToInputValue,
  percentToRate,
  rateToPercent,
  todayInputValue,
} from "@/components/quotes/customer-quote-prototype-data";
import type { SalesOrderStatus } from "@/server/sales-orders/constants";
import {
  salesOrderDeliveryStatusLabels,
  salesOrderStatusLabels,
  salesOrderTransitions,
} from "@/server/sales-orders/constants";

export type OrderItemDraft = {
  key: string;
  // Set when the line already exists, so an edit keeps the same row identity
  // and any delivery already booked against it.
  id: string;
  sourceQuoteItemId: string;
  fabricId: string;
  fabricCode: string;
  fabricName: string;
  fabricUnit: string;
  fabricSupplierId: string;
  fabricSupplierLabel: string;
  fabricSupplierQuoteId: string;
  purchaseQuoteLabel: string;
  quantity: string;
  unitPrice: string;
  costPrice: string;
  taxRate: string;
  leadTime: string;
  colorOrRemark: string;
  remark: string;
};

export type OrderFormState = {
  customerId: string;
  customerName: string;
  contactId: string;
  contactName: string;
  currency: "CNY" | "USD";
  exchangeRate: string;
  orderDate: string;
  requestedDeliveryDate: string;
  priceTerms: string;
  deliveryTerms: string;
  paymentTerms: string;
  taxRate: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  remark: string;
  items: OrderItemDraft[];
};

let draftKeySeed = 0;
const nextKey = () => {
  draftKeySeed += 1;
  return `order-item-${draftKeySeed}`;
};

export function createEmptyOrderItem(): OrderItemDraft {
  return {
    key: nextKey(),
    id: "",
    sourceQuoteItemId: "",
    fabricId: "",
    fabricCode: "",
    fabricName: "",
    fabricUnit: "",
    fabricSupplierId: "",
    fabricSupplierLabel: "",
    fabricSupplierQuoteId: "",
    purchaseQuoteLabel: "",
    quantity: "",
    unitPrice: "",
    costPrice: "",
    taxRate: "",
    leadTime: "",
    colorOrRemark: "",
    remark: "",
  };
}

export function createEmptyOrderFormState(): OrderFormState {
  return {
    customerId: "",
    customerName: "",
    contactId: "",
    contactName: "",
    currency: "CNY",
    exchangeRate: "1",
    orderDate: todayInputValue(),
    requestedDeliveryDate: "",
    priceTerms: "",
    deliveryTerms: "",
    paymentTerms: "",
    taxRate: "13",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    remark: "",
    items: [createEmptyOrderItem()],
  };
}

export function orderFormStateFromRecord(record: SalesOrderDetailRecord): OrderFormState {
  return {
    customerId: record.customerId,
    customerName: record.customer.name,
    contactId: record.contactId ?? "",
    contactName: record.contact?.name ?? "",
    currency: record.currency,
    exchangeRate: record.exchangeRate,
    orderDate: isoDateToInputValue(record.orderDate),
    requestedDeliveryDate: isoDateToInputValue(record.requestedDeliveryDate),
    priceTerms: record.priceTerms ?? "",
    deliveryTerms: record.deliveryTerms ?? "",
    paymentTerms: record.paymentTerms ?? "",
    taxRate: rateToPercent(record.taxRate),
    receiverName: record.receiverName ?? "",
    receiverPhone: record.receiverPhone ?? "",
    receiverAddress: record.receiverAddress ?? "",
    remark: record.remark ?? "",
    items:
      record.items.length > 0
        ? record.items.map((item) => ({
            key: nextKey(),
            id: item.id,
            sourceQuoteItemId: item.sourceQuoteItemId ?? "",
            fabricId: item.fabricId,
            fabricCode: item.fabric.code,
            fabricName: item.fabric.name,
            fabricUnit: item.unit ?? "",
            fabricSupplierId: item.fabricSupplierId ?? "",
            fabricSupplierLabel: item.fabricSupplier
              ? item.fabricSupplier.supplier?.name ?? "未命名货源"
              : "",
            fabricSupplierQuoteId: item.fabricSupplierQuoteId ?? "",
            purchaseQuoteLabel: item.fabricSupplierQuote
              ? `${item.fabricSupplierQuote.purchasePrice} ${item.fabricSupplierQuote.currency}/${item.fabricSupplierQuote.pricingUnit}`
              : "",
            quantity: item.quantity ?? "",
            unitPrice: item.unitPrice,
            costPrice: item.costPrice ?? "",
            taxRate: rateToPercent(item.taxRate),
            leadTime: item.leadTime ?? "",
            colorOrRemark: item.colorOrRemark ?? "",
            remark: item.remark ?? "",
          }))
        : [createEmptyOrderItem()],
  };
}

export type OrderFormErrors = Partial<
  Record<"customerId" | "exchangeRate" | "taxRate" | "items" | "orderDate" | "requestedDeliveryDate", string>
> & {
  itemErrors?: Record<string, string>;
};

function isPositiveNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric > 0;
}

export function validateOrderForm(state: OrderFormState): OrderFormErrors {
  const errors: OrderFormErrors = {};
  if (!state.customerId.trim()) errors.customerId = "请选择下单客户";

  if (state.currency !== "CNY") {
    const rate = Number(state.exchangeRate);
    if (!state.exchangeRate.trim() || !Number.isFinite(rate) || rate <= 0) {
      errors.exchangeRate = "非人民币订单必须填写汇率";
    }
  }

  const tax = state.taxRate.trim();
  if (tax !== "") {
    const numeric = Number(tax);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
      errors.taxRate = "税率需在 0 到 100 之间";
    }
  }

  const pricedItems = state.items.filter((item) => item.fabricId.trim());
  if (pricedItems.length === 0) errors.items = "至少要有 1 行订单明细";

  const itemErrors: Record<string, string> = {};
  state.items.forEach((item) => {
    if (!item.fabricId.trim()) {
      itemErrors[item.key] = "请选择面料";
      return;
    }
    // Orders commit to a quantity, unlike quotes which may price a unit only.
    if (isPositiveNumber(item.quantity) !== true) {
      itemErrors[item.key] = "数量必须填写且大于 0";
      return;
    }
    if (!item.unitPrice.trim() || isPositiveNumber(item.unitPrice) !== true) {
      itemErrors[item.key] = "单价必须是大于 0 的数字";
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

function itemToInput(item: OrderItemDraft): SalesOrderItemInput {
  return {
    ...(item.id ? { id: item.id } : {}),
    ...(item.sourceQuoteItemId ? { sourceQuoteItemId: item.sourceQuoteItemId } : {}),
    fabricId: item.fabricId.trim(),
    fabricSupplierId: item.fabricSupplierId.trim() || null,
    fabricSupplierQuoteId: item.fabricSupplierQuoteId.trim() || null,
    quantity: item.quantity.trim(),
    unitPrice: item.unitPrice.trim(),
    costPrice: orNull(item.costPrice),
    taxRate: percentToRate(item.taxRate),
    leadTime: orNull(item.leadTime),
    colorOrRemark: orNull(item.colorOrRemark),
    remark: orNull(item.remark),
  };
}

const dateOrNull = (value: string) => (value ? new Date(`${value}T00:00:00`).toISOString() : null);

export function orderFormToPayload(state: OrderFormState): SalesOrderPayload {
  return {
    customerId: state.customerId.trim(),
    contactId: orNull(state.contactId),
    currency: state.currency,
    exchangeRate: state.currency === "CNY" ? "1" : orNull(state.exchangeRate),
    orderDate: dateOrNull(state.orderDate),
    requestedDeliveryDate: dateOrNull(state.requestedDeliveryDate),
    priceTerms: orNull(state.priceTerms),
    deliveryTerms: orNull(state.deliveryTerms),
    paymentTerms: orNull(state.paymentTerms),
    taxRate: percentToRate(state.taxRate),
    receiverName: orNull(state.receiverName),
    receiverPhone: orNull(state.receiverPhone),
    receiverAddress: orNull(state.receiverAddress),
    remark: orNull(state.remark),
    items: state.items.filter((item) => item.fabricId.trim()).map(itemToInput),
  };
}

export function orderFormToUpdatePayload(state: OrderFormState): SalesOrderUpdatePayload {
  return orderFormToPayload(state);
}

export const orderStatusTones: Record<SalesOrderStatus, string> = {
  draft: "bg-stone-200/76 text-stone-700",
  confirmed: "bg-blue-50/82 text-blue-800",
  producing: "bg-violet-50/82 text-violet-800",
  shipped: "bg-cyan-50/82 text-cyan-800",
  completed: "bg-emerald-50/82 text-emerald-800",
  cancelled: "bg-rose-50/82 text-rose-800",
};

export const orderDeliveryTones: Record<string, string> = {
  none: "bg-stone-200/76 text-stone-700",
  partial: "bg-amber-50/82 text-amber-800",
  done: "bg-emerald-50/82 text-emerald-800",
};

export function orderStatusLabel(status: string) {
  return salesOrderStatusLabels[status as SalesOrderStatus] ?? status;
}

export function orderDeliveryLabel(status: string) {
  return salesOrderDeliveryStatusLabels[status as keyof typeof salesOrderDeliveryStatusLabels] ?? status;
}

export function orderTransitions(status: SalesOrderStatus) {
  return salesOrderTransitions[status] ?? [];
}

export function countOrderLines(order: Pick<SalesOrderRecord, "_count">) {
  return order._count.items;
}
