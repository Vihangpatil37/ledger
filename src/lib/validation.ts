import { z } from "zod";

/** 1 to 7 digits, optional 1-2 decimal digits — e.g. "250" or "2500.50". */
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(6, "At least 6 characters"),
});

export const personSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(60, "Up to 60 characters"),
  phone: z
    .string()
    .trim()
    .max(20, "Up to 20 characters")
    .transform((value) => (value ? value : undefined))
    .optional(),
});

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
    .transform((value) => (value ? value : undefined))
    .optional(),
  dueDate: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Use YYYY-MM-DD")
    .transform((val) => (val ? val : undefined))
    .optional(),
});

export const idSchema = z.uuid("Invalid id");

/** Collapses a zod error into one message per field. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

