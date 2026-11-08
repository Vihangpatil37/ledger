import "server-only";

import { MongoClient, type Collection } from "mongodb";
import { MONGODB_DB, getMongoUri } from "@/server/env";
import type { EntryType } from "@/lib/types";

export type UserDoc = {
  _id: string;
  /** Stored lowercase; unique index enforced by setup script. */
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type PersonDoc = {
  _id: string;
  ownerId: string;
  name: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EntryDoc = {
  _id: string;
  ownerId: string;
  personId: string;
  type: EntryType;
  /** Rupees × 100 as an exact integer (replaces numeric(12,2)). */
  amountCents: number;
  note: string | null;
  dueDate?: Date | null;
  createdAt: Date;
};

declare global {
  var __ledgerMongo: MongoClient | undefined;
}

/** One MongoClient per process, safe across dev-server hot reloads. */
function getClient(): MongoClient {
  globalThis.__ledgerMongo ??= new MongoClient(getMongoUri(), {
    appName: "ledger",
    serverSelectionTimeoutMS: 8_000,
    tls: true,
    connectTimeoutMS: 10_000,
  });
  return globalThis.__ledgerMongo;
}

export function db() {
  return getClient().db(MONGODB_DB);
}

export function usersCol(): Collection<UserDoc> {
  return db().collection<UserDoc>("users");
}

export function peopleCol(): Collection<PersonDoc> {
  return db().collection<PersonDoc>("people");
}

export function entriesCol(): Collection<EntryDoc> {
  return db().collection<EntryDoc>("entries");
}

