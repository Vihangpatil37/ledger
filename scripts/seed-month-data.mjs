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
      email: "bajrangtea80@gmail.com",
      passwordHash: hashSync("password123", 10),
      upiId: "vihangpatil37@okhdfcbank",
      createdAt: new Date(),
    };
    await db.collection("users").insertOne(user);
    console.log(`Created default owner account: ${user.email} / password123`);
  } else {
    console.log(`Seeding data for owner: ${user.email} (${user._id})`);
  }

  const ownerId = user._id;

  // 2. Clear existing records for this owner to ensure a clean, consistent 30-day dataset
  console.log(`Clearing existing people and entries for owner ${ownerId}...`);
  await Promise.all([
    db.collection("people").deleteMany({ ownerId }),
    db.collection("entries").deleteMany({ ownerId }),
  ]);

  const now = new Date();
  
  // Helper for generating timestamps relative to today
  function daysAgo(days, hour = 14, min = 15) {
    const d = new Date(now.getTime() - days * 86400000);
    d.setHours(hour, min, 0, 0);
    return d;
  }

  function daysFromNow(days, hour = 18, min = 0) {
    const d = new Date(now.getTime() + days * 86400000);
    d.setHours(hour, min, 0, 0);
    return d;
  }

  // 3. Define 12 diverse contacts across Debtors, Creditors, and Settled contacts
  // Spanning over the past 30 days (1 full month of activity)
  const contacts = [
    // --- DEBTORS (You'll Get / Udhar) ---
    {
      name: "Dipali",
      phone: "+91 84017 08172",
      transactions: [
        {
          type: "GAVE",
          amountCents: 350000, // ₹3,500
          note: "Office event catering groceries & supplies",
          daysAgo: 26,
        },
        {
          type: "RECEIVED",
          amountCents: 150000, // ₹1,500
          note: "Partial repayment via GPay",
          daysAgo: 18,
        },
        {
          type: "GAVE",
          amountCents: 210000, // ₹2,100
          note: "Snacks & special tea order for staff",
          daysAgo: 5,
          dueDate: daysFromNow(6), // Due in 6 days
        },
      ],
    },
    {
      name: "Rajesh Sharma",
      phone: "+91 98765 43210",
      transactions: [
        {
          type: "GAVE",
          amountCents: 1500000, // ₹15,000
          note: "Emergency shop machinery loan",
          daysAgo: 28,
          dueDate: daysAgo(5), // OVERDUE by 5 days
        },
        {
          type: "RECEIVED",
          amountCents: 500000, // ₹5,000
          note: "Cash return at shop counter",
          daysAgo: 14,
        },
      ],
    },
    {
      name: "Vikram Mehta",
      phone: "+91 98111 22334",
      transactions: [
        {
          type: "GAVE",
          amountCents: 800000, // ₹8,000
          note: "Corporate Diwali gift hamper advance",
          daysAgo: 21,
        },
        {
          type: "RECEIVED",
          amountCents: 300000, // ₹3,000
          note: "Online IMPS bank transfer",
          daysAgo: 12,
        },
        {
          type: "GAVE",
          amountCents: 450000, // ₹4,500
          note: "Festival dry fruit boxes & packaging",
          daysAgo: 4,
          dueDate: daysFromNow(2), // Due in 2 days
        },
      ],
    },
    {
      name: "Pooja Verma",
      phone: "+91 98222 33445",
      transactions: [
        {
          type: "GAVE",
          amountCents: 240000, // ₹2,400
          note: "Weekly office tea & beverage subscription",
          daysAgo: 7,
          dueDate: daysAgo(0), // DUE TODAY
        },
      ],
    },
    {
      name: "Amitabh Joshi",
      phone: "+91 98333 44556",
      transactions: [
        {
          type: "GAVE",
          amountCents: 600000, // ₹6,000
          note: "Exhibition stall registration & stall tea setup",
          daysAgo: 23,
          dueDate: daysAgo(2), // OVERDUE by 2 days
        },
        {
          type: "RECEIVED",
          amountCents: 200000, // ₹2,000
          note: "GPay payment",
          daysAgo: 9,
        },
      ],
    },
    {
      name: "Deepak Soni",
      phone: "+91 98444 55667",
      transactions: [
        {
          type: "GAVE",
          amountCents: 185000, // ₹1,850
          note: "Delivery logistics & highway toll split",
          daysAgo: 3,
          dueDate: daysFromNow(1), // Due tomorrow
        },
      ],
    },
    {
      name: "Vihang",
      phone: "+91 81403 33295",
      transactions: [
        {
          type: "GAVE",
          amountCents: 500000, // ₹5,000
          note: "Hardware POS machine & receipt printer advance",
          daysAgo: 16,
        },
        {
          type: "RECEIVED",
          amountCents: 250000, // ₹2,500
          note: "UPI settlement to HDFC",
          daysAgo: 8,
        },
        {
          type: "GAVE",
          amountCents: 120000, // ₹1,200
          note: "Thermal billing rolls & stationeries",
          daysAgo: 1,
        },
      ],
    },

    // --- CREDITORS (You'll Give / Advance / Jama) ---
    {
      name: "Golden Tea Traders",
      phone: "+91 98251 12345",
      transactions: [
        {
          type: "RECEIVED",
          amountCents: 2500000, // ₹25,000
          note: "Advance payment received for bulk Assam CTC tea bags",
          daysAgo: 29,
        },
        {
          type: "GAVE",
          amountCents: 1500000, // ₹15,000
          note: "First batch delivery against advance (100kg dispatched)",
          daysAgo: 15,
        },
      ],
    },
    {
      name: "Dairy Fresh Supplies",
      phone: "+91 98250 99887",
      transactions: [
        {
          type: "RECEIVED",
          amountCents: 1200000, // ₹12,000
          note: "Monthly milk crate security deposit credit",
          daysAgo: 25,
        },
        {
          type: "GAVE",
          amountCents: 700000, // ₹7,000
          note: "Bimonthly milk supply settlement invoice #442",
          daysAgo: 10,
        },
      ],
    },
    {
      name: "Sunita Patel",
      phone: "+91 98555 66778",
      transactions: [
        {
          type: "RECEIVED",
          amountCents: 2000000, // ₹20,000
          note: "Short-term loan for café espresso machine repair",
          daysAgo: 30,
        },
        {
          type: "GAVE",
          amountCents: 1000000, // ₹10,000
          note: "Online bank transfer partial payback",
          daysAgo: 11,
        },
      ],
    },

    // --- SETTLED (Balanced / Zero Balance) ---
    {
      name: "Neha Gupta",
      phone: "+91 98777 88990",
      transactions: [
        {
          type: "GAVE",
          amountCents: 300000, // ₹3,000
          note: "College fest tea stall raw material cost",
          daysAgo: 27,
        },
        {
          type: "RECEIVED",
          amountCents: 300000, // ₹3,000
          note: "Full settlement via PhonePe",
          daysAgo: 13,
        },
      ],
    },
    {
      name: "Ankit Tiwari",
      phone: null,
      transactions: [
        {
          type: "GAVE",
          amountCents: 150000, // ₹1,500
          note: "Petty cash borrowed for change / retail coin shortage",
          daysAgo: 24,
        },
        {
          type: "RECEIVED",
          amountCents: 150000, // ₹1,500
          note: "Settled in full in cash",
          daysAgo: 17,
        },
      ],
    },
    {
      name: "Karan Malhotra",
      phone: "+91 98666 77889",
      transactions: [
        {
          type: "RECEIVED",
          amountCents: 450000, // ₹4,500
          note: "Advance booking for outdoor high-tea catering",
          daysAgo: 20,
        },
        {
          type: "GAVE",
          amountCents: 450000, // ₹4,500
          note: "Catering service delivered & final settlement",
          daysAgo: 2,
        },
      ],
    },
  ];

  let totalEntriesCount = 0;
  let totalDebtors = 0;
  let totalCreditors = 0;
  let totalSettled = 0;

  for (const c of contacts) {
    const personId = randomUUID();
    const earliestTxDaysAgo = Math.max(...c.transactions.map((t) => t.daysAgo));
    const createdDate = daysAgo(earliestTxDaysAgo, 10, 0);

    await db.collection("people").insertOne({
      _id: personId,
      ownerId,
      name: c.name,
      phone: c.phone,
      createdAt: createdDate,
      updatedAt: now,
    });

    let netBalanceCents = 0;

    for (const t of c.transactions) {
      if (t.type === "GAVE") netBalanceCents += t.amountCents;
      else netBalanceCents -= t.amountCents;

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

    if (netBalanceCents > 0) totalDebtors++;
    else if (netBalanceCents < 0) totalCreditors++;
    else totalSettled++;
  }

  console.log(`\n==========================================`);
  console.log(`Successfully seeded 1-Month Temporary Data!`);
  console.log(`==========================================`);
  console.log(`Owner:         ${user.email}`);
  console.log(`Contacts:      ${contacts.length} total (${totalDebtors} Debtors, ${totalCreditors} Creditors, ${totalSettled} Settled)`);
  console.log(`Entries:       ${totalEntriesCount} ledger transactions across 30 days`);
  console.log(`Date span:     30 days ago (${daysAgo(30).toDateString()}) to today (${now.toDateString()})`);
  console.log(`Due statuses:  Includes Overdue, Due Today, Due in X Days, and No Due Date`);
  console.log(`UPI ID:        ${user.upiId ?? "None set"}`);
  console.log(`==========================================\n`);
} finally {
  await client.close();
}
