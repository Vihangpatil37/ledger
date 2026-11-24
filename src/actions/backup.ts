"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongodb";
import { parseCsvKhata, validateBackupPayload } from "@/lib/backup";
import { formatDateToIst } from "@/lib/format";
import { decimalStringToPaise } from "@/lib/money";
import {
  entriesCol,
  mongoClient,
  peopleCol,
  promisesCol,
  usersCol,
  type EntryDoc,
  type PersonDoc,
  type PromiseDoc,
} from "@/lib/mongo";
import { normalizePhone } from "@/lib/phone";
import { activeFilter } from "@/lib/trash";
import { invalidatePromptCache } from "@/lib/voice/prompt-builder";
import { getSession } from "@/server/session";
import type { ActionState, BackupPayload, CsvImportPreview } from "@/lib/types";

function parseIstDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const clean = val.split("T")[0];
  const d = new Date(`${clean}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function exportBackupJson(): Promise<{
  ok: boolean;
  data?: BackupPayload;
  error?: string;
}> {
  const auth = await getSession();
  if (!auth) return { ok: false, error: "Please sign in again." };
  const owner = auth.userId;

  try {
    const [user, people, entries, promises] = await Promise.all([
      usersCol().findOne({ _id: owner }),
      peopleCol().find({ ownerId: owner, ...activeFilter() }).toArray(),
      entriesCol().find({ ownerId: owner, ...activeFilter() }).toArray(),
      promisesCol().find({ ownerId: owner }).toArray().catch(() => []),
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
        promiseDate: formatDateToIst(p.promiseDate),
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
        dueDate: formatDateToIst(e.dueDate),
        createdAt: e.createdAt.toISOString(),
      })),
      promises: promises.map((pr) => ({
        id: pr._id,
        personId: pr.personId,
        promiseDate: formatDateToIst(pr.promiseDate) ?? "",
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
): Promise<ActionState & { count?: { people: number; entries: number; promises: number } }> {
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
  const owner = auth.userId;

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
  const CHUNK_SIZE = 500;
  let restoredPromisesCount = 0;

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

      const newPeopleToInsert: PersonDoc[] = [];

      for (const p of payload.people) {
        const normPhone = p.phone ? normalizePhone(p.phone) : null;
        const existingId =
          (normPhone ? byPhone.get(normPhone) : undefined) ??
          byName.get(p.name.trim().toLowerCase());

        if (existingId) {
          idMap.set(p.id, existingId);
          if (p.promiseDate) {
            await peopleCol().updateOne(
              { _id: existingId, ownerId: owner },
              {
                $set: {
                  promiseDate: parseIstDate(p.promiseDate),
                  promiseNote: p.promiseNote ?? null,
                  updatedAt: new Date(),
                },
              },
              { session }
            );
          }
        } else {
          const newId = randomUUID();
          idMap.set(p.id, newId);
          if (normPhone) byPhone.set(normPhone, newId);
          byName.set(p.name.trim().toLowerCase(), newId);
          newPeopleToInsert.push({
            _id: newId,
            ownerId: owner,
            name: p.name,
            phone: p.phone,
            promiseDate: parseIstDate(p.promiseDate),
            promiseNote: p.promiseNote ?? null,
            lastRemindedAt: p.lastRemindedAt ? new Date(p.lastRemindedAt) : null,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          });
        }
      }

      const newEntriesToInsert: EntryDoc[] = [];

      for (const e of payload.entries) {
        const mappedPersonId = idMap.get(e.personId);
        if (!mappedPersonId) continue;

        newEntriesToInsert.push({
          _id: randomUUID(),
          ownerId: owner,
          personId: mappedPersonId,
          type: e.type,
          amountCents: e.amountCents,
          note: e.note ?? null,
          dueDate: parseIstDate(e.dueDate),
          createdAt: new Date(e.createdAt),
        });
      }

      const newPromisesToInsert: PromiseDoc[] = [];
      if (Array.isArray(payload.promises)) {
        for (const pr of payload.promises) {
          const mappedPersonId = idMap.get(pr.personId);
          if (!mappedPersonId) continue;

          newPromisesToInsert.push({
            _id: randomUUID(),
            ownerId: owner,
            personId: mappedPersonId,
            promiseDate: parseIstDate(pr.promiseDate) ?? new Date(pr.promiseDate),
            note: pr.note ?? null,
            status: (["PENDING", "KEPT", "BROKEN", "RESCHEDULED"].includes(pr.status)
              ? pr.status
              : "PENDING") as PromiseDoc["status"],
            createdAt: pr.createdAt ? new Date(pr.createdAt) : new Date(),
          });
        }
      }

      // Chunked bulk inserts
      for (let i = 0; i < newPeopleToInsert.length; i += CHUNK_SIZE) {
        await peopleCol().insertMany(newPeopleToInsert.slice(i, i + CHUNK_SIZE), { session });
      }

      for (let i = 0; i < newEntriesToInsert.length; i += CHUNK_SIZE) {
        await entriesCol().insertMany(newEntriesToInsert.slice(i, i + CHUNK_SIZE), { session });
      }

      for (let i = 0; i < newPromisesToInsert.length; i += CHUNK_SIZE) {
        await promisesCol().insertMany(newPromisesToInsert.slice(i, i + CHUNK_SIZE), { session });
      }

      restoredPromisesCount = newPromisesToInsert.length;
    });
  } catch (err) {
    console.error("Failed to restore backup:", err);
    return { error: "Could not restore backup. Try again." };
  } finally {
    if (session) await session.endSession();
  }

  invalidatePromptCache(owner);
  revalidatePath("/");
  revalidatePath("/settings");
  return {
    ok: true,
    count: {
      people: payload.people.length,
      entries: payload.entries.length,
      promises: restoredPromisesCount,
    },
  };
}

export async function previewCsvImport(
  csvText: string
): Promise<{ ok: boolean; preview?: CsvImportPreview; error?: string }> {
  const auth = await getSession();
  if (!auth) return { ok: false, error: "Please sign in again." };
  const owner = auth.userId;

  try {
    const existingPeople = await peopleCol()
      .find({ ownerId: owner, ...activeFilter() }, { projection: { name: 1, phone: 1 } })
      .toArray();

    const preview = parseCsvKhata(
      csvText,
      existingPeople.map((p) => ({ id: p._id, name: p.name, phone: p.phone }))
    );

    return { ok: true, preview };
  } catch (err) {
    console.error("Failed to preview CSV:", err);
    return { ok: false, error: "Failed to parse CSV file." };
  }
}

export async function commitCsvImport(
  csvText: string
): Promise<ActionState & { importedCount?: number }> {
  const auth = await getSession();
  if (!auth) return { error: "Please sign in again." };
  const owner = auth.userId;

  try {
    const existingPeople = await peopleCol()
      .find({ ownerId: owner, ...activeFilter() }, { projection: { name: 1, phone: 1 } })
      .toArray();

    const preview = parseCsvKhata(
      csvText,
      existingPeople.map((p) => ({ id: p._id, name: p.name, phone: p.phone }))
    );

    const validRows = preview.rows.filter((r) => r.status === "VALID");
    if (validRows.length === 0) {
      return { error: "No valid rows found to import." };
    }

    let session: ClientSession | undefined;
    try {
      session = mongoClient().startSession();
      await session.withTransaction(async () => {
        // Map of contacts (normalized phone or name -> id)
        const personIdMap = new Map<string, string>();
        for (const p of existingPeople) {
          if (p.phone) {
            const norm = normalizePhone(p.phone);
            if (norm) personIdMap.set(norm, p._id);
          }
          personIdMap.set(p.name.trim().toLowerCase(), p._id);
        }

        // Collect missing contacts first
        const newPeopleToInsert: Array<{
          _id: string;
          ownerId: string;
          name: string;
          phone: string | null;
          createdAt: Date;
          updatedAt: Date;
        }> = [];

        for (const row of validRows) {
          const normPhone = row.phone ? normalizePhone(row.phone) : null;
          const lookupKey = normPhone || row.name.trim().toLowerCase();

          if (!personIdMap.has(lookupKey)) {
            const newPersonId = randomUUID();
            newPeopleToInsert.push({
              _id: newPersonId,
              ownerId: owner,
              name: row.name.trim(),
              phone: row.phone ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            personIdMap.set(lookupKey, newPersonId);
            if (normPhone) personIdMap.set(row.name.trim().toLowerCase(), newPersonId);
          }
        }

        if (newPeopleToInsert.length > 0) {
          await peopleCol().insertMany(newPeopleToInsert, { session });
        }

        // Collect valid entries for bulk insert
        const newEntriesToInsert: Array<{
          _id: string;
          ownerId: string;
          personId: string;
          type: "GAVE" | "RECEIVED";
          amountCents: number;
          note: string | null;
          dueDate: Date | null;
          createdAt: Date;
        }> = [];

        for (const row of validRows) {
          const normPhone = row.phone ? normalizePhone(row.phone) : null;
          const lookupKey = normPhone || row.name.trim().toLowerCase();
          const targetPersonId = personIdMap.get(lookupKey);
          if (!targetPersonId) continue;

          newEntriesToInsert.push({
            _id: randomUUID(),
            ownerId: owner,
            personId: targetPersonId,
            type: row.type,
            amountCents: decimalStringToPaise(row.amount),
            note: row.note ?? null,
            dueDate: parseIstDate(row.dueDate),
            createdAt: new Date(),
          });
        }

        if (newEntriesToInsert.length > 0) {
          await entriesCol().insertMany(newEntriesToInsert, { session });
        }
      });
    } finally {
      if (session) await session.endSession();
    }

    invalidatePromptCache(owner);
    revalidatePath("/");
    revalidatePath("/settings");
    return { ok: true, importedCount: validRows.length };
  } catch (err) {
    console.error("Failed to commit CSV import:", err);
    return { error: "Could not complete import. Try again." };
  }
}
