import { describe, it, expect } from "vitest";
import { getDueStatus, isOverdueDate } from "@/lib/due";
import { formatDateToIst } from "@/lib/format";

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

describe("formatDateToIst", () => {
  it("formats IST midnight date without day-shift bug", () => {
    // 2026-11-20 at midnight IST (+05:30) is 2026-11-19T18:30:00.000Z in UTC
    const istMidnight = new Date("2026-11-20T00:00:00+05:30");
    expect(formatDateToIst(istMidnight)).toBe("2026-11-20");
    // Verify that toISOString().split("T")[0] would have produced the buggy previous day
    expect(istMidnight.toISOString().split("T")[0]).toBe("2026-11-19");
  });

  it("handles string date inputs and late-night IST times", () => {
    const lateNightIst = new Date("2026-11-20T23:59:59+05:30");
    expect(formatDateToIst(lateNightIst)).toBe("2026-11-20");

    expect(formatDateToIst("2026-11-20T00:00:00+05:30")).toBe("2026-11-20");
  });

  it("returns null for null, undefined, or invalid dates", () => {
    expect(formatDateToIst(null)).toBeNull();
    expect(formatDateToIst(undefined)).toBeNull();
    expect(formatDateToIst("not-a-date")).toBeNull();
  });
});
