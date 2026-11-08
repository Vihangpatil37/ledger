const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converts a validated decimal rupee string (e.g. "250", "250.50", "19.99")
 * into exact integer paise without binary floating-point drift.
 */
export function decimalStringToPaise(amount: string): number {
  const trimmed = amount.trim();
  if (!trimmed) return 0;
  const isNegative = trimmed.startsWith("-");
  const clean = isNegative ? trimmed.slice(1) : trimmed;
  const [rupees, paise = ""] = clean.split(".");
  const paisePadded = (paise + "00").slice(0, 2);
  const total = Number(rupees || 0) * 100 + Number(paisePadded);
  return isNegative ? -total : total;
}

/**
 * Formats exact integer paise into a canonical 2-decimal rupee string (e.g. 125050 -> "1250.50").
 */
export function paiseToDecimalString(paise: number): string {
  const rounded = Math.round(Number.isFinite(paise) ? paise : 0);
  const isNegative = rounded < 0;
  const abs = Math.abs(rounded);
  const rupees = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, "0");
  return `${isNegative ? "-" : ""}${rupees}.${cents}`;
}

/** Formats DB amounts ("1250.5" | 1250.5) as ₹1,250.50 */
export function formatMoney(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return inr.format(Number.isFinite(value) ? value : 0);
}

/**
 * Shared meaning of a person's balance (= GAVE total − RECEIVED total).
 * Positive → they have taken more money than they returned: "owes you".
 * Negative → they returned more money than they took: "you owe".
 */
export function balanceMeta(amount: string | number): {
  className: string;
  label: string;
} {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return { className: "text-muted", label: "settled" };
  }
  if (value > 0) return { className: "text-debit", label: "owes you" };
  if (value < 0) return { className: "text-credit", label: "you owe" };
  return { className: "text-muted", label: "settled" };
}
