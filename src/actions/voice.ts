"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import { decimalStringToPaise } from "@/lib/money";
import { entriesCol, mongoClient, peopleCol, promisesCol } from "@/lib/mongo";
import { getSession } from "@/server/session";
import { activeFilter } from "@/lib/trash";
import type { ActionState, EntryType } from "@/lib/types";
import {
  parseVoiceTranscript,
  matchCustomerInDatabase,
  type VoiceParsedIntent,
} from "@/lib/voice-parser";

export type MatchedCustomer = {
  id: string;
  name: string;
  phone: string | null;
};

export type CandidateCustomerMatch = {
  id: string;
  name: string;
  phone: string | null;
  score: number;
};

export type VoiceMatchProposal = {
  parsed: VoiceParsedIntent;
  matchedPerson: MatchedCustomer | null;
  candidateMatches: CandidateCustomerMatch[];
  allCustomers: MatchedCustomer[];
  isNewPerson: false;
};

export type ParseVoiceResponse =
  | { ok: true; proposal: VoiceMatchProposal }
  | { ok: false; error: string };

const HOME = "/";

/**
 * Parses a voice transcript into transaction intent and matches customer candidates
 * strictly against the signed-in user's active khata records.
 */
export async function parseVoiceEntry(
  transcript: string
): Promise<ParseVoiceResponse> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Please sign in again." };
  }

  const raw = transcript?.trim();
  if (!raw) {
    return { ok: false, error: "Empty voice transcript." };
  }

  const parsed = parseVoiceTranscript(raw);

  let matchedPerson: MatchedCustomer | null = null;
  let candidateMatches: CandidateCustomerMatch[] = [];
  let allCustomers: MatchedCustomer[] = [];

  try {
    const activePeople = await peopleCol()
      .find(
        { ownerId: session.userId, ...activeFilter() },
        { projection: { _id: 1, name: 1, phone: 1 } }
      )
      .sort({ name: 1 })
      .toArray();

    allCustomers = activePeople.map((p) => ({
      id: p._id,
      name: p.name,
      phone: p.phone ?? null,
    }));

    const result = matchCustomerInDatabase(raw, parsed.personName, allCustomers);
    matchedPerson = result.matchedPerson;
    candidateMatches = result.candidates;
  } catch {
    // If DB read fails, return empty customer array
  }

  return {
    ok: true,
    proposal: {
      parsed,
      matchedPerson,
      candidateMatches,
      allCustomers,
      isNewPerson: false,
    },
  };
}

/**
 * Convenience server action to confirm a voice transaction proposal in 1 tap.
 * Strict rule: Voice entries can ONLY be recorded for existing customers in the khata.
 */
export async function confirmVoiceEntry(data: {
  personId?: string;
  type: EntryType;
  amount: number | string;
  note?: string | null;
  dueDate?: string | null;
}): Promise<ActionState & { personId?: string }> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const owner = session.userId;

  const targetPersonId = data.personId?.trim();
  if (!targetPersonId) {
    return {
      error:
        "Voice entry is only allowed for existing customers. Please select an existing customer.",
    };
  }

  try {
    const existing = await peopleCol().findOne(
      { _id: targetPersonId, ownerId: owner, ...activeFilter() },
      { projection: { _id: 1 } }
    );
    if (!existing) {
      return {
        error:
          "Selected customer not found in your khata. Voice entries require an existing customer.",
      };
    }

    const amountStr = String(data.amount);
    const amountCents = decimalStringToPaise(amountStr);
    if (!amountCents || amountCents <= 0) {
      return { error: "Please provide a valid amount." };
    }

    const dueDateObj =
      data.type === "GAVE" && data.dueDate
        ? new Date(
            data.dueDate.includes("T")
              ? data.dueDate
              : `${data.dueDate}T00:00:00+05:30`
          )
        : null;

    const entryDoc = {
      _id: randomUUID(),
      ownerId: owner,
      personId: targetPersonId,
      type: data.type,
      amountCents,
      note: data.note?.trim() || null,
      dueDate: dueDateObj && !isNaN(dueDateObj.getTime()) ? dueDateObj : null,
      createdBy: { role: "OWNER" as const },
      createdAt: new Date(),
    };

    let session: ClientSession | undefined;
    try {
      session = mongoClient().startSession();
      await session.withTransaction(async () => {
        await entriesCol().insertOne(entryDoc, { session });

        if (data.type === "RECEIVED") {
          await promisesCol().updateMany(
            { personId: targetPersonId, ownerId: owner, status: "PENDING" },
            { $set: { status: "KEPT", resolvedAt: new Date() } },
            { session }
          );
          await peopleCol().updateOne(
            { _id: targetPersonId, ownerId: owner },
            { $set: { promiseDate: null, promiseNote: null } },
            { session }
          );
        }
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }

    revalidatePath(HOME);
    revalidatePath(`/people/${targetPersonId}`);

    return { ok: true, personId: targetPersonId };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to record voice entry.";
    return { error: msg };
  }
}
