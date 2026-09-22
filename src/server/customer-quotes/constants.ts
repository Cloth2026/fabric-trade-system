export const customerQuoteStatuses = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export type CustomerQuoteStatus = (typeof customerQuoteStatuses)[number];

// Once a quote reaches one of these it leaves the pipeline: nothing else may
// be edited or transitioned again.
export const customerQuoteTerminalStatuses = ["accepted", "rejected", "expired"] as const;

export const customerQuoteStatusLabels: Record<CustomerQuoteStatus, string> = {
  draft: "草稿",
  sent: "已发送",
  accepted: "客户已接受",
  rejected: "客户未接受",
  expired: "已过期",
};

export const customerQuoteStatusOptions = customerQuoteStatuses.map((value) => ({
  value,
  label: customerQuoteStatusLabels[value],
}));

export function isCustomerQuoteTerminal(status: string) {
  return (customerQuoteTerminalStatuses as readonly string[]).includes(status);
}

export const customerQuoteCurrencies = ["CNY", "USD"] as const;
export type CustomerQuoteCurrency = (typeof customerQuoteCurrencies)[number];

export const customerQuoteCurrencyLabels: Record<CustomerQuoteCurrency, string> = {
  CNY: "人民币 CNY",
  USD: "美元 USD",
};

export const customerQuoteCurrencyOptions = customerQuoteCurrencies.map((value) => ({
  value,
  label: customerQuoteCurrencyLabels[value],
}));

export const CNY_CURRENCY: CustomerQuoteCurrency = "CNY";

// Allowed transitions. `draft` and `sent` may be marked expired by hand;
// letting time alone flip the status would rewrite history the user did not
// ask for, so overdue quotes are only highlighted in the UI (see §5.1 of
// docs/DESIGN_CUSTOMER_QUOTE.md).
export const customerQuoteTransitions: Record<CustomerQuoteStatus, readonly CustomerQuoteStatus[]> = {
  draft: ["sent", "expired"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};
