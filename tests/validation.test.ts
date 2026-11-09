import { describe, it, expect } from "vitest";
import {
  entrySchema,
  personSchema,
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
  it("accepts valid name and phone", () => {
    const res = personSchema.safeParse({
      name: "Ramesh Sharma",
      phone: "+91 98765 43210",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Ramesh Sharma");
    }
  });

  it("transforms empty phone string to undefined", () => {
    const res = personSchema.safeParse({
      name: "Suresh",
      phone: "   ",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.phone).toBeUndefined();
    }
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

  it("transforms empty dueDate string to undefined", () => {
    const res = entrySchema.safeParse({
      personId: validUUID,
      type: "GAVE",
      amount: "100",
      dueDate: "",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.dueDate).toBeUndefined();
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
});

describe("idSchema", () => {
  it("validates standard UUID", () => {
    expect(idSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
    expect(idSchema.safeParse("not-a-uuid").success).toBe(false);
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
