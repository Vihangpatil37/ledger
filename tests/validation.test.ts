import { describe, it, expect } from "vitest";
import { formatIndianPhone } from "@/lib/phone";
import {
  entrySchema,
  editEntrySchema,
  dateRangeSchema,
  personSchema,
  ownerUpiSchema,
  upiIdField,
  normalizeIndianPhone,
  indianPhoneField,
  loginSchema,
  idSchema,
  fieldErrorsOf,
} from "@/lib/validation";

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const res = loginSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(res.success).toBe(true);
  });

  it("trims email whitespace", () => {
    const res = loginSchema.safeParse({
      email: "  user@example.com  ",
      password: "password123",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe("user@example.com");
    }
  });

  it("rejects invalid email addresses", () => {
    const res = loginSchema.safeParse({
      email: "invalid-email",
      password: "password123",
    });
    expect(res.success).toBe(false);
  });

  it("rejects passwords under 6 characters", () => {
    const res = loginSchema.safeParse({
      email: "user@example.com",
      password: "123",
    });
    expect(res.success).toBe(false);
  });
});

describe("personSchema", () => {
  it("accepts valid name and formats phone to +91 XXXXX XXXXX", () => {
    const res = personSchema.safeParse({
      name: "Ramesh Sharma",
      phone: "+91 98765 43210",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Ramesh Sharma");
      expect(res.data.phone).toBe("+91 98765 43210");
    }
  });

  it("normalizes raw 10-digit number to +91 XXXXX XXXXX", () => {
    const res = personSchema.safeParse({
      name: "Ramesh Sharma",
      phone: "9876543210",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.phone).toBe("+91 98765 43210");
    }
  });

  it("normalizes numbers with trunk zero or +91 without spaces", () => {
    const res1 = personSchema.safeParse({ name: "A", phone: "09876543210" });
    expect(res1.success).toBe(true);
    if (res1.success) expect(res1.data.phone).toBe("+91 98765 43210");

    const res2 = personSchema.safeParse({ name: "B", phone: "+919876543210" });
    expect(res2.success).toBe(true);
    if (res2.success) expect(res2.data.phone).toBe("+91 98765 43210");

    const res3 = personSchema.safeParse({ name: "C", phone: "919876543210" });
    expect(res3.success).toBe(true);
    if (res3.success) expect(res3.data.phone).toBe("+91 98765 43210");
  });

  it("accepts Indian mobile numbers starting with 6, 7, 8, or 9", () => {
    for (const prefix of ["6", "7", "8", "9"]) {
      const num = `${prefix}123456789`;
      const res = personSchema.safeParse({ name: "Test", phone: num });
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.phone).toBe(`+91 ${prefix}1234 56789`);
    }
  });

  it("rejects numbers starting with invalid digits (0 to 5)", () => {
    for (const prefix of ["0", "1", "2", "3", "4", "5"]) {
      // Raw 10 digits starting with 0-5
      const num = `${prefix}123456789`;
      const res = personSchema.safeParse({ name: "Test", phone: num });
      expect(res.success).toBe(false);
    }
  });

  it("rejects phone numbers with invalid length or non-digits", () => {
    const invalidList = [
      "98765", // too short
      "9876543210123", // too long
      "98765abcde", // contains letters
      "abcdefghij", // non-digits
    ];
    for (const num of invalidList) {
      const res = personSchema.safeParse({ name: "Test", phone: num });
      expect(res.success).toBe(false);
    }
  });

  it("transforms empty phone string, null, or undefined to undefined", () => {
    for (const phoneVal of ["   ", "", null, undefined]) {
      const res = personSchema.safeParse({
        name: "Suresh",
        phone: phoneVal,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.phone).toBeUndefined();
      }
    }
  });

  it("normalizeIndianPhone returns null for invalid formats and string for valid ones", () => {
    expect(normalizeIndianPhone("")).toBeNull();
    expect(normalizeIndianPhone("invalid")).toBeNull();
    expect(normalizeIndianPhone("5551234567")).toBeNull();
    expect(normalizeIndianPhone("9876543210")).toBe("+91 98765 43210");
  });

  it("indianPhoneField rejects invalid numbers with custom issue message", () => {
    const res = indianPhoneField.safeParse("12345");
    expect(res.success).toBe(false);
  });

  it("rejects empty name", () => {
    const res = personSchema.safeParse({
      name: "   ",
    });
    expect(res.success).toBe(false);
  });

  it("rejects names over 60 characters", () => {
    const res = personSchema.safeParse({
      name: "A".repeat(61),
    });
    expect(res.success).toBe(false);
  });
});

