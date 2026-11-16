"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { peopleCol, promisesCol } from "@/lib/mongo";
import { getSession } from "@/server/session";
import type { ActionState } from "@/lib/types";
import { idSchema } from "@/lib/validation";

export async function recordReminder(personId: string): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  if (session.role === "STAFF") {
    return { error: "Staff cannot record reminders." };
  }
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
  if (session.role === "STAFF") {
    return { error: "Staff cannot set promises." };
  }
  const owner = session.userId;

  const personId = idSchema.safeParse(formData.get("personId"));
  if (!personId.success) return { error: "Invalid person ID." };

  const rawDate = formData.get("promiseDate")?.toString().trim();
  if (!rawDate || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return { error: "Valid promise date (YYYY-MM-DD) is required." };
  }

  const rawNote = formData.get("note")?.toString().trim() || null;
  const promiseDate = new Date(`${rawDate}T00:00:00+05:30`);

  try {
    const person = await peopleCol().findOne({
      _id: personId.data,
      ownerId: owner,
    });
    if (!person) return { error: "Person not found." };

    // Update active promise on person
    await peopleCol().updateOne(
      { _id: personId.data, ownerId: owner },
      {
        $set: {
          promiseDate,
          promiseNote: rawNote,
        },
      }
    );

    // Audit log in promises collection
    await promisesCol().insertOne({
      _id: randomUUID(),
      ownerId: owner,
      personId: personId.data,
      promiseDate,
      note: rawNote,
      status: "PENDING",
      createdAt: new Date(),
    });
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
  if (session.role === "STAFF") {
    return { error: "Staff cannot clear promises." };
  }
  const owner = session.userId;

  const personId = idSchema.safeParse(formData.get("personId"));
  if (!personId.success) return { error: "Invalid person ID." };

  try {
    await peopleCol().updateOne(
      { _id: personId.data, ownerId: owner },
      {
        $set: {
          promiseDate: null,
          promiseNote: null,
        },
      }
    );
  } catch (err) {
    console.error("Failed to clear promise:", err);
    return { error: "Could not clear promise." };
  }

  revalidatePath("/");
  revalidatePath(`/people/${personId.data}`);
  return { ok: true };
}
