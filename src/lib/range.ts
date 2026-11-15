import type { DateRange } from "@/lib/types";

export type PresetRangeId = "ALL" | "THIS_MONTH" | "LAST_30_DAYS";

/**
 * Resolves a YYYY-MM-DD DateRange into UTC Date instances anchored to Indian Standard Time (UTC+05:30).
 * from: Start of day in IST (00:00:00+05:30)
 * to: Start of following day in IST (00:00:00+05:30), serving as an exclusive upper bound.
 */
export function resolveIstRange(range?: DateRange): {
  fromDate?: Date;
  toDateExclusive?: Date;
} {
  if (!range) return {};

  let fromDate: Date | undefined;
  let toDateExclusive: Date | undefined;

  if (range.from && /^\d{4}-\d{2}-\d{2}$/.test(range.from)) {
    const d = new Date(`${range.from}T00:00:00+05:30`);
    if (!isNaN(d.getTime())) fromDate = d;
  }

  if (range.to && /^\d{4}-\d{2}-\d{2}$/.test(range.to)) {
    const [y, m, day] = range.to.split("-").map(Number);
    // Advance 1 day in calendar for exclusive upper bound
    const nextDate = new Date(Date.UTC(y, m - 1, day + 1));
    const nextY = nextDate.getUTCFullYear();
    const nextM = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
    const nextD = String(nextDate.getUTCDate()).padStart(2, "0");
    const d = new Date(`${nextY}-${nextM}-${nextD}T00:00:00+05:30`);
    if (!isNaN(d.getTime())) toDateExclusive = d;
  }

  return { fromDate, toDateExclusive };
}

/**
 * Returns date range strings (YYYY-MM-DD) for preset filters anchored to IST.
 */
export function getPresetDateRange(
  preset: PresetRangeId,
  referenceDate?: Date
): DateRange {
  if (preset === "ALL") return {};

  const now = referenceDate ?? new Date();
  const istTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now);
  const [year, month, day] = istTodayStr.split("-").map(Number);

  if (preset === "THIS_MONTH") {
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    return { from, to: istTodayStr };
  }

  if (preset === "LAST_30_DAYS") {
    const pastUtc = new Date(Date.UTC(year, month - 1, day - 29));
    const pY = pastUtc.getUTCFullYear();
    const pM = String(pastUtc.getUTCMonth() + 1).padStart(2, "0");
    const pD = String(pastUtc.getUTCDate()).padStart(2, "0");
    return { from: `${pY}-${pM}-${pD}`, to: istTodayStr };
  }

  return {};
}
