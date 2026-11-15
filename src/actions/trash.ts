"use server";

import { revalidatePath } from "next/cache";
import type { ClientSession } from "mongodb";
import { entriesCol, mongoClient, peopleCol } from "@/lib/mongo";
import { getOwner } from "@/server/session";
import type { ActionState } from "@/lib/types";
import { idSchema } from "@/lib/validation";

export async function restorePerson(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid person ID." };

  let session: ClientSession | undefined;
  try {
    session = mongoClient().startSession();
    await session.withTransaction(async () => {
      await peopleCol().updateOne(
        { _id: id.data, ownerId: owner },
        { $set: { deletedAt: null } },
        { session }
      );
      await entriesCol().updateMany(
        { personId: id.data, ownerId: owner },
        { $set: { deletedAt: null } },
        { session }
      );
    });
  } catch (err) {
    console.error("Failed to restore person:", err);
    return { error: "Could not restore person. Try again." };
  } finally {
    if (session) await session.endSession();
  }

  revalidatePath("/");
  revalidatePath("/trash");
  revalidatePath(`/people/${id.data}`);
  return { ok: true };
}

export async function restorePersonAction(formData: FormData): Promise<void> {
  await restorePerson({}, formData);
}

export async function restoreEntry(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };

  const entryId = idSchema.safeParse(formData.get("entryId"));
  const personId = idSchema.safeParse(formData.get("personId"));
  if (!entryId.success || !personId.success) {
    return { error: "Invalid ID." };
  }

  let session: ClientSession | undefined;
  try {
    session = mongoClient().startSession();
    await session.withTransaction(async () => {
      // Ensure the parent person is also active so entry isn't orphaned
      await peopleCol().updateOne(
        { _id: personId.data, ownerId: owner },
        { $set: { deletedAt: null } },
        { session }
      );
      await entriesCol().updateOne(
        { _id: entryId.data, ownerId: owner },
        { $set: { deletedAt: null } },
        { session }
      );
    });
  } catch (err) {
    console.error("Failed to restore entry:", err);
    return { error: "Could not restore entry. Try again." };
  } finally {
    if (session) await session.endSession();
  }

  revalidatePath("/");
  revalidatePath("/trash");
  revalidatePath(`/people/${personId.data}`);
  return { ok: true };
}

export async function restoreEntryAction(formData: FormData): Promise<void> {
  await restoreEntry({}, formData);
}

