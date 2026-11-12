import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { hashSync } from "bcryptjs";

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key] === undefined) {
        process.env[key] = raw.replace(/^["']|["']$/g, "").trim();
      }
    }
  }
}

loadEnvFiles();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "ledger";

if (!uri) {
  console.error("MONGODB_URI is missing in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 15_000,
  tls: true,
  connectTimeoutMS: 10_000,
});

try {
  await client.connect();
  const db = client.db(dbName);
  console.log(`Connected to database "${dbName}"`);

  // 1. Get or create primary owner
  let user = await db.collection("users").findOne();
  if (!user) {
    const newUserId = randomUUID();
    user = {
      _id: newUserId,
      email: "you@example.com",
      passwordHash: hashSync("password123", 10),
      createdAt: new Date(),
    };
    await db.collection("users").insertOne(user);
    console.log(`Created default owner account: you@example.com / password123`);
  } else {
    console.log(`Seeding data for owner: ${user.email} (${user._id})`);
  }

  const ownerId = user._id;

  // 2. Clear existing sample data for this owner (optional safety check)
  console.log(`Removing any existing people and entries for owner ${ownerId}...`);
  await Promise.all([
    db.collection("people").deleteMany({ ownerId }),
    db.collection("entries").deleteMany({ ownerId }),
  ]);

  const now = new Date();
  const daysAgo = (days) => new Date(now.getTime() - days * 86400000);
  const daysFromNow = (days) => new Date(now.getTime() + days * 86400000);

  // 3. Define contacts
  const contacts = [
    {
      name: "Rajesh Sharma",
      phone: "+91 98765 43210",
      transactions: [
        { type: "GAVE", amountCents: 500000, note: "Emergency medical loan", daysAgo: 14, dueDate: daysAgo(4) },
        { type: "RECEIVED", amountCents: 200000, note: "Partial repayment via GPay", daysAgo: 6 },
      ],
    },
    {
      name: "Vikram Mehta",
      phone: "+91 98111 22334",
      transactions: [
        { type: "GAVE", amountCents: 1250000, note: "Shared MacBook split payment", daysAgo: 8, dueDate: daysFromNow(3) },
      ],
    },
    {
      name: "Pooja Verma",
      phone: "+91 98222 33445",
      transactions: [
        { type: "GAVE", amountCents: 120000, note: "Team cafe & snacks bill", daysAgo: 3 },
      ],
    },
    {
      name: "Amitabh Joshi",
      phone: "+91 98333 44556",
      transactions: [
        { type: "GAVE", amountCents: 450000, note: "Diwali sweets & gift advance", daysAgo: 20, dueDate: daysAgo(2) },
        { type: "RECEIVED", amountCents: 150000, note: "Cash return", daysAgo: 10 },
      ],
    },
    {
      name: "Deepak Soni",
      phone: "+91 98444 55667",
      transactions: [
        { type: "GAVE", amountCents: 85000, note: "Petrol & highway toll split", daysAgo: 2, dueDate: daysFromNow(1) },
      ],
    },
    {
      name: "Sunita Patel",
      phone: "+91 98555 66778",
      transactions: [
        { type: "RECEIVED", amountCents: 400000, note: "Borrowed for flat maintenance", daysAgo: 12 },
      ],
    },
    {
      name: "Karan Malhotra",
      phone: "+91 98666 77889",
      transactions: [
        { type: "RECEIVED", amountCents: 150000, note: "Concert tickets advance from Karan", daysAgo: 5 },
      ],
    },
    {
      name: "Neha Gupta",
      phone: "+91 98777 88990",
      transactions: [
        { type: "GAVE", amountCents: 250000, note: "College book store split", daysAgo: 25 },
        { type: "RECEIVED", amountCents: 250000, note: "Full settlement via PhonePe", daysAgo: 7 },
      ],
    },
    {
      name: "Ankit Tiwari",
      phone: null,
      transactions: [
        { type: "GAVE", amountCents: 75000, note: "Movie snacks", daysAgo: 18 },
        { type: "RECEIVED", amountCents: 75000, note: "Settled in cash", daysAgo: 15 },
      ],
    },
  ];

  let totalEntriesCount = 0;

  for (const c of contacts) {
    const personId = randomUUID();
    const createdDate = daysAgo(25);

    await db.collection("people").insertOne({
      _id: personId,
      ownerId,
      name: c.name,
      phone: c.phone,
      createdAt: createdDate,
      updatedAt: now,
    });

    for (const t of c.transactions) {
      await db.collection("entries").insertOne({
        _id: randomUUID(),
        ownerId,
        personId,
        type: t.type,
        amountCents: t.amountCents,
        note: t.note,
        dueDate: t.dueDate ?? null,
        createdAt: daysAgo(t.daysAgo),
      });
      totalEntriesCount += 1;
    }
  }

  console.log(`\nSuccessfully seeded:`);
  console.log(`- ${contacts.length} Contacts (5 Debtors, 2 Creditors, 2 Settled)`);
  console.log(`- ${totalEntriesCount} Ledger Entries with realistic dates, notes, and due dates`);
  console.log(`\nSample Login:`);
  console.log(`Email:    ${user.email}`);
  console.log(`Password: (existing password or password123)\n`);
} finally {
  await client.close();
}
