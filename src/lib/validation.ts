import { z } from "zod";

/** 1 to 7 digits, optional 1-2 decimal digits — e.g. "250" or "2500.50". */
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(6, "At least 6 characters"),
});

export const upiIdField = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .trim()
    .max(50, "Up to 50 characters")
    .regex(/^[\w.-]+@[\w.-]+$/, "Enter a valid UPI ID (e.g. name@upi)")
    .nullish()
    .transform((v) => v ?? null)
);

export const ownerUpiSchema = z.object({
  upiId: upiIdField,
  upiName: z
    .string()
    .trim()
    .max(40, "Up to 40 characters")
    .nullish()
    .transform((v) => (v ? v : null)),
});

/**
 * Normalizes an Indian mobile phone number into "+91 XXXXX XXXXX" format.
 * - Strips whitespace, hyphens, dots, parentheses, and leading plus.
 * - Extracts 10 digits, recognizing "+91", "91", or "0" trunk prefix.
 * - Enforces TRAI standard: Indian mobile numbers must start with 6, 7, 8, or 9.
 * - Returns null if the number is invalid or not a 10-digit Indian mobile.
 */
export function normalizeIndianPhone(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let cleaned = raw.trim().replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  if (!/^\d+$/.test(cleaned)) return null;

  let tenDigits = "";
  if (cleaned.length === 10) {
    tenDigits = cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    tenDigits = cleaned.slice(1);
  } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
    tenDigits = cleaned.slice(2);
  } else {
    return null;
  }

  // TRAI rule: Indian mobile numbers begin with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(tenDigits)) {
    return null;
  }

  return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
}

export const indianPhoneField = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .trim()
    .nullish()
    .superRefine((val, ctx) => {
      if (!val) return;
      const normalized = normalizeIndianPhone(val);
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Enter a valid 10-digit Indian mobile number starting with 6-9",
        });
      }
    })
    .transform((val) => (val ? normalizeIndianPhone(val) : undefined))
);

export const personSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(60, "Up to 60 characters"),
  phone: indianPhoneField,
});

/** Validates that a string is a real calendar date in YYYY-MM-DD format (no leap day or month overflow). */
export function isValidCalendarDate(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const d = new Date(val + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().startsWith(val);
}

export const entrySchema = z.object({
  personId: z.uuid("Pick a person"),
  type: z.enum(["GAVE", "RECEIVED"]),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,7}(\.\d{1,2})?$/, "Use a number like 250 or 250.50")
    .refine((value) => Number(value) > 0, "Amount must be more than 0"),
  note: z
    .string()
    .trim()
    .max(200, "Up to 200 characters")
    .nullish()
    .transform((value) => (value ? value : undefined)),
  dueDate: z
    .string()
    .trim()
    .refine(
      (val) => !val || isValidCalendarDate(val),
      "Enter a valid calendar date (YYYY-MM-DD)"
    )
    .nullish()
    .transform((val) => (val ? val : undefined)),
});

export const idSchema = z.uuid("Invalid id");

export const editEntrySchema = entrySchema
  .omit({ personId: true })
  .extend({
    id: idSchema,
  });

export const dateRangeSchema = z
  .object({
    from: z
      .string()
      .trim()
      .refine(
        (val) => !val || isValidCalendarDate(val),
        "From date must be a valid calendar date (YYYY-MM-DD)"
      )
      .nullish()
      .transform((val) => (val ? val : undefined)),
    to: z
      .string()
      .trim()
      .refine(
        (val) => !val || isValidCalendarDate(val),
        "To date must be a valid calendar date (YYYY-MM-DD)"
      )
      .nullish()
      .transform((val) => (val ? val : undefined)),
  })
  .refine(
    (data) => {
      if (data.from && data.to) return data.from <= data.to;
      return true;
    },
    { message: "From date cannot be after To date", path: ["from"] }
  );

/** Collapses a zod error into one message per field. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
