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
