/**
 * Customer Vocabulary Conditioning and Whisper Prompt Generation
 */
import { peopleCol } from "@/lib/mongo";
import { activeFilter } from "@/lib/trash";

export interface ActiveCustomerNameRecord {
  id: string;
  name: string;
  updatedAt?: Date;
}

/**
 * Pull the signed-in shopkeeper's most active customer names from the database
 */
export async function getActiveCustomerNamesForPrompt(
  ownerId: string,
  limit: number = 50
): Promise<ActiveCustomerNameRecord[]> {
  try {
    const records = await peopleCol()
      .find(
        { ownerId, ...activeFilter() },
        { projection: { _id: 1, name: 1, updatedAt: 1 } }
      )
      .sort({ updatedAt: -1, name: 1 })
      .limit(limit)
      .toArray();

    return records.map((r) => ({
      id: String(r._id),
      name: r.name || "",
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Strip special characters and emojis from customer names before prompting
 */
export function cleanCustomerNameForPrompt(rawName: string): string {
  if (!rawName) return "";
  return rawName
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ""
    )
    .replace(/[()[\]{}<>,;:!?"'`~@#$%^&*_=+|/\\]/g, " ")
    .replace(/\b\d{10,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

