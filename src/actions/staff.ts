"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { staffCol, usersCol } from "@/lib/mongo";
import { getSession } from "@/server/session";
import type { ActionState } from "@/lib/types";
import {
  fieldErrorsOf,
  idSchema,
  shopCodeSchema,
  staffCreateSchema,
} from "@/lib/validation";

export async function createStaff(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return { error: "Only shop owners can add staff accounts." };
  }

  const parsed = staffCreateSchema.safeParse({
    name: formData.get("name"),
    pin: formData.get("pin"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    // Ensure PIN is unique among active staff in this shop to avoid login misattribution
    const activeStaff = await staffCol()
      .find({ ownerId: session.userId, isActive: true }, { projection: { pinHash: 1 } })
      .toArray();

    for (const s of activeStaff) {
      if (await compare(parsed.data.pin, s.pinHash)) {
        return {
          error: "An active staff member in your shop already uses this PIN. Please choose another PIN.",
        };
      }
    }

    const pinHash = await hash(parsed.data.pin, 10);
    await staffCol().insertOne({
      _id: randomUUID(),
      ownerId: session.userId,
      name: parsed.data.name,
      pinHash,
      phone: parsed.data.phone ?? null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch {
    return { error: "Could not save staff member. Try again." };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleStaffStatus(
  formData: FormData
): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return;

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  const current = await staffCol().findOne(
    { _id: id.data, ownerId: session.userId },
    { projection: { isActive: 1 } }
  );
  if (!current) return;

  await staffCol().updateOne(
    { _id: id.data, ownerId: session.userId },
    { $set: { isActive: !current.isActive, updatedAt: new Date() } }
  );

  revalidatePath("/settings");
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return;

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  await staffCol().deleteOne({ _id: id.data, ownerId: session.userId });
  revalidatePath("/settings");
}

export async function updateShopCode(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return { error: "Only shop owners can update shop code." };
  }

  const parsed = shopCodeSchema.safeParse({
    shopCode: formData.get("shopCode"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const code = parsed.data.shopCode;

  // Ensure unique shop code
  const existing = await usersCol().findOne(
    { shopCode: code, _id: { $ne: session.userId } },
    { projection: { _id: 1 } }
  );
  if (existing) {
    return { error: "This shop code is already in use by another shop. Try another." };
  }

  try {
    await usersCol().updateOne(
      { _id: session.userId },
      { $set: { shopCode: code } }
    );
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 11000) {
      return { error: "This shop code was just taken by another store. Try another." };
    }
    return { error: "Could not save shop code. Try again." };
  }

  revalidatePath("/settings");
  return { ok: true };
}