describe("entrySchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid GAVE entry with integer amount", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "GAVE",
      amount: "500",
      note: "Chai and snacks",
    });
    expect(res.success).toBe(true);
  });

  it("accepts valid RECEIVED entry with decimal paise", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "RECEIVED",
      amount: "1250.75",
    });
    expect(res.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "GAVE",
      amount: "0",
    });
    expect(res.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "GAVE",
      amount: "-100",
    });
    expect(res.success).toBe(false);
  });

  it("rejects more than 2 decimal places (fractional paise)", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "GAVE",
      amount: "100.125",
    });
    expect(res.success).toBe(false);
  });

  it("rejects invalid UUID for personId", () => {
    const res = entrySchema.safeParse({
      personId: "not-a-uuid",
      type: "GAVE",
      amount: "100",
    });
    expect(res.success).toBe(false);
  });

  it("accepts valid dueDate format YYYY-MM-DD", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "GAVE",
      amount: "100",
      dueDate: "2026-11-25",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.dueDate).toBe("2026-11-25");
    }
  });

  it("transforms empty dueDate string, null, or undefined to undefined", () => {
    for (const dueVal of ["", "   ", null, undefined]) {
      const res = entrySchema.safeParse({
        personId: validUUID,
        type: "GAVE",
        amount: "100",
        dueDate: dueVal,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.dueDate).toBeUndefined();
      }
    }
  });

  it("accepts RECEIVED entry where dueDate and note are omitted (null from FormData.get)", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "RECEIVED",
      amount: "100",
      note: null,
      dueDate: null,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.dueDate).toBeUndefined();
      expect(res.data.note).toBeUndefined();
    }
  });

  it("rejects invalid dueDate format", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "GAVE",
      amount: "100",
      dueDate: "25/11/2026",
    });
    expect(res.success).toBe(false);
  });

  it("accepts valid leap year date 2024-02-29", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "GAVE",
      amount: "100",
      dueDate: "2024-02-29",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.dueDate).toBe("2024-02-29");
    }
  });

  it("rejects non-existent calendar dates like 2026-02-31 or 2026-99-99", () => {
    const invalidDates = [
      "2026-02-31",
      "2026-02-29",
      "2026-04-31",
      "2026-99-99",
      "2026-00-10",
      "2026-13-01",
    ];
    for (const d of invalidDates) {
      const res = entrySchema.safeParse({
        personId: validUUID,
        type: "GAVE",
        amount: "100",
        dueDate: d,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("Enter a valid calendar date (YYYY-MM-DD)");
      }
    }
  });
});

