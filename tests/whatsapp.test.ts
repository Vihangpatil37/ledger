import { describe, it, expect } from "vitest";
import {
  normalizeWaPhone,
  reminderMessage,
  formatStatementMessage,
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
    expect(msg).toContain("📋 *Khata Reminder*");
    expect(msg).toContain("Namaste *Mohan Lal* ji,");
    expect(msg).toContain("Aapke khate ka taaza hisab:");
    expect(msg).toContain("💰 *Baaki Udhar:* *₹1,000.00*");
    expect(msg).toContain("📊 Kul Udhar: ₹1,500.00 | Kul Jama: ₹500.00");
    expect(msg).toContain("Kripya baaki rashi ka bhugtan samay par karein aur khata update rakhein.");
    expect(msg).toContain("Dhanyawad!");
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
    expect(msg).toContain("⚠️ *Overdue:*");
    expect(msg).toContain(`${pastDueDate} tak wada tha`);
    expect(msg).toContain("Overdue by 5 days");
  });

  it("includes UPI ID line and owner name when owner has a configured UPI ID and balance is positive", () => {
    const detailWithUpi: PersonDetail = {
      ...mockDetail,
      ownerUpi: {
        upiId: "mybusiness@upi",
        upiName: "My Business",
      },
    };
    const msg = reminderMessage(detailWithUpi);
    expect(msg).toContain("📋 *Khata Reminder* · My Business");
    expect(msg).toContain("💳 *Online Payment ke liye:*");
    expect(msg).toContain("UPI ID: *mybusiness@upi*");
    expect(msg).toContain("Naam: My Business");
    expect(msg).toContain("Google Pay, PhonePe, Paytm ya kisi bhi UPI app se pay kar sakte hain");
    expect(msg).toContain("— *My Business*");
  });

  it("omits UPI ID block when owner has no UPI ID or balance is negative", () => {
    const msgWithoutUpi = reminderMessage(mockDetail);
    expect(msgWithoutUpi).not.toContain("UPI ID:");
    expect(msgWithoutUpi).not.toContain("Online Payment ke liye");

    const negativeDetail: PersonDetail = {
      ...mockDetail,
      balance: "-500",
      ownerUpi: { upiId: "mybusiness@upi", upiName: "My Business" },
    };
    expect(reminderMessage(negativeDetail)).not.toContain("UPI ID:");
  });

  it("handles owner with only shop name but no UPI ID cleanly", () => {
    const detailWithNameOnly: PersonDetail = {
      ...mockDetail,
      ownerUpi: {
        upiId: "",
        upiName: "Corner Chai Shop",
      },
    };
    const msg = reminderMessage(detailWithNameOnly);
    expect(msg).toContain("📋 *Khata Reminder* · Corner Chai Shop");
    expect(msg).toContain("— *Corner Chai Shop*");
    expect(msg).not.toContain("Online Payment ke liye");
    expect(msg).not.toContain("UPI ID:");
  });

  it("trims whitespace from customer name, UPI ID, and shop name", () => {
    const paddedDetail: PersonDetail = {
      ...mockDetail,
      name: "   Ramesh Shah   ",
      ownerUpi: {
        upiId: "   ramesh@okhdfcbank   ",
        upiName: "   Ramesh Store   ",
      },
    };
    const msg = reminderMessage(paddedDetail);
    expect(msg).toContain("Namaste *Ramesh Shah* ji,");
    expect(msg).toContain("📋 *Khata Reminder* · Ramesh Store");
    expect(msg).toContain("UPI ID: *ramesh@okhdfcbank*");
    expect(msg).toContain("Naam: Ramesh Store");
    expect(msg).toContain("— *Ramesh Store*");
    expect(msg).not.toContain("   ");
  });

  it("treats whitespace-only owner configs as absent", () => {
    const whitespaceDetail: PersonDetail = {
      ...mockDetail,
      ownerUpi: {
        upiId: "   ",
        upiName: "   ",
      },
    };
    const msg = reminderMessage(whitespaceDetail);
    expect(msg).toContain("📋 *Khata Reminder*");
    expect(msg).not.toContain("·");
    expect(msg).not.toContain("Online Payment ke liye");
    expect(msg).not.toContain("UPI ID:");
    expect(msg).not.toContain("— *");
  });

  it("contains no broken Unicode replacement characters or malformed UTF-8", () => {
    const msg = reminderMessage(mockDetail);
    expect(msg).not.toContain("\uFFFD");
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
    expect(msg).not.toContain("*Overdue:*");
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
    expect(msg).toContain("⚠️ *Overdue:*");
    expect(msg).toContain(`${newerDate} tak wada tha`);
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

  it("includes header, current balance, and transaction history in Hinglish", () => {
    const statement = formatStatementMessage(mockDetail);
    expect(statement).toContain("📒 *Khata Statement: Mohan Lal*");
    expect(statement).toContain("Tarikh:");
    expect(statement).toContain("💰 *Net Balance:* *₹1,000.00* (Baaki Udhar (Lene baaki))");
    expect(statement).toContain("📊 Kul Udhar: ₹1,500.00 | Kul Jama: ₹500.00");
    expect(statement).toContain("📋 *Pichhle Vyavahar (Transaction History):*");
    expect(statement).toContain("Udhar ₹1,500.00 - Supplies");
    expect(statement).toContain("Jama ₹500.00 - Cash return");
    expect(statement).toContain("_Shared via Chai Ledger_");
  });

  it("formats advance deposit status when balance is negative", () => {
    const negativeDetail: PersonDetail = {
      ...mockDetail,
      balance: "-500",
      gaveTotal: "1000",
      receivedTotal: "1500",
    };
    const statement = formatStatementMessage(negativeDetail);
    expect(statement).toContain("💰 *Net Balance:* *₹500.00* (Advance Deposit (Jama rashi))");
  });

  it("formats settled status when balance is zero", () => {
    const settledDetail: PersonDetail = {
      ...mockDetail,
      balance: "0",
      gaveTotal: "1000",
      receivedTotal: "1000",
    };
    const statement = formatStatementMessage(settledDetail);
    expect(statement).toContain("💰 *Net Balance:* *₹0.00* (Chukte (Settled))");
  });

  it("includes owner shop name and UPI payment footer when present", () => {
    const detailWithOwner: PersonDetail = {
      ...mockDetail,
      ownerUpi: {
        upiId: "chaishop@okhdfcbank",
        upiName: "Chai Corner",
      },
    };
    const statement = formatStatementMessage(detailWithOwner);
    expect(statement).toContain("Dukan / Malik: Chai Corner");
    expect(statement).toContain("💳 *UPI ID:* chaishop@okhdfcbank (Chai Corner)");
  });

  it("respects limit parameter and appends earlier transactions count in Hinglish", () => {
    const statement = formatStatementMessage(mockDetail, 1);
    expect(statement).toContain("... aur 1 pichhle vyavahar");
  });

  it("includes opening balance when present", () => {
    const detailWithOpening: PersonDetail = {
      ...mockDetail,
      openingBalance: "250.00",
    };
    const statement = formatStatementMessage(detailWithOpening);
    expect(statement).toContain("Opening Balance: ₹250.00 (Pichhla Baaki)");
  });

  it("handles empty transactions list with Hinglish message", () => {
    const emptyDetail: PersonDetail = {
      ...mockDetail,
      entries: [],
    };
    const statement = formatStatementMessage(emptyDetail);
    expect(statement).toContain("(Koi vyavahar darj nahi hai)");
  });

  it("formats transactions with due dates as [Due: YYYY-MM-DD]", () => {
    const detailWithDue: PersonDetail = {
      ...mockDetail,
      entries: [
        {
          id: "e-due",
          type: "GAVE",
          amount: "800",
          note: "Weekly groceries",
          dueDate: "2026-11-25",
          createdAt: "2026-11-15T10:00:00.000Z",
          running: "800",
        },
      ],
    };
    const statement = formatStatementMessage(detailWithDue);
    expect(statement).toContain("Udhar ₹800.00 - Weekly groceries [Due: 2026-11-25]");
  });

  it("trims whitespace from customer name and shop details in statements", () => {
    const paddedDetail: PersonDetail = {
      ...mockDetail,
      name: "   Pooja Sharma   ",
      ownerUpi: {
        upiId: "   pooja@okaxis   ",
        upiName: "   Pooja General Store   ",
      },
    };
    const statement = formatStatementMessage(paddedDetail);
    expect(statement).toContain("📒 *Khata Statement: Pooja Sharma*");
    expect(statement).toContain("Dukan / Malik: Pooja General Store");
    expect(statement).toContain("💳 *UPI ID:* pooja@okaxis (Pooja General Store)");
    expect(statement).not.toContain("   ");
  });

  it("contains no broken Unicode replacement characters in statement", () => {
    const statement = formatStatementMessage(mockDetail);
    expect(statement).not.toContain("\uFFFD");
  });
});

describe("universalWaLink", () => {
  it("formats direct click-to-chat URL with normalized phone", () => {
    const url = universalWaLink("Hello", "919876543210");
    expect(url).toBe("https://wa.me/919876543210?text=Hello");
  });

  it("formats universal link with or without phone", () => {
    expect(universalWaLink("Hello", "919876543210")).toBe("https://wa.me/919876543210?text=Hello");
    expect(universalWaLink("Hello", null)).toBe("https://api.whatsapp.com/send?text=Hello");
  });
});
