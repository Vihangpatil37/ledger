"use server";

import { revalidatePath } from "next/cache";
import type { ClientSession } from "mongodb";
import { entriesCol, mongoClient, peopleCol } from "@/lib/mongo";
import { getSession } from "@/server/session";
import type { ActionState } from "@/lib/types";
import { idSchema } from "@/lib/validation";

export async function restorePerson(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
  if (auth.role === "STAFF") return { error: "Staff accounts cannot access trash operations." };
  const owner = auth.userId;

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
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
  if (auth.role === "STAFF") return { error: "Staff accounts cannot access trash operations." };
  const owner = auth.userId;

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

export async function purgeTrashItem(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
  if (auth.role === "STAFF") return { error: "Staff accounts cannot access trash operations." };
  const owner = auth.userId;

  const id = idSchema.safeParse(formData.get("id"));
  const kind = formData.get("kind");
  if (!id.success) return { error: "Invalid ID." };

  let session: ClientSession | undefined;
  try {
    if (kind === "PERSON") {
      session = mongoClient().startSession();
      await session.withTransaction(async () => {
        await peopleCol().deleteOne({ _id: id.data, ownerId: owner }, { session });
        await entriesCol().deleteMany({ personId: id.data, ownerId: owner }, { session });
      });
    } else {
      await entriesCol().deleteOne({ _id: id.data, ownerId: owner });
    }
  } catch (err) {
    console.error("Failed to permanently delete item:", err);
    return { error: "Could not delete permanently. Try again." };
  } finally {
    if (session) await session.endSession();
  }

  revalidatePath("/trash");
  return { ok: true };
}

export async function purgeTrashItemAction(formData: FormData): Promise<void> {
  await purgeTrashItem({}, formData);
}

export async function emptyTrash(): Promise<ActionState> {
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
  if (auth.role === "STAFF") return { error: "Staff accounts cannot access trash operations." };
  const owner = auth.userId;

  let session: ClientSession | undefined;
  try {
    session = mongoClient().startSession();
    await session.withTransaction(async () => {
      await peopleCol().deleteMany(
        { ownerId: owner, deletedAt: { $ne: null } },
        { session }
      );
      await entriesCol().deleteMany(
        { ownerId: owner, deletedAt: { $ne: null } },
        { session }
      );
    });
  } catch (err) {
    console.error("Failed to empty trash:", err);
    return { error: "Could not empty trash. Try again." };
  } finally {
    if (session) await session.endSession();
  }

  revalidatePath("/trash");
  return { ok: true };
}

export async function emptyTrashAction(): Promise<void> {
  await emptyTrash();
}
