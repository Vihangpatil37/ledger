import { describe, expect, it } from "vitest";
import {
  cleanPrecision,
  evaluateExpression,
  formatResult,
  normalizeExpression,
} from "../src/lib/calculator";

describe("Calculator Engine", () => {
  describe("normalizeExpression", () => {
    it("converts Unicode operators × and ÷ to * and /", () => {
      expect(normalizeExpression("100 × 5 ÷ 2")).toBe("100*5/2");
    });

    it("strips whitespace", () => {
      expect(normalizeExpression("  150  +  300  ")).toBe("150+300");
    });
  });

  describe("evaluateExpression - Basic Operations", () => {
    it("performs simple addition", () => {
      const res = evaluateExpression("150 + 250");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(400);
      expect(res.formatted).toBe("400");
    });

    it("performs simple subtraction", () => {
      const res = evaluateExpression("500 - 175");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(325);
      expect(res.formatted).toBe("325");
    });

    it("performs multiplication using × or *", () => {
      const res1 = evaluateExpression("25 * 4");
      expect(res1.ok).toBe(true);
      expect(res1.result).toBe(100);

      const res2 = evaluateExpression("12 × 12");
      expect(res2.ok).toBe(true);
      expect(res2.result).toBe(144);
    });

    it("performs division using ÷ or /", () => {
      const res1 = evaluateExpression("1000 / 8");
      expect(res1.ok).toBe(true);
      expect(res1.result).toBe(125);

      const res2 = evaluateExpression("450 ÷ 3");
      expect(res2.ok).toBe(true);
      expect(res2.result).toBe(150);
    });
  });

  describe("evaluateExpression - Order of Operations (Precedence)", () => {
    it("evaluates multiplication before addition", () => {
      const res = evaluateExpression("10 + 20 * 3");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(70);
    });

    it("evaluates division before subtraction", () => {
      const res = evaluateExpression("100 - 40 / 4");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(90);
    });

    it("evaluates chained mixed operations correctly", () => {
      const res = evaluateExpression("50 + 10 * 5 - 20 / 4");
      expect(res.ok).toBe(true);
      // 50 + 50 - 5 = 95
      expect(res.result).toBe(95);
    });
  });

  describe("evaluateExpression - Decimal & Precision Handling", () => {
    it("accurately computes 0.1 + 0.2 without IEEE floating point drift", () => {
      const res = evaluateExpression("0.1 + 0.2");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(0.3);
      expect(res.formatted).toBe("0.3");
    });

    it("handles multiple decimal operations", () => {
      const res = evaluateExpression("12.50 + 7.25 + 0.25");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(20);
      expect(res.formatted).toBe("20");
    });

    it("preserves precise decimal results", () => {
      const res = evaluateExpression("10 / 4");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(2.5);
      expect(res.formatted).toBe("2.5");
    });
  });

  describe("evaluateExpression - Percentage Calculations", () => {
    it("calculates percentage markup/tax (A + B%)", () => {
      // 1000 + 18% GST = 1180
      const res = evaluateExpression("1000 + 18%");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(1180);
      expect(res.formatted).toBe("1180");
    });

    it("calculates percentage discount (A - B%)", () => {
      // 500 - 10% discount = 450
      const res = evaluateExpression("500 - 10%");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(450);
      expect(res.formatted).toBe("450");
    });

    it("calculates percentage of a number (A * B%)", () => {
      // 200 * 5% = 10
      const res = evaluateExpression("200 * 5%");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(10);
    });

    it("calculates standalone percentage", () => {
      const res = evaluateExpression("50%");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(0.5);
      expect(res.formatted).toBe("0.5");
    });
  });

  describe("evaluateExpression - Negative Numbers", () => {
    it("handles initial negative number", () => {
      const res = evaluateExpression("-50 + 150");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(100);
    });

    it("handles unary minus after operator", () => {
      const res = evaluateExpression("100 + -30");
      expect(res.ok).toBe(true);
      expect(res.result).toBe(70);
    });
  });

  describe("evaluateExpression - Error Handling", () => {
    it("handles division by zero gracefully", () => {
      const res = evaluateExpression("500 / 0");
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Cannot divide by zero");
    });

    it("rejects empty expression", () => {
      const res = evaluateExpression("");
      expect(res.ok).toBe(false);
    });

    it("rejects incomplete expression ending with operator", () => {
      const res = evaluateExpression("100 + ");
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Incomplete expression");
    });

    it("rejects invalid numbers with multiple dots", () => {
      const res = evaluateExpression("1.2.3 + 4");
      expect(res.ok).toBe(false);
    });

    it("rejects malformed operators", () => {
      const res = evaluateExpression("100 * * 2");
      expect(res.ok).toBe(false);
    });
  });

  describe("formatResult", () => {
    it("formats whole numbers without decimal places", () => {
      expect(formatResult(1000)).toBe("1000");
    });

    it("formats fractional numbers cleanly", () => {
      expect(formatResult(12.5)).toBe("12.5");
      expect(formatResult(12.55)).toBe("12.55");
    });

    it("handles non-finite values safely", () => {
      expect(formatResult(Infinity)).toBe("Error");
      expect(formatResult(NaN)).toBe("Error");
    });
  });

  describe("cleanPrecision", () => {
    it("eliminates tiny floating point inaccuracies", () => {
      expect(cleanPrecision(0.1 + 0.2)).toBe(0.3);
    });
  });
});
