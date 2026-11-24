"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import { mongoClient, peopleCol, promisesCol } from "@/lib/mongo";
import { getSession } from "@/server/session";
import type { ActionState } from "@/lib/types";
import { idSchema, isValidCalendarDate } from "@/lib/validation";

export async function recordReminder(personId: string): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const owner = session.userId;

  const parsedId = idSchema.safeParse(personId);
  if (!parsedId.success) return { error: "Invalid person ID." };

  try {
    await peopleCol().updateOne(
      { _id: parsedId.data, ownerId: owner },
      { $set: { lastRemindedAt: new Date() } }
    );
  } catch (err) {
    console.error("Failed to record reminder:", err);
    return { error: "Could not record reminder." };
  }

  revalidatePath("/");
  revalidatePath(`/people/${parsedId.data}`);
  return { ok: true };
}

export async function setPromiseToPay(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const owner = session.userId;

  const personId = idSchema.safeParse(formData.get("personId"));
  if (!personId.success) return { error: "Invalid person ID." };

  const rawDate = formData.get("promiseDate")?.toString().trim();
  if (!rawDate || !isValidCalendarDate(rawDate)) {
    return { error: "Valid calendar date (YYYY-MM-DD) is required." };
  }

  const rawNote = formData.get("note")?.toString().trim() || null;
  const promiseDate = new Date(`${rawDate}T00:00:00+05:30`);

  try {
    const person = await peopleCol().findOne({
      _id: personId.data,
      ownerId: owner,
    });
    if (!person) return { error: "Person not found." };

    let session: ClientSession | undefined;
    try {
      session = mongoClient().startSession();
      await session.withTransaction(async () => {
        // Update active promise on person
        await peopleCol().updateOne(
          { _id: personId.data, ownerId: owner },
          {
            $set: {
              promiseDate,
              promiseNote: rawNote,
            },
          },
          { session }
        );

        // Mark any earlier pending promises as rescheduled
        await promisesCol().updateMany(
          { personId: personId.data, ownerId: owner, status: "PENDING" },
          { $set: { status: "RESCHEDULED", resolvedAt: new Date() } },
          { session }
        );

        // Audit log in promises collection
        await promisesCol().insertOne(
          {
            _id: randomUUID(),
            ownerId: owner,
            personId: personId.data,
            promiseDate,
            note: rawNote,
            status: "PENDING",
            createdAt: new Date(),
          },
          { session }
        );
      });
    } finally {
      if (session) await session.endSession();
    }
  } catch (err) {
    console.error("Failed to set promise to pay:", err);
    return { error: "Could not save promise. Try again." };
  }

  revalidatePath("/");
  revalidatePath(`/people/${personId.data}`);
  return { ok: true };
}

export async function clearPromiseToPay(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const owner = session.userId;

  const personId = idSchema.safeParse(formData.get("personId"));
  if (!personId.success) return { error: "Invalid person ID." };

  try {
    let session: ClientSession | undefined;
    try {
      session = mongoClient().startSession();
      await session.withTransaction(async () => {
        await peopleCol().updateOne(
          { _id: personId.data, ownerId: owner },
          {
            $set: {
              promiseDate: null,
              promiseNote: null,
            },
          },
          { session }
        );

        // Resolve any pending promise audit log as rescheduled
        await promisesCol().updateMany(
          { personId: personId.data, ownerId: owner, status: "PENDING" },
          { $set: { status: "RESCHEDULED", resolvedAt: new Date() } },
          { session }
        );
      });
    } finally {
      if (session) await session.endSession();
    }
  } catch (err) {
    console.error("Failed to clear promise:", err);
    return { error: "Could not clear promise." };
  }

  revalidatePath("/");
  revalidatePath(`/people/${personId.data}`);
  return { ok: true };
}