describe("idSchema", () => {
  it("validates standard UUID", () => {
    expect(idSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
    expect(idSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("editEntrySchema", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid edit data without personId", () => {
    const res = editEntrySchema.safeParse({
      id: validId,
      type: "GAVE",
      amount: "500",
      note: "Updated note",
      dueDate: "2026-12-31",
    });
    expect(res.success).toBe(true);
  });

  it("rejects invalid id or missing id", () => {
    expect(
      editEntrySchema.safeParse({
        id: "invalid-id",
        type: "GAVE",
        amount: "500",
      }).success
    ).toBe(false);

    expect(
      editEntrySchema.safeParse({
        type: "GAVE",
        amount: "500",
      }).success
    ).toBe(false);
  });

  it("rejects invalid amount", () => {
    expect(
      editEntrySchema.safeParse({
        id: validId,
        type: "GAVE",
        amount: "-10",
      }).success
    ).toBe(false);
  });
});

describe("dateRangeSchema", () => {
  it("accepts valid from and to dates where from <= to", () => {
    const res = dateRangeSchema.safeParse({
      from: "2026-01-01",
      to: "2026-01-31",
    });
    expect(res.success).toBe(true);
  });

  it("accepts partial ranges or empty range", () => {
    expect(dateRangeSchema.safeParse({ from: "2026-01-01" }).success).toBe(true);
    expect(dateRangeSchema.safeParse({ to: "2026-01-31" }).success).toBe(true);
    expect(dateRangeSchema.safeParse({}).success).toBe(true);
  });

  it("rejects when from date is after to date", () => {
    const res = dateRangeSchema.safeParse({
      from: "2026-02-01",
      to: "2026-01-15",
    });
    expect(res.success).toBe(false);
  });

  it("rejects non-calendar or malformed date strings", () => {
    expect(dateRangeSchema.safeParse({ from: "not-a-date" }).success).toBe(false);
    expect(dateRangeSchema.safeParse({ to: "01-01-2026" }).success).toBe(false);
    expect(dateRangeSchema.safeParse({ from: "2026-99-99" }).success).toBe(false);
    expect(dateRangeSchema.safeParse({ to: "2026-02-31" }).success).toBe(false);
  });

  it("accepts real leap days and valid calendar boundaries", () => {
    expect(dateRangeSchema.safeParse({ from: "2024-02-29", to: "2024-03-01" }).success).toBe(true);
    expect(dateRangeSchema.safeParse({ from: "2026-02-29" }).success).toBe(false); // 2026 is not a leap year
  });
});

describe("upiIdField and ownerUpiSchema", () => {
  it("accepts valid UPI IDs and trims whitespace", () => {
    const res = upiIdField.safeParse("  name@okhdfcbank  ");
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toBe("name@okhdfcbank");
  });

  it("converts empty string, null, or undefined to null", () => {
    expect(upiIdField.parse("")).toBeNull();
    expect(upiIdField.parse("   ")).toBeNull();
    expect(upiIdField.parse(null)).toBeNull();
    expect(upiIdField.parse(undefined)).toBeNull();
  });

  it("rejects invalid UPI handles without @ symbol", () => {
    expect(upiIdField.safeParse("invalid-upi").success).toBe(false);
    expect(upiIdField.safeParse("@invalid").success).toBe(false);
    expect(upiIdField.safeParse("invalid@").success).toBe(false);
  });

  it("validates ownerUpiSchema with optional upiName", () => {
    const res = ownerUpiSchema.safeParse({
      upiId: "mybusiness@icici",
      upiName: "Ramesh Stores",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.upiId).toBe("mybusiness@icici");
      expect(res.data.upiName).toBe("Ramesh Stores");
    }
  });

  it("allows clearing owner UPI settings with empty strings", () => {
    const res = ownerUpiSchema.safeParse({
      upiId: "",
      upiName: "",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.upiId).toBeNull();
      expect(res.data.upiName).toBeNull();
    }
  });
});

describe("fieldErrorsOf", () => {
  it("formats zod error into key-value map", () => {
    const parsed = loginSchema.safeParse({ email: "invalid", password: "1" });
    if (!parsed.success) {
      const errors = fieldErrorsOf(parsed.error);
      expect(errors.email).toBeDefined();
      expect(errors.password).toBeDefined();
    }
  });
});

describe("formatIndianPhone formatter", () => {
  it("formats incremental typing correctly", () => {
    expect(formatIndianPhone("")).toBe("");
    expect(formatIndianPhone("9")).toBe("+91 9");
    expect(formatIndianPhone("98")).toBe("+91 98");
    expect(formatIndianPhone("98765")).toBe("+91 98765");
    expect(formatIndianPhone("987654")).toBe("+91 98765 4");
    expect(formatIndianPhone("9876543210")).toBe("+91 98765 43210");
  });

  it("handles backspacing down to empty", () => {
    expect(formatIndianPhone("+91 98765 43210")).toBe("+91 98765 43210");
    expect(formatIndianPhone("+91 98765 4")).toBe("+91 98765 4");
    expect(formatIndianPhone("+91 98765")).toBe("+91 98765");
    expect(formatIndianPhone("+91 9")).toBe("+91 9");
    expect(formatIndianPhone("+91 ")).toBe("");
    expect(formatIndianPhone("+91")).toBe("");
    expect(formatIndianPhone("+9")).toBe("");
    expect(formatIndianPhone("+")).toBe("");
  });

  it("formats pasted inputs with varied prefixes", () => {
    expect(formatIndianPhone("9876543210")).toBe("+91 98765 43210");
    expect(formatIndianPhone("+919876543210")).toBe("+91 98765 43210");
    expect(formatIndianPhone("+91 98765 43210")).toBe("+91 98765 43210");
    expect(formatIndianPhone("09876543210")).toBe("+91 98765 43210");
  });
});
