// Derived quote figures. Shared by the API (so clients never have to guess)
// and by the UI (so the form can preview amounts while typing).
//
// Rules agreed in docs/DESIGN_CUSTOMER_QUOTE.md §4.3:
// - amounts are shown in the quote currency
// - cost is always CNY, so margins are converted to CNY via exchangeRate
// - a line without a quantity quotes a unit price only and has no amount

export type NumericLike = number | string | null | undefined | { toString(): string };

function toNumber(value: NumericLike): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export type QuoteAmountContext = {
  currency: string;
  exchangeRate?: NumericLike;
  taxRate?: NumericLike;
};

export type QuoteItemAmountInput = {
  quantity?: NumericLike;
  unitPrice: NumericLike;
  costPrice?: NumericLike;
  taxRate?: NumericLike;
};

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

export function computeQuoteItemAmounts(
  item: QuoteItemAmountInput,
  context: QuoteAmountContext,
): QuoteItemAmounts {
  const rate = toNumber(context.exchangeRate) ?? 1;
  const taxRate = toNumber(item.taxRate) ?? toNumber(context.taxRate) ?? 0;
  const unitPrice = toNumber(item.unitPrice) ?? 0;
  const quantity = toNumber(item.quantity);
  const costCny = toNumber(item.costPrice);

  const taxInclusiveUnitPrice = round(unitPrice * (1 + taxRate), 2);
  const netAmount = quantity === null ? null : round(quantity * unitPrice, 2);
  const taxInclusiveAmount = netAmount === null ? null : round(netAmount * (1 + taxRate), 2);
  const unitPriceCny = round(unitPrice * rate, 2);
  const unitMarginCny = costCny === null ? null : round(unitPriceCny - costCny, 2);
  const marginCny =
    unitMarginCny === null || quantity === null ? null : round(unitMarginCny * quantity, 2);

  return {
    taxRate,
    unitPrice,
    quantity,
    taxInclusiveUnitPrice,
    netAmount,
    taxAmount: netAmount === null ? null : round(netAmount * taxRate, 2),
    taxInclusiveAmount,
    unitPriceCny,
    unitCostCny: costCny === null ? null : round(costCny, 2),
    unitMarginCny,
    marginCny,
    marginRate:
      unitMarginCny === null || unitPriceCny <= 0 ? null : round(unitMarginCny / unitPriceCny, 4),
  };
}

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

export function computeQuoteTotals(
  items: readonly QuoteItemAmounts[],
  context: QuoteAmountContext,
): QuoteTotals {
  const rate = toNumber(context.exchangeRate) ?? 1;
  let netAmount = 0;
  let taxAmount = 0;
  let taxInclusiveAmount = 0;
  let marginCny = 0;
  let linesWithoutQuantity = 0;

  for (const item of items) {
    if (item.netAmount === null) {
      linesWithoutQuantity += 1;
    } else {
      netAmount += item.netAmount;
      taxAmount += item.taxAmount ?? 0;
      taxInclusiveAmount += item.taxInclusiveAmount ?? 0;
      marginCny += item.marginCny ?? 0;
    }
  }

  return {
    currency: context.currency,
    exchangeRate: rate,
    netAmount: round(netAmount, 2),
    taxAmount: round(taxAmount, 2),
    taxInclusiveAmount: round(taxInclusiveAmount, 2),
    costCny: round(netAmount * rate - marginCny, 2),
    marginCny: round(marginCny, 2),
    marginRate: netAmount <= 0 ? null : round(marginCny / (netAmount * rate), 4),
    linesWithoutQuantity,
  };
}
