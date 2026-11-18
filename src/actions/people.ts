"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import { entriesCol, mongoClient, peopleCol } from "@/lib/mongo";
import { getSession } from "@/server/session";
import type { ActionState } from "@/lib/types";
import {
  fieldErrorsOf,
  idSchema,
  personSchema,
} from "@/lib/validation";

const HOME = "/";

function expirePaths(id: string): void {
  revalidatePath(HOME);
  revalidatePath(`/people/${id}`);
  revalidatePath(`/people/${id}/edit`);
}

export async function createPerson(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const owner = session.userId;

  const parsed = personSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await peopleCol().insertOne({
      _id: randomUUID(),
      ownerId: owner,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch {
    return { error: "Could not save. Try again." };
  }

  revalidatePath(HOME);
  redirect(HOME);
}

export async function updatePerson(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  const owner = session.userId;

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Person not found." };

  const parsed = personSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let matched = 0;
  try {
    // The ownerId filter replaces the old RLS policy: you can only
    // rename your own people.
    const result = await peopleCol().updateOne(
      { _id: id.data, ownerId: owner },
      {
        $set: {
          name: parsed.data.name,
          phone: parsed.data.phone ?? null,
          updatedAt: new Date(),
        },
      }
    );
    matched = result.matchedCount;
  } catch {
    return { error: "Could not save. Try again." };
  }
  if (matched === 0) return { error: "Person not found." };

  expirePaths(id.data);
  return { ok: true };
}

/** Used directly as a form action; always ends on the home page. */
export async function deletePerson(formData: FormData): Promise<void> {
  const auth = await getSession();
  if (!auth) {
    redirect("/login");
  }
  const owner = auth.userId;

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) {
    return;
  }

  // Atomic soft delete: both the person and their entries are marked deleted in a
  // single transaction. If the connection drops mid-way, neither
  // operation commits — data remains safe and restorable.
  let session: ClientSession | undefined;
  try {
    session = mongoClient().startSession();
    await session.withTransaction(async () => {
      const now = new Date();
      await peopleCol().updateOne(
        { _id: id.data, ownerId: owner },
        { $set: { deletedAt: now } },
        { session }
      );
      await entriesCol().updateMany(
        { personId: id.data, ownerId: owner },
        { $set: { deletedAt: now } },
        { session }
      );
    });
  } catch (err) {
    console.error("Failed to delete person transaction:", err);
    return;
  } finally {
    if (session) {
      await session.endSession();
    }
  }

  revalidatePath(HOME);
  redirect(HOME);
}
