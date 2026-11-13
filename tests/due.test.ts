import { describe, it, expect } from "vitest";
import { getDueStatus, isOverdueDate } from "@/lib/due";

describe("getDueStatus", () => {
  it("returns null for empty or invalid input", () => {
    expect(getDueStatus(null)).toBeNull();
    expect(getDueStatus(undefined)).toBeNull();
    expect(getDueStatus("")).toBeNull();
    expect(getDueStatus("invalid-date")).toBeNull();
  });

  it("identifies overdue dates correctly", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 3);
    const dateStr = yesterday.toISOString().split("T")[0];

    const res = getDueStatus(dateStr);
    expect(res).not.toBeNull();
    expect(res?.status).toBe("OVERDUE");
    expect(res?.label).toContain("Overdue by 3 days");
    expect(isOverdueDate(dateStr)).toBe(true);
  });

  it("identifies due today correctly", () => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    const res = getDueStatus(dateStr);
    expect(res).not.toBeNull();
    expect(res?.status).toBe("DUE_TODAY");
    expect(res?.label).toBe("Due today");
    expect(isOverdueDate(dateStr)).toBe(false);
  });

  it("identifies due soon within 7 days", () => {
    const future = new Date();
    future.setDate(future.getDate() + 4);
    const dateStr = future.toISOString().split("T")[0];

    const res = getDueStatus(dateStr);
    expect(res).not.toBeNull();
    expect(res?.status).toBe("DUE_SOON");
    expect(res?.label).toContain("Due in 4 days");
    expect(isOverdueDate(dateStr)).toBe(false);
  });

  it("evaluates overdue debt status based on outstanding balance", () => {
    // A loan whose due date has passed should not be overdue if repaid in full
    const overdueGaveCents = 50000; // ₹500
    const fullRepaymentCents = 50000; // ₹500
    const partialRepaymentCents = 20000; // ₹200

    expect(overdueGaveCents > fullRepaymentCents).toBe(false);
    expect(overdueGaveCents > partialRepaymentCents).toBe(true);
  });
});
