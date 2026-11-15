import { describe, expect, it } from "vitest";
import {
  RETENTION_DAYS,
  activeFilter,
  getDaysRemaining,
  getPurgeCutoffDate,
  isSoftDeleted,
} from "@/lib/trash";

describe("Trash logic and helpers", () => {
  it("determines soft-deleted status accurately", () => {
    expect(isSoftDeleted({})).toBe(false);
    expect(isSoftDeleted({ deletedAt: null })).toBe(false);
    expect(isSoftDeleted({ deletedAt: new Date() })).toBe(true);
  });

  it("calculates remaining days out of 30-day retention window", () => {
    const now = new Date("2026-03-31T12:00:00Z");
    const deletedYesterday = new Date("2026-03-30T12:00:00Z");
    const deleted10DaysAgo = new Date("2026-03-21T12:00:00Z");
    const deleted35DaysAgo = new Date("2026-02-24T12:00:00Z");

    expect(getDaysRemaining(now, now)).toBe(RETENTION_DAYS);
    expect(getDaysRemaining(deletedYesterday, now)).toBe(29);
    expect(getDaysRemaining(deleted10DaysAgo, now)).toBe(20);
    expect(getDaysRemaining(deleted35DaysAgo, now)).toBe(0);
  });

  it("provides valid active MongoDB filter", () => {
    const filter = activeFilter();
    expect(filter).toEqual({ deletedAt: { $in: [null, undefined] } });
  });

  it("calculates correct 30-day purge cutoff date", () => {
    const now = new Date("2026-05-15T00:00:00Z");
    const cutoff = getPurgeCutoffDate(now);
    const diffDays = Math.round((now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(RETENTION_DAYS);
  });
});
