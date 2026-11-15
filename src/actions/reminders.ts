"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { peopleCol, promisesCol } from "@/lib/mongo";
import { getOwner } from "@/server/session";
import type { ActionState } from "@/lib/types";
import { idSchema } from "@/lib/validation";

export async function recordReminder(personId: string): Promise<ActionState> {
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };

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

