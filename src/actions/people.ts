"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { entriesCol, peopleCol } from "@/lib/mongo";
import { getOwner } from "@/server/session";
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
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };

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
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };

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
  const owner = await getOwner();
  const id = idSchema.safeParse(formData.get("id"));
  if (!owner || !id.success) {
    redirect("/login");
  }

  // No DB cascade anymore — delete the person's entries explicitly.
  await entriesCol().deleteMany({ personId: id.data, ownerId: owner });
  await peopleCol().deleteOne({ _id: id.data, ownerId: owner });

  revalidatePath(HOME);
  redirect(HOME);
}

