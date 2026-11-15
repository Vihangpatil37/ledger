import { describe, it, expect } from "vitest";
import {
  normalizeWaPhone,
  reminderMessage,
  formatStatementMessage,
  waLink,
  universalWaLink,
} from "@/lib/whatsapp";
import type { PersonDetail } from "@/lib/types";

describe("normalizeWaPhone", () => {
  it("normalizes standard 10-digit Indian numbers with 91 country code", () => {
    expect(normalizeWaPhone("9876543210")).toBe("919876543210");
    expect(normalizeWaPhone(" 98765 43210 ")).toBe("919876543210");
    expect(normalizeWaPhone("98765-43210")).toBe("919876543210");
  });

  it("strips leading 0 trunk code and prepends 91", () => {
    expect(normalizeWaPhone("09876543210")).toBe("919876543210");
  });

  it("preserves international numbers with country code", () => {
    expect(normalizeWaPhone("+919876543210")).toBe("919876543210");
    expect(normalizeWaPhone("+14155552671")).toBe("14155552671");
  });

  it("returns null for invalid inputs", () => {
    expect(normalizeWaPhone("123")).toBeNull();
    expect(normalizeWaPhone("abcdefghij")).toBeNull();
  });
});

function getIstDateString(offsetDays = 0): string {
  const istTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const [y, m, d] = istTodayStr.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return target.toISOString().split("T")[0];
}

describe("reminderMessage", () => {
  const mockDetail: PersonDetail = {
    id: "uuid-1",
    name: "Mohan Lal",
    phone: "9876543210",
    gaveTotal: "1500",
    receivedTotal: "500",
    balance: "1000",
    entries: [],
  };

  it("generates Hinglish payment reminder with formatted totals", () => {
    const msg = reminderMessage(mockDetail);
    expect(msg).toContain("Namaste Mohan Lal ji");
    expect(msg).toContain("Aapke khate mein");
    expect(msg).toContain("baaki hai");
  });

  it("includes overdue notice when an active debt is overdue", () => {
    const pastDueDate = getIstDateString(-5);
    const overdueDetail: PersonDetail = {
      ...mockDetail,
      entries: [
        {
          id: "e-overdue",
          type: "GAVE",
          amount: "1000",
          note: "Loan",
          dueDate: pastDueDate,
          createdAt: `${pastDueDate}T10:00:00.000Z`,
          running: "1000",
        },
      ],
    };
    const msg = reminderMessage(overdueDetail);
    expect(msg).toContain("Wada tha:");
    expect(msg).toContain("Overdue by 5 days");
  });

  it("does not include overdue notice if overdue debt was fully covered by repayments", () => {
    const pastDueDate = getIstDateString(-5);
    const futureDueDate = getIstDateString(5);
    const coveredDetail: PersonDetail = {
      id: "uuid-2",
      name: "Suresh Gupta",
      phone: "9876543210",
      gaveTotal: "2000",
      receivedTotal: "1000",
      balance: "1000",
      entries: [
        {
          id: "e1",
          type: "GAVE",
          amount: "1000",
          note: "Old loan",
          dueDate: pastDueDate,
          createdAt: `${pastDueDate}T10:00:00.000Z`,
          running: "1000",
        },
        {
          id: "e2",
          type: "RECEIVED",
          amount: "1000",
          note: "Repayment",
          createdAt: `${pastDueDate}T12:00:00.000Z`,
          running: "0",
        },
        {
          id: "e3",
          type: "GAVE",
          amount: "1000",
          note: "New loan",
          dueDate: futureDueDate,
          createdAt: `${futureDueDate}T10:00:00.000Z`,
          running: "1000",
        },
      ],
    };
    const msg = reminderMessage(coveredDetail);
    expect(msg).not.toContain("Wada tha:");
  });

  it("picks the oldest un-repaid loan when prior overdue loan is covered by repayment", () => {
    const olderDate = getIstDateString(-10);
    const newerDate = getIstDateString(-3);
    const multiOverdueDetail: PersonDetail = {
      id: "uuid-3",
      name: "Rajesh Kumar",
      phone: "9876543210",
      gaveTotal: "1500",
      receivedTotal: "500",
      balance: "1000",
      entries: [
        {
          id: "e1",
          type: "GAVE",
          amount: "500",
          note: "Loan 1",
          dueDate: olderDate,
          createdAt: `${olderDate}T10:00:00.000Z`,
          running: "500",
        },
        {
          id: "e2",
          type: "GAVE",
          amount: "1000",
          note: "Loan 2",
          dueDate: newerDate,
          createdAt: `${newerDate}T10:00:00.000Z`,
          running: "1500",
        },
      ],
    };
    const msg = reminderMessage(multiOverdueDetail);
    expect(msg).toContain("Wada tha:");
    expect(msg).toContain("Overdue by 3 days");
    expect(msg).not.toContain("Overdue by 10 days");
  });
});

describe("formatStatementMessage", () => {
  const mockDetail: PersonDetail = {
    id: "uuid-1",
    name: "Mohan Lal",
    phone: "9876543210",
    gaveTotal: "1500",
    receivedTotal: "500",
    balance: "1000",
    entries: [
      {
        id: "e1",
        type: "GAVE",
        amount: "1500",
        note: "Supplies",
        createdAt: new Date().toISOString(),
        running: "1500",
      },
      {
        id: "e2",
        type: "RECEIVED",
        amount: "500",
        note: "Cash return",
        createdAt: new Date().toISOString(),
        running: "1000",
      },
    ],
  };

  it("includes header, current balance, and transaction history", () => {
    const statement = formatStatementMessage(mockDetail);
    expect(statement).toContain("Ledger Statement: Mohan Lal");
    expect(statement).toContain("Current Balance:");
    expect(statement).toContain("Total Given:");
    expect(statement).toContain("Udhar");
    expect(statement).toContain("Received");
    expect(statement).toContain("Supplies");
  });

  it("respects limit parameter and appends earlier transactions count", () => {
    const statement = formatStatementMessage(mockDetail, 1);
    expect(statement).toContain("and 1 earlier transactions");
  });
});

describe("waLink and universalWaLink", () => {
  it("formats direct click-to-chat URL", () => {
    const url = waLink("919876543210", "Hello");
    expect(url).toBe("https://wa.me/919876543210?text=Hello");
  });

  it("delegates waLink to universalWaLink", () => {
    expect(waLink("919876543210", "Hello world")).toBe(
      universalWaLink("Hello world", "919876543210")
    );
  });

  it("formats universal link with or without phone", () => {
    expect(universalWaLink("Hello", "919876543210")).toBe("https://wa.me/919876543210?text=Hello");
    expect(universalWaLink("Hello", null)).toBe("https://api.whatsapp.com/send?text=Hello");
  });
});
