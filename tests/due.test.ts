import { describe, it, expect } from "vitest";
import { getDueStatus, isOverdueDate } from "@/lib/due";

function getIstDateString(offsetDays = 0): string {
  const istTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const [y, m, d] = istTodayStr.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return target.toISOString().split("T")[0];
}

describe("getDueStatus", () => {
  it("returns null for empty or invalid input", () => {
    expect(getDueStatus(null)).toBeNull();
    expect(getDueStatus(undefined)).toBeNull();
    expect(getDueStatus("")).toBeNull();
    expect(getDueStatus("invalid-date")).toBeNull();
  });

  it("identifies overdue dates correctly", () => {
    const dateStr = getIstDateString(-3);

    const res = getDueStatus(dateStr);
    expect(res).not.toBeNull();
    expect(res?.status).toBe("OVERDUE");
    expect(res?.label).toContain("Overdue by 3 days");
    expect(isOverdueDate(dateStr)).toBe(true);
  });

  it("identifies due today correctly", () => {
    const dateStr = getIstDateString(0);

    const res = getDueStatus(dateStr);
    expect(res).not.toBeNull();
    expect(res?.status).toBe("DUE_TODAY");
    expect(res?.label).toBe("Due today");
    expect(isOverdueDate(dateStr)).toBe(false);
  });

  it("identifies due soon within 7 days", () => {
    const dateStr = getIstDateString(4);

    const res = getDueStatus(dateStr);
    expect(res).not.toBeNull();
    expect(res?.status).toBe("DUE_SOON");
    expect(res?.label).toContain("Due in 4 days");
    expect(isOverdueDate(dateStr)).toBe(false);
  });

  it("identifies due later beyond 7 days", () => {
    const dateStr = getIstDateString(14);

    const res = getDueStatus(dateStr);
    expect(res).not.toBeNull();
    expect(res?.status).toBe("DUE_LATER");
    expect(res?.label).toMatch(/^Due \d{1,2} [A-Z][a-z]{2}$/);
    expect(isOverdueDate(dateStr)).toBe(false);
  });

  it("handles singular vs plural days correctly", () => {
    const overdue1 = getDueStatus(getIstDateString(-1));
    expect(overdue1?.label).toBe("Overdue by 1 day");

    const soon1 = getDueStatus(getIstDateString(1));
    expect(soon1?.label).toBe("Due in 1 day");
  });

  it("computes status relative to an explicit referenceDate deterministically", () => {
    // Reference: June 15, 2026 IST
    const refDate = new Date("2026-06-15T10:00:00+05:30");

    expect(getDueStatus("2026-06-14", refDate)?.status).toBe("OVERDUE");
    expect(isOverdueDate("2026-06-14", refDate)).toBe(true);

    expect(getDueStatus("2026-06-15", refDate)?.status).toBe("DUE_TODAY");
    expect(isOverdueDate("2026-06-15", refDate)).toBe(false);

    expect(getDueStatus("2026-06-18", refDate)?.status).toBe("DUE_SOON");
    expect(getDueStatus("2026-06-18", refDate)?.label).toBe("Due in 3 days");

    expect(getDueStatus("2026-06-30", refDate)?.status).toBe("DUE_LATER");
    expect(getDueStatus("2026-06-30", refDate)?.label).toBe("Due 30 Jun");
  });
});
