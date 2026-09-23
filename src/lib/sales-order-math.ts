// Derived sales-order figures. Sales orders reuse the quote arithmetic on
// purpose (see docs/DESIGN_SALES_ORDER.md §4.3): amounts in the order
// currency, cost and margin always in CNY. What is added here is delivery
// progress, which only exists on orders.

import { startOfBusinessDay } from "./business-date";
import {
  computeQuoteItemAmounts,
  computeQuoteTotals,
  type QuoteAmountContext,
  type QuoteItemAmounts,
} from "./customer-quote-math";
import type { SalesOrderDeliveryStatus } from "../server/sales-orders/constants";

type NumericLike = Parameters<typeof computeQuoteItemAmounts>[0]["unitPrice"];

export type LineDeliveryStatus = "pending" | "partial" | "done";

export type SalesOrderItemDelivery = {
  quantity: number | null;
  deliveredQuantity: number;
  remainingQuantity: number | null;
  progress: number | null;
  status: LineDeliveryStatus;
};

export type SalesOrderItemFigures = QuoteItemAmounts & { delivery: SalesOrderItemDelivery };

export type SalesOrderDelivery = {
  deliveryStatus: SalesOrderDeliveryStatus;
  deliveredLines: number;
  partialLines: number;
  pendingLines: number;
  totalLines: number;
};

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toNumber(value: NumericLike): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function computeLineDelivery(
  quantity: NumericLike,
  deliveredQuantity: NumericLike,
): SalesOrderItemDelivery {
  const quantityValue = toNumber(quantity);
  const delivered = toNumber(deliveredQuantity) ?? 0;
  // A line copied from a quote may still have no quantity. It cannot be part
  // of delivery progress until it gets one, but a booking already made is kept.
  const remaining = quantityValue === null ? null : round(quantityValue - delivered, 3);

  let status: LineDeliveryStatus = "pending";
  if (remaining !== null) {
    if (remaining <= 0) status = "done";
    else if (delivered > 0) status = "partial";
  }

  return {
    quantity: quantityValue,
    deliveredQuantity: delivered,
    remainingQuantity: remaining,
    progress:
      quantityValue === null || quantityValue <= 0
        ? null
        : round(Math.min(delivered, quantityValue) / quantityValue, 4),
    status,
  };
}

export function computeSalesOrderItemFigures(
  item: {
    quantity?: NumericLike;
    unitPrice: NumericLike;
    costPrice?: NumericLike;
    taxRate?: NumericLike;
    deliveredQuantity?: NumericLike;
  },
  context: QuoteAmountContext,
): SalesOrderItemFigures {
  const amounts = computeQuoteItemAmounts(item, context);
  return {
    ...amounts,
    delivery: computeLineDelivery(item.quantity ?? null, item.deliveredQuantity ?? 0),
  };
}

export function computeSalesOrderDelivery(
  figures: ReadonlyArray<{ delivery: SalesOrderItemDelivery }>,
): SalesOrderDelivery {
  const totalLines = figures.length;
  const deliveredLines = figures.filter((figure) => figure.delivery.status === "done").length;
  const partialLines = figures.filter((figure) => figure.delivery.status === "partial").length;
  const pendingLines = totalLines - deliveredLines - partialLines;

  let deliveryStatus: SalesOrderDeliveryStatus = "none";
  if (totalLines > 0 && deliveredLines === totalLines) deliveryStatus = "done";
  else if (deliveredLines > 0 || partialLines > 0) deliveryStatus = "partial";

  return { deliveryStatus, deliveredLines, partialLines, pendingLines, totalLines };
}

export function computeSalesOrderTotals(
  figures: readonly SalesOrderItemFigures[],
  context: QuoteAmountContext,
) {
  return computeQuoteTotals(figures, context);
}

// Late delivery is reported, never persisted: time alone must not rewrite an
// order, and the GIVEN date is the customer's requirement rather than a
// promise we automatically broke.
export function deriveDeliveryOverdue(
  requestedDeliveryDate: Date | null | undefined,
  options: { isClosed: boolean; deliveryStatus: SalesOrderDeliveryStatus },
  now = new Date(),
) {
  if (!requestedDeliveryDate || options.isClosed || options.deliveryStatus === "done") {
    return { isOverdue: false, overdueDays: 0 };
  }

  const today = startOfBusinessDay(now);
  const dueDay = startOfBusinessDay(requestedDeliveryDate);
  if (dueDay >= today) return { isOverdue: false, overdueDays: 0 };

  return {
    isOverdue: true,
    overdueDays: Math.round((today.getTime() - dueDay.getTime()) / 86_400_000),
  };
}
