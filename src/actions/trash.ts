"use server";

import { revalidatePath } from "next/cache";
import type { ClientSession } from "mongodb";
import { entriesCol, mongoClient, peopleCol, promisesCol } from "@/lib/mongo";
import { getSession } from "@/server/session";
import type { ActionState } from "@/lib/types";
import { idSchema } from "@/lib/validation";

export async function restorePerson(formData: FormData): Promise<void>;
export async function restorePerson(previous: ActionState, formData: FormData): Promise<ActionState>;
export async function restorePerson(
  previousOrFormData: ActionState | FormData,
  maybeFormData?: FormData
): Promise<ActionState | void> {
  const formData =
    previousOrFormData instanceof FormData
      ? previousOrFormData
      : maybeFormData!;
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
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

export async function restoreEntry(formData: FormData): Promise<void>;
export async function restoreEntry(previous: ActionState, formData: FormData): Promise<ActionState>;
export async function restoreEntry(
  previousOrFormData: ActionState | FormData,
  maybeFormData?: FormData
): Promise<ActionState | void> {
  const formData =
    previousOrFormData instanceof FormData
      ? previousOrFormData
      : maybeFormData!;
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
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

export async function purgeTrashItem(formData: FormData): Promise<void>;
export async function purgeTrashItem(previous: ActionState, formData: FormData): Promise<ActionState>;
export async function purgeTrashItem(
  previousOrFormData: ActionState | FormData,
  maybeFormData?: FormData
): Promise<ActionState | void> {
  const formData =
    previousOrFormData instanceof FormData
      ? previousOrFormData
      : maybeFormData!;
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
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
        await promisesCol().deleteMany({ personId: id.data, ownerId: owner }, { session });
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

export async function emptyTrash(formData?: FormData): Promise<void>;
export async function emptyTrash(): Promise<ActionState>;
export async function emptyTrash(): Promise<ActionState | void> {
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
  const owner = auth.userId;

  let session: ClientSession | undefined;
  try {
    session = mongoClient().startSession();
    await session.withTransaction(async () => {
      const trashedPeople = await peopleCol()
        .find(
          { ownerId: owner, deletedAt: { $ne: null } },
          { projection: { _id: 1 }, session }
        )
        .toArray();
      const trashedPersonIds = trashedPeople.map((p) => p._id);
      if (trashedPersonIds.length > 0) {
        await promisesCol().deleteMany(
          { ownerId: owner, personId: { $in: trashedPersonIds } },
          { session }
        );
      }
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
