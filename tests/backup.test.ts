import { describe, expect, it } from "vitest";
import { parseCsvKhata, validateBackupPayload } from "@/lib/backup";

describe("JSON Backup Validation", () => {
  it("accepts valid backup payload schema", () => {
    const valid = {
      version: "chai_ledger_backup_v2",
      exportedAt: new Date().toISOString(),
      owner: {
        email: "shop@example.com",
        upiId: "shop@upi",
        upiName: "Chai Shop",
      },
      people: [
        {
          id: "p-1",
          name: "Ramesh Kumar",
          phone: "9876543210",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      entries: [
        {
          id: "e-1",
          personId: "p-1",
          type: "GAVE",
          amountCents: 15000,
          note: "Morning chai",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const res = validateBackupPayload(valid);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.people.length).toBe(1);
    }
  });

  it("rejects invalid payload or version mismatch", () => {
    expect(validateBackupPayload(null).ok).toBe(false);
    expect(validateBackupPayload({ version: "v1_unknown" }).ok).toBe(false);
    expect(validateBackupPayload({ version: "chai_ledger_backup_v2", people: "not an array" }).ok).toBe(false);
  });
});

describe("CSV Khata Importer", () => {
  const existingPeople = [
    { id: "p-100", name: "Suresh Sharma", phone: "9876543210" },
  ];

  it("parses valid CSV with English headers and matches existing contact", () => {
    const csv = `Name,Phone,Type,Amount,Note,DueDate
Suresh Sharma,9876543210,GAVE,250.50,Grocery bill,2026-04-10
Anita Verma,9123456780,Udhar,500,Milk supply,2026-04-15
Anita Verma,9123456780,Jama,200,Partial cash,`;

    const preview = parseCsvKhata(csv, existingPeople);
    expect(preview.totalRows).toBe(3);
    expect(preview.validCount).toBe(3);
    expect(preview.errorCount).toBe(0);
    expect(preview.existingPeopleCount).toBe(1); // Suresh matched
    expect(preview.newPeopleCount).toBe(1); // Anita is new
    expect(preview.rows[0].isExistingPerson).toBe(true);
    expect(preview.rows[0].type).toBe("GAVE");
    expect(preview.rows[0].amount).toBe("250.50");
    expect(preview.rows[1].type).toBe("GAVE"); // Udhar -> GAVE
    expect(preview.rows[2].type).toBe("RECEIVED"); // Jama -> RECEIVED
  });

  it("flags invalid lines with descriptive errors", () => {
    const csv = `Name,Phone,Type,Amount,Note
,9876543210,GAVE,100,Missing name
Valid Person,,INVALID_TYPE,100,Bad type
Valid Person,,GAVE,-50,Negative amount
Valid Person,,GAVE,not_a_number,Not a number`;

    const preview = parseCsvKhata(csv, []);
    expect(preview.totalRows).toBe(4);
    expect(preview.validCount).toBe(0);
    expect(preview.errorCount).toBe(4);
    expect(preview.rows[0].status).toBe("ERROR");
    expect(preview.rows[0].error).toContain("Name is required");
    expect(preview.rows[1].status).toBe("ERROR");
    expect(preview.rows[1].error).toContain("Invalid entry type");
    expect(preview.rows[2].status).toBe("ERROR");
    expect(preview.rows[3].status).toBe("ERROR");
  });

  it("sanitizes CSV formula injection in note column", () => {
    const csv = `Name,Type,Amount,Note
Malicious User,GAVE,100,=cmd|' /C calc'!A0`;

    const preview = parseCsvKhata(csv, []);
    expect(preview.validCount).toBe(1);
    expect(preview.rows[0].note).toBe("'=cmd|' /C calc'!A0");
  });
});
