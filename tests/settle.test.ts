import { describe, it, expect } from "vitest";
import { calculateSettleSplits } from "@/lib/money";

describe("calculateSettleSplits", () => {
  it("computes 100% and 50% for standard positive balance", () => {
    const res = calculateSettleSplits("100.00");
    expect(res.absPaise).toBe(10000);
    expect(res.fullAmount).toBe("100.00");
    expect(res.halfPaise).toBe(5000);
    expect(res.halfAmount).toBe("50.00");
  });

  it("handles odd paise accurately without fractional float drift", () => {
    // ₹100.01 = 10001 paise. Half = Math.floor(10001/2) = 5000 paise = ₹50.00
    const res = calculateSettleSplits("100.01");
    expect(res.absPaise).toBe(10001);
    expect(res.fullAmount).toBe("100.01");
    expect(res.halfPaise).toBe(5000);
    expect(res.halfAmount).toBe("50.00");
  });

  it("handles negative balances by taking absolute value", () => {
    const res = calculateSettleSplits("-250.50");
    expect(res.absPaise).toBe(25050);
    expect(res.fullAmount).toBe("250.50");
    expect(res.halfPaise).toBe(12525);
    expect(res.halfAmount).toBe("125.25");
  });

  it("handles tiny 1 paise balance", () => {
    const res = calculateSettleSplits("0.01");
    expect(res.absPaise).toBe(1);
    expect(res.fullAmount).toBe("0.01");
    expect(res.halfPaise).toBe(0);
    expect(res.halfAmount).toBe("0.00");
  });

  it("handles zero balance", () => {
    const res = calculateSettleSplits("0");
    expect(res.absPaise).toBe(0);
    expect(res.fullAmount).toBe("0.00");
    expect(res.halfPaise).toBe(0);
    expect(res.halfAmount).toBe("0.00");
  });

  it("accepts numeric inputs as well", () => {
    const res = calculateSettleSplits(150.5);
    expect(res.absPaise).toBe(15050);
    expect(res.fullAmount).toBe("150.50");
    expect(res.halfPaise).toBe(7525);
    expect(res.halfAmount).toBe("75.25");
  });
});
