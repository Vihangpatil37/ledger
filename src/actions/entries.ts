"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import { decimalStringToPaise } from "@/lib/money";
import { entriesCol, mongoClient, peopleCol, promisesCol } from "@/lib/mongo";
import { getSession } from "@/server/session";
import type { ActionState } from "@/lib/types";
import {
  editEntrySchema,
  entrySchema,
  fieldErrorsOf,
  idSchema,
} from "@/lib/validation";

export async function addEntry(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const owner = session.userId;

  const parsed = entrySchema.safeParse({
    personId: formData.get("personId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    note: formData.get("note"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let ownsPerson: { _id: string } | null = null;
  try {
    // The old DB trigger kept entries tied to a person of the same
    // owner; this check replaces it (defense in depth on top of the
    // ownerId filter every query already carries).
    ownsPerson = await peopleCol().findOne(
      { _id: parsed.data.personId, ownerId: owner },
      { projection: { _id: 1 } }
    );
  } catch {
    return { error: "Could not save entry. Try again." };
  }
  if (!ownsPerson) return { error: "Person not found." };

  try {
    const dueDate =
      parsed.data.type === "GAVE" && parsed.data.dueDate
        ? new Date(`${parsed.data.dueDate}T00:00:00+05:30`)
        : null;

    const createdBy = { role: "OWNER" as const };

    const entryDoc = {
      _id: randomUUID(),
      ownerId: owner,
      personId: parsed.data.personId,
      type: parsed.data.type,
      amountCents: decimalStringToPaise(parsed.data.amount),
      note: parsed.data.note ?? null,
      dueDate,
      createdBy,
      createdAt: new Date(),
    };

    let session: ClientSession | undefined;
    try {
      session = mongoClient().startSession();
      await session.withTransaction(async () => {
        await entriesCol().insertOne(entryDoc, { session });

        // When payment is received, mark pending promise to pay as KEPT and clear customer card
        if (parsed.data.type === "RECEIVED") {
          await promisesCol().updateMany(
            { personId: parsed.data.personId, ownerId: owner, status: "PENDING" },
            { $set: { status: "KEPT", resolvedAt: new Date() } },
            { session }
          );
          await peopleCol().updateOne(
            { _id: parsed.data.personId, ownerId: owner },
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
  } catch {
    return { error: "Could not save entry. Try again." };
  }

  revalidatePath("/");
  revalidatePath(`/people/${parsed.data.personId}`);
  return { ok: true };
}

export async function editEntry(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const owner = session.userId;

  const parsed = editEntrySchema.safeParse({
    id: formData.get("id"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    note: formData.get("note"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let existing: {
    _id: string;
    personId: string;
    createdAt: Date;
  } | null = null;
  try {
    existing = await entriesCol().findOne(
      { _id: parsed.data.id, ownerId: owner },
      { projection: { _id: 1, personId: 1, createdAt: 1 } }
    );
  } catch {
    return { error: "Could not find entry. Try again." };
  }
  if (!existing) return { error: "Entry not found." };

  try {
    const dueDate =
      parsed.data.type === "GAVE" && parsed.data.dueDate
        ? new Date(`${parsed.data.dueDate}T00:00:00+05:30`)
        : null;

    await entriesCol().updateOne(
      { _id: parsed.data.id, ownerId: owner },
      {
        $set: {
          type: parsed.data.type,
          amountCents: decimalStringToPaise(parsed.data.amount),
          note: parsed.data.note ?? null,
          dueDate,
          editedAt: new Date(),
        },
      }
    );
  } catch {
    return { error: "Could not update entry. Try again." };
  }

  revalidatePath("/");
  revalidatePath(`/people/${existing.personId}`);
  return { ok: true };
}

/** Used directly as a form action; stays on the person page. */
export async function deleteEntry(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const owner = session.userId;

  const entryId = idSchema.safeParse(formData.get("entryId"));
  const personId = idSchema.safeParse(formData.get("personId"));
  if (!entryId.success || !personId.success) {
    return;
  }

  try {
    await entriesCol().updateOne(
      { _id: entryId.data, ownerId: owner },
      { $set: { deletedAt: new Date() } }
    );
  } catch (err) {
    console.error("Failed to delete entry:", err);
    return;
  }

  revalidatePath("/");
  revalidatePath(`/people/${personId.data}`);
}
