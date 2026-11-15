"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import { parseCsvKhata, validateBackupPayload } from "@/lib/backup";
import { decimalStringToPaise } from "@/lib/money";
import { entriesCol, mongoClient, peopleCol, promisesCol, usersCol } from "@/lib/mongo";
import { normalizePhone } from "@/lib/phone";
import { activeFilter } from "@/lib/trash";
import { getOwner } from "@/server/session";
import type { ActionState, BackupPayload, CsvImportPreview } from "@/lib/types";

export async function exportBackupJson(): Promise<{
  ok: boolean;
  data?: BackupPayload;
  error?: string;
}> {
  const owner = await getOwner();
  if (!owner) return { ok: false, error: "Please sign in again." };

  try {
    const [user, people, entries, promises] = await Promise.all([
      usersCol().findOne({ _id: owner }),
      peopleCol().find({ ownerId: owner, ...activeFilter() }).toArray(),
      entriesCol().find({ ownerId: owner, ...activeFilter() }).toArray(),
      promisesCol ? promisesCol().find({ ownerId: owner }).toArray().catch(() => []) : Promise.resolve([]),
    ]);

    if (!user) return { ok: false, error: "User profile not found." };

    const payload: BackupPayload = {
      version: "chai_ledger_backup_v2",
      exportedAt: new Date().toISOString(),
      owner: {
        email: user.email,
        upiId: user.upiId ?? null,
        upiName: user.upiName ?? null,
      },
      people: people.map((p) => ({
        id: p._id,
        name: p.name,
        phone: p.phone,
        promiseDate: p.promiseDate ? p.promiseDate.toISOString().split("T")[0] : null,
        promiseNote: p.promiseNote ?? null,
        lastRemindedAt: p.lastRemindedAt ? p.lastRemindedAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      entries: entries.map((e) => ({
        id: e._id,
        personId: e.personId,
        type: e.type,
        amountCents: e.amountCents,
        note: e.note,
        dueDate: e.dueDate ? e.dueDate.toISOString().split("T")[0] : null,
        createdAt: e.createdAt.toISOString(),
      })),
      promises: promises.map((pr) => ({
        id: pr._id,
        personId: pr.personId,
        promiseDate: pr.promiseDate.toISOString().split("T")[0],
        note: pr.note ?? null,
        status: pr.status,
        createdAt: pr.createdAt.toISOString(),
      })),
    };

    return { ok: true, data: payload };
  } catch (err) {
    console.error("Failed to generate backup JSON:", err);
    return { ok: false, error: "Could not export backup." };
  }
}

export async function restoreBackupJson(
  jsonText: string
): Promise<ActionState & { count?: { people: number; entries: number } }> {
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    return { error: "Invalid JSON format." };
  }

  const validated = validateBackupPayload(parsedJson);
  if (!validated.ok) {
    return { error: validated.error };
  }

  const payload = validated.data;
  let session: ClientSession | undefined;

  try {
    session = mongoClient().startSession();
    await session.withTransaction(async () => {
      // Create mapping for IDs in case we are restoring
      const idMap = new Map<string, string>();

      // Check existing people by phone/name to merge cleanly
      const existingPeople = await peopleCol()
        .find({ ownerId: owner, ...activeFilter() }, { session })
        .toArray();

      const byPhone = new Map<string, string>();
      const byName = new Map<string, string>();
      for (const p of existingPeople) {
        if (p.phone) {
          const norm = normalizePhone(p.phone);
          if (norm) byPhone.set(norm, p._id);
        }
        byName.set(p.name.trim().toLowerCase(), p._id);
      }

      for (const p of payload.people) {
        const normPhone = p.phone ? normalizePhone(p.phone) : null;
        const existingId =
          (normPhone ? byPhone.get(normPhone) : undefined) ??
          byName.get(p.name.trim().toLowerCase());

        if (existingId) {
          idMap.set(p.id, existingId);
        } else {
          const newId = randomUUID();
          idMap.set(p.id, newId);
          await peopleCol().insertOne(
            {
              _id: newId,
              ownerId: owner,
              name: p.name,
              phone: p.phone,
              promiseDate: p.promiseDate ? new Date(p.promiseDate) : null,
              promiseNote: p.promiseNote ?? null,
              lastRemindedAt: p.lastRemindedAt ? new Date(p.lastRemindedAt) : null,
              createdAt: new Date(p.createdAt),
              updatedAt: new Date(p.updatedAt),
            },
            { session }
          );
        }
      }

      for (const e of payload.entries) {
        const mappedPersonId = idMap.get(e.personId);
        if (!mappedPersonId) continue;

        await entriesCol().insertOne(
          {
            _id: randomUUID(),
            ownerId: owner,
            personId: mappedPersonId,
            type: e.type,
            amountCents: e.amountCents,
            note: e.note ?? null,
            dueDate: e.dueDate ? new Date(e.dueDate) : null,
            createdAt: new Date(e.createdAt),
          },
          { session }
        );
      }
    });
  } catch (err) {
    console.error("Failed to restore backup:", err);
    return { error: "Could not restore backup. Try again." };
  } finally {
    if (session) await session.endSession();
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return {
    ok: true,
    count: {
      people: payload.people.length,
      entries: payload.entries.length,
    },
  };
}

