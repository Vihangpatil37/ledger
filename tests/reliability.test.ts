import { describe, expect, it } from "vitest";
import { computeReliabilityScore } from "@/lib/reliability";
import type { EntryType } from "@/lib/types";

describe("computeReliabilityScore", () => {
  it("returns NEW tier when customer has no transactions or only 1 unsettled loan", () => {
    const emptyResult = computeReliabilityScore({ entries: [], brokenPromisesCount: 0 });
    expect(emptyResult.tier).toBe("NEW");
    expect(emptyResult.score).toBe(100);
    expect(emptyResult.totalSettledCount).toBe(0);

    const oneLoan = computeReliabilityScore({
      entries: [
        {
          type: "GAVE" as EntryType,
          amountCents: 50000,
          createdAt: new Date("2026-01-01T10:00:00Z"),
          dueDate: new Date("2026-01-10T10:00:00Z"),
        },
      ],
      brokenPromisesCount: 0,
      referenceDate: new Date("2026-01-05T10:00:00Z"),
    });
    expect(oneLoan.tier).toBe("NEW");
  });

  it("calculates 100% on-time and EXCELLENT tier for prompt repayments", () => {
    const result = computeReliabilityScore({
      entries: [
        {
          type: "GAVE",
          amountCents: 100000, // ₹1,000
          createdAt: new Date("2026-01-01T00:00:00Z"),
          dueDate: new Date("2026-01-10T00:00:00Z"),
        },
        {
          type: "RECEIVED",
          amountCents: 100000,
          createdAt: new Date("2026-01-05T00:00:00Z"), // 4 days later (on-time)
        },
        {
          type: "GAVE",
          amountCents: 50000, // ₹500
          createdAt: new Date("2026-01-12T00:00:00Z"),
          dueDate: new Date("2026-01-20T00:00:00Z"),
        },
        {
          type: "RECEIVED",
          amountCents: 50000,
          createdAt: new Date("2026-01-15T00:00:00Z"), // 3 days later (on-time)
        },
      ],
      brokenPromisesCount: 0,
      referenceDate: new Date("2026-01-25T00:00:00Z"),
    });

    expect(result.tier).toBe("EXCELLENT");
    expect(result.onTimeRate).toBe(100);
    expect(result.avgRepayDays).toBeCloseTo(3.5, 0);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.totalSettledCount).toBe(2);
  });

  it("classifies as RISKY or MODERATE when repayment is late and dueDate was breached", () => {
    const result = computeReliabilityScore({
      entries: [
        {
          type: "GAVE",
          amountCents: 100000,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          dueDate: new Date("2026-01-05T00:00:00Z"),
        },
        {
          type: "RECEIVED",
          amountCents: 100000,
          createdAt: new Date("2026-01-25T00:00:00Z"), // 20 days late (turnaround 24 days)
        },
        {
          type: "GAVE",
          amountCents: 100000,
          createdAt: new Date("2026-02-01T00:00:00Z"),
          dueDate: new Date("2026-02-05T00:00:00Z"),
        },
        {
          type: "RECEIVED",
          amountCents: 100000,
          createdAt: new Date("2026-02-28T00:00:00Z"), // 23 days late
        },
      ],
      brokenPromisesCount: 0,
      referenceDate: new Date("2026-03-01T00:00:00Z"),
    });

    expect(result.onTimeRate).toBe(0);
    expect(result.avgRepayDays).toBeGreaterThan(20);
    expect(result.score).toBeLessThan(60);
    expect(result.tier).toBe("RISKY");
  });

  it("penalizes score heavily for broken promises", () => {
    const cleanResult = computeReliabilityScore({
      entries: [
        {
          type: "GAVE",
          amountCents: 100000,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          dueDate: new Date("2026-01-10T00:00:00Z"),
        },
        {
          type: "RECEIVED",
          amountCents: 100000,
          createdAt: new Date("2026-01-06T00:00:00Z"),
        },
        {
          type: "GAVE",
          amountCents: 100000,
          createdAt: new Date("2026-01-12T00:00:00Z"),
          dueDate: new Date("2026-01-20T00:00:00Z"),
        },
        {
          type: "RECEIVED",
          amountCents: 100000,
          createdAt: new Date("2026-01-16T00:00:00Z"),
        },
      ],
      brokenPromisesCount: 0,
    });

    const penalizedResult = computeReliabilityScore({
      entries: [
        {
          type: "GAVE",
          amountCents: 100000,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          dueDate: new Date("2026-01-10T00:00:00Z"),
        },
        {
          type: "RECEIVED",
          amountCents: 100000,
          createdAt: new Date("2026-01-06T00:00:00Z"),
        },
        {
          type: "GAVE",
          amountCents: 100000,
          createdAt: new Date("2026-01-12T00:00:00Z"),
          dueDate: new Date("2026-01-20T00:00:00Z"),
        },
        {
          type: "RECEIVED",
          amountCents: 100000,
          createdAt: new Date("2026-01-16T00:00:00Z"),
        },
      ],
      brokenPromisesCount: 2, // 2 broken promises
    });

    expect(penalizedResult.score).toBe(cleanResult.score - 30);
    expect(penalizedResult.brokenPromisesCount).toBe(2);
  });
});
