/**
 * Deterministic arithmetic tokenizer and evaluator for the ledger calculator.
 * Strictly avoids `eval` or `Function` constructors.
 */

export type CalculationItem = {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
};

/**
 * Clean and standardize an expression string.
 * Converts Unicode symbols (×, ÷) to standard operators (*, /).
 */
export function normalizeExpression(expr: string): string {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, "");
}

type Token =
  | { type: "number"; value: number }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "percent" };

/**
 * Tokenize a normalized expression into numbers, binary operators, and percentage flags.
 */
function tokenize(normalized: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const n = normalized.length;

  while (i < n) {
    const char = normalized[i];

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      // Handle unary plus/minus at the start or immediately following an operator
      if (
        (char === "-" || char === "+") &&
        (tokens.length === 0 || tokens[tokens.length - 1].type === "operator")
      ) {
        // Read the signed number
        let numStr = char;
        i++;
        let hasDot = false;
        while (i < n && ((normalized[i] >= "0" && normalized[i] <= "9") || normalized[i] === ".")) {
          if (normalized[i] === ".") {
            if (hasDot) return null; // invalid double dot
            hasDot = true;
          }
          numStr += normalized[i];
          i++;
        }
        const parsed = Number(numStr);
        if (Number.isNaN(parsed)) return null;
        tokens.push({ type: "number", value: parsed });
        continue;
      }

      tokens.push({ type: "operator", value: char });
      i++;
      continue;
    }

    if (char === "%") {
      tokens.push({ type: "percent" });
      i++;
      continue;
    }

    if ((char >= "0" && char <= "9") || char === ".") {
      let numStr = "";
      let hasDot = false;
      while (i < n && ((normalized[i] >= "0" && normalized[i] <= "9") || normalized[i] === ".")) {
        if (normalized[i] === ".") {
          if (hasDot) return null;
          hasDot = true;
        }
        numStr += normalized[i];
        i++;
      }
      const parsed = Number(numStr);
      if (Number.isNaN(parsed)) return null;
      tokens.push({ type: "number", value: parsed });
      continue;
    }

    // Unrecognized character
    return null;
  }

  return tokens;
}

/**
 * Precision fix to avoid JavaScript floating point errors like 0.1 + 0.2 = 0.30000000000000004
 */
export function cleanPrecision(num: number): number {
  if (!Number.isFinite(num)) return num;
  // Round to 10 decimal places to eliminate floating point drift
  return Math.round(num * 1e10) / 1e10;
}

/**
 * Format a calculation result into a user-friendly string.
 * Strips superfluous trailing zeros while keeping up to 4 decimal places if fractional.
 */
export function formatResult(num: number): string {
  if (!Number.isFinite(num)) return "Error";
  const cleaned = cleanPrecision(num);
  // If it's an integer, return without decimals
  if (Number.isInteger(cleaned)) {
    return cleaned.toString();
  }
  // Otherwise format with up to 4 decimals, removing trailing zeros
  const fixed = cleaned.toFixed(4);
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Safely evaluates an arithmetic expression string.
 * Returns { ok: true, result: number, formatted: string } or { ok: false, error: string }
 */
export function evaluateExpression(expr: string): {
  ok: boolean;
  result?: number;
  formatted?: string;
  error?: string;
} {
  const normalized = normalizeExpression(expr);
  if (!normalized) {
    return { ok: false, error: "Empty expression" };
  }

  const rawTokens = tokenize(normalized);
  if (!rawTokens || rawTokens.length === 0) {
    return { ok: false, error: "Invalid expression" };
  }

  // Handle trailing operator gracefully (ignore or return invalid)
  if (rawTokens[rawTokens.length - 1].type === "operator") {
    return { ok: false, error: "Incomplete expression" };
  }

  // Process percentages first:
  // e.g. "100 + 10%" -> "100 + 10", where 10% of 100 = 10
  // e.g. "500 * 5%" -> 500 * 0.05
  // e.g. "50%" -> 0.5
  type IntermediateToken =
    | { type: "number"; value: number }
    | { type: "operator"; value: "+" | "-" | "*" | "/" };

  const tokensWithoutPercent: IntermediateToken[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i];

    if (token.type === "percent") {
      const prev = tokensWithoutPercent[tokensWithoutPercent.length - 1];
      if (!prev || prev.type !== "number") {
        return { ok: false, error: "Invalid percentage placement" };
      }

      // Check if there's a preceding operator and base number: e.g., A + B% or A - B%
      if (tokensWithoutPercent.length >= 3) {
        const op = tokensWithoutPercent[tokensWithoutPercent.length - 2];
        const base = tokensWithoutPercent[tokensWithoutPercent.length - 3];
        if (op.type === "operator" && base.type === "number") {
          if (op.value === "+" || op.value === "-") {
            // Percent of base: (base * prev.value) / 100
            prev.value = cleanPrecision((base.value * prev.value) / 100);
            continue;
          }
        }
      }

      // Default percentage: just divide the preceding number by 100
      prev.value = cleanPrecision(prev.value / 100);
      continue;
    }

    tokensWithoutPercent.push(token);
  }

  // Next: High-precedence operators (* and /)
  const tokensAfterMultDiv: IntermediateToken[] = [];
  let i = 0;

  while (i < tokensWithoutPercent.length) {
    const token = tokensWithoutPercent[i];

    if (token.type === "operator" && (token.value === "*" || token.value === "/")) {
      const prev = tokensAfterMultDiv.pop();
      const next = tokensWithoutPercent[i + 1];

      if (!prev || prev.type !== "number" || !next || next.type !== "number") {
        return { ok: false, error: "Malformed expression" };
      }

      if (token.value === "/" && next.value === 0) {
        return { ok: false, error: "Cannot divide by zero" };
      }

      const calculated =
        token.value === "*"
          ? cleanPrecision(prev.value * next.value)
          : cleanPrecision(prev.value / next.value);

      tokensAfterMultDiv.push({ type: "number", value: calculated });
      i += 2; // skip operator and next number
    } else {
      tokensAfterMultDiv.push(token);
      i++;
    }
  }

  // Next: Low-precedence operators (+ and -)
  if (tokensAfterMultDiv.length === 0 || tokensAfterMultDiv[0].type !== "number") {
    return { ok: false, error: "Malformed expression" };
  }

  let finalResult = tokensAfterMultDiv[0].value;
  let j = 1;

  while (j < tokensAfterMultDiv.length) {
    const op = tokensAfterMultDiv[j];
    const next = tokensAfterMultDiv[j + 1];

    if (!op || op.type !== "operator" || !next || next.type !== "number") {
      return { ok: false, error: "Malformed expression" };
    }

    if (op.value === "+") {
      finalResult = cleanPrecision(finalResult + next.value);
    } else if (op.value === "-") {
      finalResult = cleanPrecision(finalResult - next.value);
    }

    j += 2;
  }

  return {
    ok: true,
    result: finalResult,
    formatted: formatResult(finalResult),
  };
}
