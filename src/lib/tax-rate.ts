// Tax rates are shown to the user as a percentage (13 means 13%) but travel over
// the API and live in the database as a fraction (0.13). That is the convention
// CustomerQuote.taxRate already uses, so the two modules stay comparable.
// Every tax-exclusive / tax-inclusive pair is entered by hand: the app never
// derives one from the other.

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function taxRateToPercentInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const rate = Number(value);
  if (!Number.isFinite(rate)) {
    return "";
  }

  return String(round(rate * 100, 3));
}

export function percentInputToTaxRate(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const percent = Number(trimmed);
  if (!Number.isFinite(percent)) {
    return null;
  }

  return round(percent / 100, 6);
}

// Returns an error message when the raw percentage input is unusable.
export function validateTaxRatePercent(value: string): string | undefined {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  const percent = Number(trimmed);
  if (!Number.isFinite(percent)) {
    return "税点必须是数字";
  }

  if (percent < 0 || percent > 100) {
    return "税点必须在 0 到 100 之间";
  }

  return undefined;
}

export function formatTaxRatePercent(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const rate = Number(value);
  if (!Number.isFinite(rate)) {
    return "";
  }

  const percent = round(rate * 100, 3);
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}
