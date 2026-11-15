import { describe, it, expect } from "vitest";
import { getPresetDateRange, resolveIstRange } from "@/lib/range";

describe("resolveIstRange", () => {
  it("returns empty object when range is undefined", () => {
    expect(resolveIstRange(undefined)).toEqual({});
  });

  it("resolves from date to start of IST day (00:00:00+05:30)", () => {
    const res = resolveIstRange({ from: "2026-11-01" });
    expect(res.fromDate).toBeDefined();
    expect(res.fromDate?.toISOString()).toBe(
      new Date("2026-11-01T00:00:00+05:30").toISOString()
    );
    expect(res.toDateExclusive).toBeUndefined();
  });

  it("resolves to date to exclusive upper bound (start of next IST day)", () => {
    const res = resolveIstRange({ to: "2026-11-15" });
    expect(res.fromDate).toBeUndefined();
    expect(res.toDateExclusive).toBeDefined();
    // Next day in IST: 2026-11-16T00:00:00+05:30
    expect(res.toDateExclusive?.toISOString()).toBe(
      new Date("2026-11-16T00:00:00+05:30").toISOString()
    );
  });

  it("resolves both from and to bounds accurately", () => {
    const res = resolveIstRange({ from: "2026-01-01", to: "2026-01-31" });
    expect(res.fromDate?.toISOString()).toBe(
      new Date("2026-01-01T00:00:00+05:30").toISOString()
    );
    expect(res.toDateExclusive?.toISOString()).toBe(
      new Date("2026-02-01T00:00:00+05:30").toISOString()
    );
  });

  it("ignores impossible calendar dates without throwing or overflowing", () => {
    const res = resolveIstRange({ from: "2026-99-99", to: "2026-02-31" });
    expect(res.fromDate).toBeUndefined();
    expect(res.toDateExclusive).toBeUndefined();
    expect(res).toEqual({});
  });
});

describe("getPresetDateRange", () => {
  it("returns empty range for ALL", () => {
    expect(getPresetDateRange("ALL")).toEqual({});
  });

  it("calculates THIS_MONTH anchored to IST", () => {
    const ref = new Date("2026-11-15T12:00:00Z");
    const res = getPresetDateRange("THIS_MONTH", ref);
    expect(res.from).toBe("2026-11-01");
    expect(res.to).toBe("2026-11-15");
  });

  it("calculates LAST_30_DAYS accurately across month boundaries", () => {
    const ref = new Date("2026-03-01T12:00:00Z"); // March 1, 2026
    const res = getPresetDateRange("LAST_30_DAYS", ref);
    expect(res.to).toBe("2026-03-01");
    expect(res.from).toBeDefined();
    // 29 days before March 1 in a non-leap year (2026) is Jan 31
    expect(res.from).toBe("2026-01-31");
  });
});
