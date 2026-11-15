/**
 * Pure formatter for Indian phone numbers:
 * - Empty string remains empty ("").
 * - Digits format into "+91 XXXXX" or "+91 XXXXX XXXXX".
 * - When user backspaces down into the prefix (+91, +9, +), clears to empty.
 */
export function formatIndianPhone(raw: string): string {
  if (!raw) return "";

  // If user erased everything down to prefix characters, clear completely to allow leaving blank
  if (raw === "+" || raw === "+9" || raw === "+91" || raw === "+91 " || raw === "0") {
    return "";
  }

  let digits = "";

  if (raw.startsWith("+91")) {
    const after = raw.slice(3);
    const remainderDigits = after.replace(/\D/g, "");
    if (remainderDigits.length === 0) {
      return "";
    }
    digits = remainderDigits;
  } else {
    const allDigits = raw.replace(/\D/g, "");
    if (allDigits.length > 10 && allDigits.startsWith("91")) {
      digits = allDigits.slice(2);
    } else if (allDigits.length > 10 && allDigits.startsWith("0")) {
      digits = allDigits.slice(1);
    } else {
      digits = allDigits;
    }
  }

  // Cap at 10 digits
  digits = digits.slice(0, 10);
  if (digits.length === 0) return "";

  if (digits.length <= 5) {
    return `+91 ${digits}`;
  }
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
