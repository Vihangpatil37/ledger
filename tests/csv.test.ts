import { describe, it, expect } from "vitest";
import {
  buildStatementCsv,
  escapeCsvCell,
  sanitizeTextForCsv,
  statementCsvFilename,
} from "@/lib/csv";
import type { PersonDetail } from "@/lib/types";

describe("sanitizeTextForCsv", () => {
  it("prepends single quote to dangerous formula characters", () => {
    expect(sanitizeTextForCsv("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeTextForCsv("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(sanitizeTextForCsv("-1234-formula")).toBe("'-1234-formula");
    expect(sanitizeTextForCsv("@SUM(B1:B5)")).toBe("'@SUM(B1:B5)");
    expect(sanitizeTextForCsv("\tTab prefixed")).toBe("'\tTab prefixed");
  });

  it("handles leading whitespace before dangerous characters", () => {
    expect(sanitizeTextForCsv("  =1+1")).toBe("'  =1+1");
    expect(sanitizeTextForCsv(" \t@something")).toBe("' \t@something");
  });

  it("leaves normal safe text untouched", () => {
    expect(sanitizeTextForCsv("Payment for tea & coffee")).toBe("Payment for tea & coffee");
    expect(sanitizeTextForCsv("Ramesh Kumar")).toBe("Ramesh Kumar");
    expect(sanitizeTextForCsv("")).toBe("");
    expect(sanitizeTextForCsv(null)).toBe("");
  });
});

describe("escapeCsvCell", () => {
  it("wraps strings in double quotes and escapes internal double quotes", () => {
    expect(escapeCsvCell("Hello, World")).toBe('"Hello, World"');
    expect(escapeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(123.45)).toBe('"123.45"');
  });
});

describe("buildStatementCsv", () => {
  const mockDetail: PersonDetail = {
    id: "person-1",
    name: "Ramesh Kumar",
    phone: "9876543210",
    gaveTotal: "1000.00",
    receivedTotal: "300.00",
    balance: "700.00",
    entries: [
      {
        id: "e2",
        type: "RECEIVED",
        amount: "300.00",
        note: "=1+1 dangerous note",
        dueDate: null,
        editedAt: null,
        createdAt: "2026-11-05T10:00:00.000Z",
        running: "700.00",
      },
      {
        id: "e1",
        type: "GAVE",
        amount: "1000.00",
        note: "Initial loan",
        dueDate: "2026-12-01",
        editedAt: "2026-11-02T10:00:00.000Z",
        createdAt: "2026-11-01T10:00:00.000Z",
        running: "1000.00",
      },
    ],
  };

  it("prepends UTF-8 BOM for Excel compatibility", () => {
    const csv = buildStatementCsv(mockDetail);
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("uses CRLF line terminators", () => {
    const csv = buildStatementCsv(mockDetail);
    expect(csv.includes("\r\n")).toBe(true);
  });

  it("sanitizes text notes with single quotes without affecting numeric amounts", () => {
    const csv = buildStatementCsv(mockDetail);
    // Note starting with = must be sanitized
    expect(csv).toContain('"\'=1+1 dangerous note"');
    // Numeric amount must remain clean un-prefixed number
    expect(csv).toContain('"300.00"');
    expect(csv).toContain('"1000.00"');
    expect(csv).toContain('"700.00"');
  });

  it("includes Opening Balance row when openingBalance is set", () => {
    const filteredDetail: PersonDetail = {
      ...mockDetail,
      openingBalance: "250.00",
    };
    const csv = buildStatementCsv(filteredDetail);
    expect(csv).toContain('"Opening Balance: 250.00"');
    expect(csv).toContain('"OPENING_BALANCE"');
  });

  it("orders transactions chronologically (oldest first)", () => {
    const csv = buildStatementCsv(mockDetail);
    const indexE1 = csv.indexOf("Initial loan");
    const indexE2 = csv.indexOf("dangerous note");
    // e1 was created on 2026-11-01, e2 on 2026-11-05
    expect(indexE1).toBeLessThan(indexE2);
  });

  it("includes IST-formatted generated date in header", () => {
    const csv = buildStatementCsv(mockDetail);
    const istToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());
    expect(csv).toContain(`"Generated: ${istToday}"`);
  });
});

describe("statementCsvFilename", () => {
  it("formats safe filename with contact name and date", () => {
    const filename = statementCsvFilename("Ramesh Kumar / Shop", new Date("2026-11-15T00:00:00Z"));
    expect(filename).toBe("ledger-ramesh-kumar-shop-2026-11-15.csv");
  });

  it("handles empty or special character names", () => {
    const filename = statementCsvFilename("!!!", new Date("2026-11-15T00:00:00Z"));
    expect(filename).toBe("ledger-contact-2026-11-15.csv");
  });
});
