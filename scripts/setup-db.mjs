/**
 * One-time setup against MongoDB Atlas:
 *
 *   node scripts/setup-db.mjs <email> <password>
 *
 * Creates the indexes the app relies on and seeds the first owner
 * account (the app itself has no sign-up flow by design). Reads
 * MONGODB_URI / MONGODB_DB from .env.local or .env.
 */
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { hashSync } from "bcryptjs";

/** Minimal .env loader — plain `node` does not read .env files. */
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

const [emailArg, passwordArg] = process.argv.slice(2);

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing — add your Atlas connection string to .env.local:");
  console.error("  MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/");
  process.exit(1);
}

const email = emailArg?.trim().toLowerCase() ?? "";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: node scripts/setup-db.mjs <email> <password>");
  process.exit(1);
}
if (!passwordArg || passwordArg.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 15_000,
  tls: true,
  connectTimeoutMS: 10_000,
});

try {
  await client.connect();
  const database = client.db(process.env.MONGODB_DB || "ledger");

  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("people").createIndex({ ownerId: 1, name: 1 }),
    database
      .collection("entries")
      .createIndex({ personId: 1, createdAt: 1, _id: 1 }),
    database
      .collection("entries")
      .createIndex({ ownerId: 1, createdAt: -1 }),
    database
      .collection("entries")
      .createIndex({ ownerId: 1, type: 1, dueDate: 1 }),
  ]);
  console.log(`Indexes ensured on db "${database.databaseName}".`);

  const users = database.collection("users");
  const existing = await users.findOne({ email });
  if (existing) {
    console.log(`User ${email} already exists — nothing to seed.`);
  } else {
    await users.insertOne({
      _id: randomUUID(),
      email,
      passwordHash: hashSync(passwordArg, 10),
      createdAt: new Date(),
    });
    console.log(`Created user ${email}.`);
  }
} finally {
  await client.close();
}
