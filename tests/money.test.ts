import { describe, it, expect } from "vitest";
import {
  formatMoney,
  balanceMeta,
  decimalStringToPaise,
  paiseToDecimalString,
} from "@/lib/money";

describe("decimalStringToPaise (zero float drift parsing)", () => {
  it("converts whole rupee strings to exact paise", () => {
    expect(decimalStringToPaise("100")).toBe(10000);
    expect(decimalStringToPaise("0")).toBe(0);
  });

  it("converts 1-digit and 2-digit decimal paise without binary float inaccuracy", () => {
    expect(decimalStringToPaise("19.99")).toBe(1999);
    expect(decimalStringToPaise("100.5")).toBe(10050);
    expect(decimalStringToPaise("100.50")).toBe(10050);
    expect(decimalStringToPaise("100.05")).toBe(10005);
    expect(decimalStringToPaise("0.01")).toBe(1);
    expect(decimalStringToPaise("9999999.99")).toBe(999999999);
  });
});

describe("paiseToDecimalString (zero float drift serialization)", () => {
  it("formats exact integers into 2-decimal rupee strings", () => {
    expect(paiseToDecimalString(10000)).toBe("100.00");
    expect(paiseToDecimalString(10050)).toBe("100.50");
    expect(paiseToDecimalString(10005)).toBe("100.05");
    expect(paiseToDecimalString(1)).toBe("0.01");
    expect(paiseToDecimalString(0)).toBe("0.00");
  });

  it("handles negative amounts accurately", () => {
    expect(paiseToDecimalString(-500)).toBe("-5.00");
    expect(paiseToDecimalString(-5)).toBe("-0.05");
    expect(paiseToDecimalString(-10050)).toBe("-100.50");
  });
});

describe("formatMoney", () => {
  it("formats standard amounts in Indian numbering system", () => {
    const formatted = formatMoney(1250.5);
    // Should format as ₹1,250.50 with currency symbol and 2 decimal places
    expect(formatted).toMatch(/1,250\.50/);
  });

  it("formats integers with 2 decimal places in currency mode", () => {
    const formatted = formatMoney("1000");
    expect(formatted).toMatch(/1,000\.00/);
  });

  it("formats zero", () => {
    const formatted = formatMoney(0);
    expect(formatted).toMatch(/0\.00/);
  });

  it("handles negative amounts cleanly", () => {
    const formatted = formatMoney(-500.25);
    expect(formatted).toMatch(/-.*500\.25/);
  });

  it("falls back to 0 for invalid inputs", () => {
    expect(formatMoney("invalid")).toMatch(/0\.00/);
    expect(formatMoney(NaN)).toMatch(/0\.00/);
  });
});

describe("balanceMeta", () => {
  it("marks positive balances as owes you (debit)", () => {
    const meta = balanceMeta("500.50");
    expect(meta.label).toBe("owes you");
    expect(meta.className).toContain("text-debit");
  });

  it("marks negative balances as you owe (credit)", () => {
    const meta = balanceMeta("-200");
    expect(meta.label).toBe("you owe");
    expect(meta.className).toContain("text-credit");
  });

  it("marks zero balance as settled", () => {
    const meta = balanceMeta("0");
    expect(meta.label).toBe("settled");
    expect(meta.className).toContain("text-muted");
  });

  it("marks non-finite inputs as settled", () => {
    const meta = balanceMeta("NaN");
    expect(meta.label).toBe("settled");
  });
});
