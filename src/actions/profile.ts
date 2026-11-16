"use server";

import { revalidatePath } from "next/cache";
import { usersCol } from "@/lib/mongo";
import { getSession } from "@/server/session";
import type { ActionState } from "@/lib/types";
import { fieldErrorsOf, ownerUpiSchema } from "@/lib/validation";

export async function updateOwnerUpi(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };
  if (session.role === "STAFF") {
    return { error: "Staff cannot update shop profile settings." };
  }
  const owner = session.userId;

  const parsed = ownerUpiSchema.safeParse({
    upiId: formData.get("upiId"),
    upiName: formData.get("upiName"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await usersCol().updateOne(
      { _id: owner },
      {
        $set: {
          upiId: parsed.data.upiId,
          upiName: parsed.data.upiName,
        },
      }
    );
  } catch {
    return { error: "Could not save UPI settings. Try again." };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}
