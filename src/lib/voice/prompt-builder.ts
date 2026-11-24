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

/**
 * Rank customer prompt names by recent transaction frequency and update time
 */
export function rankCustomerNames(
  customers: ActiveCustomerNameRecord[]
): string[] {
  const sorted = [...customers].sort((a, b) => {
    const timeA = a.updatedAt ? a.updatedAt.getTime() : 0;
    const timeB = b.updatedAt ? b.updatedAt.getTime() : 0;
    return timeB - timeA;
  });

  const uniqueCleanNames = new Set<string>();
  for (const item of sorted) {
    const cleaned = cleanCustomerNameForPrompt(item.name);
    if (cleaned.length >= 2) {
      uniqueCleanNames.add(cleaned);
    }
  }

  return Array.from(uniqueCleanNames);
}

/**
 * Standard khata terminology seeded into initial Whisper prompt context
 */
export const STANDARD_KHATA_TERMINOLOGY = [
  "khata",
  "hisab",
  "bahi",
  "baaki",
  "chumma",
  "panna",
  "balance",
  "entry",
];

/**
 * Regional currency and money terms for prompt context
 */
export const REGIONAL_CURRENCY_TERMS = [
  "rupaye",
  "rupay",
  "rupya",
  "roqda",
  "paise",
  "taka",
  "cash",
  "amount",
];

/**
 * Regional bookkeeping action verbs for prompt conditioning
 */
export const REGIONAL_BOOKKEEPING_VERBS = [
  "udhar",
  "jama",
  "diya",
  "mila",
  "aaya",
  "gaya",
  "chuka",
  "baaki",
  "lidha",
  "aapya",
  "credit",
  "debit",
];

/**
 * Common tea stall and store inventory items for prompt conditioning
 */
export const SHOP_INVENTORY_ITEMS = [
  "chai",
  "tea",
  "coffee",
  "biskut",
  "biscuit",
  "samosa",
  "kachori",
  "bun",
  "maska",
  "toast",
  "cigarette",
  "water",
];

export const MAX_WHISPER_PROMPT_CHARS = 800;

/**
 * Truncate customer prompt context string at 800 characters to protect token budget
 */
export function compileConditionedWhisperPrompt(
  customerNames: string[],
  extraKeywords: string[] = [],
  maxChars: number = MAX_WHISPER_PROMPT_CHARS
): string {
  const baseVocabulary = [
    ...STANDARD_KHATA_TERMINOLOGY,
    ...REGIONAL_CURRENCY_TERMS,
    ...REGIONAL_BOOKKEEPING_VERBS,
    ...SHOP_INVENTORY_ITEMS,
    ...extraKeywords,
  ];

  const vocabPart = `Chai ledger khata terms: ${Array.from(new Set(baseVocabulary)).join(", ")}.`;
  const namesPart =
    customerNames.length > 0
      ? ` Customer names: ${customerNames.join(", ")}.`
      : "";
  const fullPrompt = `${vocabPart}${namesPart}`;

  if (fullPrompt.length <= maxChars) {
    return fullPrompt;
  }

  // Ensure prompt fits within token budget while preserving base vocabulary
  return fullPrompt.slice(0, maxChars).replace(/,\s*[^,]*$/, ".");
}

interface PromptCacheEntry {
  prompt: string;
  expiresAt: number;
}

const promptCache = new Map<string, PromptCacheEntry>();
export const PROMPT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Cache the customer prompt string in memory with a five-minute expiration window
 */
export async function getCachedConditionedPrompt(
  ownerId: string,
  extraKeywords: string[] = []
): Promise<string> {
  const cacheKey = `${ownerId}:${extraKeywords.sort().join(",")}`;
  const now = Date.now();
  const cached = promptCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.prompt;
  }

  const rawCustomers = await getActiveCustomerNamesForPrompt(ownerId);
  const rankedNames = rankCustomerNames(rawCustomers);
  const prompt = compileConditionedWhisperPrompt(rankedNames, extraKeywords);

  promptCache.set(cacheKey, {
    prompt,
    expiresAt: now + PROMPT_CACHE_TTL_MS,
  });

  return prompt;
}

/**
 * Invalidate the customer prompt cache whenever a new customer gets added or modified
 */
export function invalidatePromptCache(ownerId?: string): void {
  if (!ownerId) {
    promptCache.clear();
    return;
  }

  for (const key of promptCache.keys()) {
    if (key.startsWith(`${ownerId}:`)) {
      promptCache.delete(key);
    }
  }
}









