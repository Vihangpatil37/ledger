"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { decimalStringToPaise } from "@/lib/money";
import { entriesCol, peopleCol } from "@/lib/mongo";
import { getOwner } from "@/server/session";
import type { ActionState } from "@/lib/types";
import {
  entrySchema,
  fieldErrorsOf,
  idSchema,
} from "@/lib/validation";

export async function addEntry(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };

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
    // Money crosses the wire as a decimal string; it is stored as an
    // exact integer of paise. ≤ 9,999,999.99 stays within double range.
    await entriesCol().insertOne({
      _id: randomUUID(),
      ownerId: owner,
      personId: parsed.data.personId,
      type: parsed.data.type,
      amountCents: decimalStringToPaise(parsed.data.amount),
      note: parsed.data.note ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      createdAt: new Date(),
    });
  } catch {
    return { error: "Could not save entry. Try again." };
  }

  revalidatePath("/");
  revalidatePath(`/people/${parsed.data.personId}`);
  return { ok: true };
}

/** Used directly as a form action; stays on the person page. */
export async function deleteEntry(formData: FormData): Promise<void> {
  const owner = await getOwner();
  const entryId = idSchema.safeParse(formData.get("entryId"));
  const personId = idSchema.safeParse(formData.get("personId"));
  if (!owner || !entryId.success || !personId.success) {
    redirect("/login");
  }

  await entriesCol().deleteOne({ _id: entryId.data, ownerId: owner });

  revalidatePath("/");
  revalidatePath(`/people/${personId.data}`);
}

