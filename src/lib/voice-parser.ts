import type { EntryType } from "@/lib/types";
import { calculatePhoneticMatchScore } from "@/lib/indic-transliteration";

export type VoiceParsedIntent = {
  type: EntryType;
  amount: number | null;
  personName: string | null;
  note: string | null;
  confidence: number;
  rawTranscript: string;
};

// --- Number Mappings ---

const NUMBER_WORDS: Record<string, number> = {
  // English
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  // Hinglish / Hindi Latin
  ek: 1,
  do: 2,
  teen: 3,
  chaar: 4,
  char: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  gyaarah: 11,
  barah: 12,
  baarah: 12,
  terah: 13,
  chaudah: 14,
  choudah: 14,
  pandrah: 15,
  solah: 16,
  satrah: 17,
  atharah: 18,
  athaarah: 18,
  unnees: 19,
  bees: 20,
  pachees: 25,
  tees: 30,
  chaalis: 40,
  chalis: 40,
  pachaas: 50,
  pachas: 50,
  saath: 60,
  sattar: 70,
  assi: 80,
  nabbe: 90,
  sau: 100,
  so: 100,
  sai: 100,
  hazaar: 1000,
  hazar: 1000,
  hajar: 1000,
  lakh: 100000,
  laakh: 100000,
  lac: 100000,
  // Devanagari
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  छः: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  बीस: 20,
  पच्चीस: 25,
  तीस: 30,
  चालीस: 40,
  पचास: 50,
  साठ: 60,
  सत्तर: 70,
  अस्सी: 80,
  नब्बे: 90,
  सौ: 100,
  हज़ार: 1000,
  हजार: 1000,
  लाख: 100000,
};

const COMPOUND_SPECIALS: Array<{ regex: RegExp; value: number }> = [
  // 150
  { regex: /(?:^|[\s\p{P}])(?:dedh|डेढ़)\s+(?:sau|so|सौ)(?=$|[\s\p{P}])/iu, value: 150 },
  // 250
  { regex: /(?:^|[\s\p{P}])(?:dhai|dhayi|ढाई)\s+(?:sau|so|सौ)(?=$|[\s\p{P}])/iu, value: 250 },
  // 125
  { regex: /(?:^|[\s\p{P}])(?:sawa|सवा)\s+(?:sau|सौ)(?=$|[\s\p{P}])/iu, value: 125 },
  // 175
  { regex: /(?:^|[\s\p{P}])(?:paune\s+do|पौने\s+दो)\s+(?:sau|सौ)(?=$|[\s\p{P}])/iu, value: 175 },
  // 275
  { regex: /(?:^|[\s\p{P}])(?:paune\s+teen|पौने\s+तीन)\s+(?:sau|सौ)(?=$|[\s\p{P}])/iu, value: 275 },
  // 1500
  { regex: /(?:^|[\s\p{P}])(?:dedh|डेढ़)\s+(?:hazaar|hazar|हज़ार|हजार)(?=$|[\s\p{P}])/iu, value: 1500 },
  // 2500
  { regex: /(?:^|[\s\p{P}])(?:dhai|ढाई)\s+(?:hazaar|hazar|हज़ार|हजार)(?=$|[\s\p{P}])/iu, value: 2500 },
  // 1250
  { regex: /(?:^|[\s\p{P}])(?:sawa|सवा)\s+(?:hazaar|hazar|हज़ार|हजार)(?=$|[\s\p{P}])/iu, value: 1250 },
  // 1750
  { regex: /(?:^|[\s\p{P}])(?:paune\s+do|पौने\s+दो)\s+(?:hazaar|hazar|हज़ार|हजार)(?=$|[\s\p{P}])/iu, value: 1750 },
];

const PHYSICAL_ITEMS =
  "(?:chai\\s*sutta|cutting\\s*chai|masala\\s*chai|bun\\s*maska|maska\\s*bun|vada\\s*pav|water\\s*bottle|pani\\s*bottle|chai|tea|cutting|coffee|samosa|samose|kachori|biskut|biscuit|sutta|cigarette|cigratte|advance|paratha|maggi|sandwich|poha|cold\\s*drink|chips|namkeen)";
const PAYMENT_MODES = "(?:online|cash|gpay|phonepe|paytm|upi)";

const ITEM_REGEX = new RegExp(
  "(?:^|[\\s\\p{P}])(?:(?:(?:[1-9]|1[0-9]|20|ek|do|teen|chaar|paanch)\\s*(?:cup|plate|half|full|packet)?\\s*)?" +
    PHYSICAL_ITEMS +
    "|" +
    PAYMENT_MODES +
    ")(?=$|[\\s\\p{P}])",
  "iu"
);

/**
 * Normalizes Devanagari numerals to ASCII digits.
 */
function normalizeDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => "०१२३४५६७८९".indexOf(d).toString());
}

/**
 * Parses transaction type ('GAVE' vs 'RECEIVED').
 */
function parseTransactionType(text: string): EntryType {
  // 1. Customer gave money to shopkeeper: e.g. "X ne diye", "X ne mere ko 5000 diye", "X ne payment diya"
  // When a third person "ne" is the subject giving money, shopkeeper is the recipient -> RECEIVED
  if (
    /(?:ne|ने)\s+(?:mere\s+ko|mujhe|humko|hamne|humein|हमें|मुझे|मेरे\s+को)?\s*.*(?:diye?|diya|de\s+diye|paid|payment|jama|aaya|mila|mile|दिye|दिए|दिया|पेमेंट|जमा|आया|मिला)/iu.test(
      text
    ) &&
    !/(?:maine|humne|hamne|मैंने|हमने)\s+.*(?:udhar|diya)/iu.test(text) &&
    !/(?:^|[\s\p{P}])udhar\s+(?:diya|diye)/iu.test(text)
  ) {
    return "RECEIVED";
  }

  const receivedRegex =
    /(?:^|[\s\p{P}])(?:jama|aaya|aaye|mila|mile|received|receive|got|paid|payment|settle|settled|vasooli|wasuli|credit|credited|deposit|जमा|आया|आए|मिला|मिले|पेमेंट|वसूल|वसूली)(?=$|[\s\p{P}])/iu;
  const gaveRegex =
    /(?:^|[\s\p{P}])(?:udhar|udhaari|diya|diye|de diya|baaki|baki|le gaya|lena hai|khata|likho|likh do|gave|given|lent|due|borrowed|उधार|उधारी|दिया|दिए|दे दिया|बाकी|ले गया|लिखो|लिख दो)(?=$|[\s\p{P}])/iu;

  if (
    receivedRegex.test(text) &&
    !/(?:^|[\s\p{P}])udhar\s+diya(?=$|[\s\p{P}])/iu.test(text)
  ) {
    return "RECEIVED";
  }

  if (gaveRegex.test(text)) {
    return "GAVE";
  }

  // Preposition cues e.g. "Got from X" vs "Gave to X"
  if (/(?:^|[\s\p{P}])from\b/iu.test(text)) {
    return "RECEIVED";
  }

  // Default in chai stall context: Udhar / GAVE
  return "GAVE";
}

/**
 * Extracts note or item name.
 */
function extractNote(text: string): { note: string | null; matchedText: string | null } {
  const forMatch = text.match(/(?:^|[\s\p{P}])for\s+([a-zA-Z0-9\s]+)$/iu);
  if (forMatch && forMatch[1].trim()) {
    return { note: forMatch[1].trim(), matchedText: forMatch[0].trim() };
  }

  const itemMatch = text.match(ITEM_REGEX);
  if (itemMatch && itemMatch[0].trim()) {
    const rawMatch = itemMatch[0].trim();
    return { note: rawMatch, matchedText: rawMatch };
  }

  return { note: null, matchedText: null };
}

/**
 * Extracts numeric transaction amount from words or digits.
 */
function extractAmount(
  text: string,
  noteText: string | null
): { amount: number | null; matchedText: string | null } {
  // 1. Compound specials (dedh sau, dhai sau, etc.)
  for (const compound of COMPOUND_SPECIALS) {
    const m = text.match(compound.regex);
    if (m) {
      return { amount: compound.value, matchedText: m[0].trim() };
    }
  }

  // 2. Multipliers: e.g. "do hazaar", "paanch sau", "तीन सौ"
  const multRegex =
    /(?:^|[\s\p{P}])(ek|do|teen|chaar|char|paanch|panch|chhe|che|saat|aath|nau|das|एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस)\s+(hazaar|hazar|हज़ार|हजार|sau|so|सौ|lakh|laakh|लाख)(?=$|[\s\p{P}])/iu;
  const multMatch = text.match(multRegex);
  if (multMatch) {
    const unitWord = multMatch[1].toLowerCase();
    const multWord = multMatch[2].toLowerCase();
    const u = NUMBER_WORDS[unitWord] || 1;
    let multiplier = 100;
    if (/hazaar|hazar|हज़ार|हजार/i.test(multWord)) multiplier = 1000;
    else if (/lakh|laakh|लाख/i.test(multWord)) multiplier = 100000;
    return { amount: u * multiplier, matchedText: multMatch[0].trim() };
  }

  // 3. Digits with currency markers (₹50, 50 rs, 50 rupaye, etc.)
  const currDigitRegex =
    /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rs|rupaye|rupay|rupees|roopaye|रुपये|रुपए|रु|\/-)/iu;
  const currMatch = text.match(currDigitRegex);
  if (currMatch) {
    return { amount: parseFloat(currMatch[1]), matchedText: currMatch[0].trim() };
  }

  // 4. Standalone digits (ignore digits that are part of the note, e.g. "2" in "2 chai")
  let textForDigits = text;
  if (noteText) {
    textForDigits = textForDigits.replace(noteText, " ");
  }
  const digitMatch = textForDigits.match(
    /(?:^|[\s\p{P}])(\d+(?:\.\d{1,2})?)(?=$|[\s\p{P}])/u
  );
  if (digitMatch) {
    return { amount: parseFloat(digitMatch[1]), matchedText: digitMatch[1].trim() };
  }

  // 5. Standalone number words from dictionary (sau, hazaar, pachaas, bees, etc.)
  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    const wordRegex = new RegExp(
      "(?:^|[\\s\\p{P}])" + word + "(?=$|[\\s\\p{P}])",
      "iu"
    );
    if (wordRegex.test(textForDigits)) {
      return { amount: val, matchedText: word };
    }
  }

  return { amount: null, matchedText: null };
}

const FIRST_PERSON_PRONOUNS = new Set([
  "mere",
  "mujhe",
  "humko",
  "hamne",
  "humne",
  "maine",
  "hamara",
  "humein",
  "apne",
  "apna",
  "me",
  "my",
  "us",
  "we",
  "i",
]);

function isInvalidPersonName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (!lower) return true;
  if (FIRST_PERSON_PRONOUNS.has(lower)) return true;
  if (/^(?:mere|mujhe|humko|hamne|maine|humein)\b/i.test(lower)) return true;
  return false;
}

/**
 * Extracts candidate customer name supporting multi-word names (e.g. "Vikram Mehta").
 */
function extractPersonName(
  text: string,
  amountText: string | null,
  noteText: string | null
): string | null {
  // 1. "Vikram Mehta ne ..." (Subject marker in Hindi - prioritized to avoid "mere ko" trap)
  const neMatch = text.match(
    /(?:^|[\s\p{P}])([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+){0,2}(?:\s+(?:ji|bhai|bhaiya|uncle|sir|aunty))?)\s+(?:ne|ने)(?=$|[\s\p{P}])/iu
  );
  if (neMatch && neMatch[1].trim() && !isInvalidPersonName(neMatch[1])) {
    return cleanPersonName(neMatch[1]);
  }

  // 2. "Ramesh Kumar ko ..." (Recipient marker)
  const koMatch = text.match(
    /(?:^|[\s\p{P}])([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+){0,2}(?:\s+(?:ji|bhai|bhaiya|uncle|sir|aunty))?)\s+(?:ko|को)(?=$|[\s\p{P}])/iu
  );
  if (koMatch && koMatch[1].trim() && !isInvalidPersonName(koMatch[1])) {
    return cleanPersonName(koMatch[1]);
  }

  // 3. "Suresh Sharma se ..." (Source marker)
  const seMatch = text.match(
    /(?:^|[\s\p{P}])([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+){0,2}(?:\s+(?:ji|bhai|bhaiya|uncle|sir|aunty))?)\s+(?:se|से)(?=$|[\s\p{P}])/iu
  );
  if (seMatch && seMatch[1].trim() && !isInvalidPersonName(seMatch[1])) {
    return cleanPersonName(seMatch[1]);
  }

  // 4. "to Amit Sharma", "from Rajesh", "by Rahul"
  const toFromMatch = text.match(
    /(?:^|[\s\p{P}])(?:to|from|by)\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+){0,2}(?:\s+(?:ji|bhai|sir))?)/iu
  );
  if (toFromMatch && toFromMatch[1].trim() && !isInvalidPersonName(toFromMatch[1])) {
    const candidate = toFromMatch[1].replace(/\s+(?:for|on|at|in)\s+.*$/iu, "").trim();
    if (candidate && !isInvalidPersonName(candidate)) {
      return cleanPersonName(candidate);
    }
  }

  // 5. Residual method: strip amount, currency, note, and stop/action words
  let residual = text;
  if (amountText) {
    residual = residual.replace(amountText, " ");
  }
  residual = residual.replace(
    /(?:₹|rs\.?|inr|rupees?|rupaye?|rupay|roopaye?|roopay|रुपये|रुपए|रु|\/-)/giu,
    " "
  );
  if (noteText) {
    residual = residual.replace(noteText, " ");
  }

  // Remove common action and stop words
  residual = residual.replace(
    /(?:^|[\s\p{P}])(?:mere\s+ko|mujhe|humko|hamne|humne|maine|humein|udhar|udhaari|diya|diye|de|baaki|baki|le|gaya|lena|hai|khata|likho|likh|do|gave|given|lent|due|borrowed|jama|aaya|aaye|mila|mile|received|receive|got|paid|payment|settle|settled|vasooli|wasuli|credit|credited|to|from|by|for|in|at|on|ka|ki|ke|ko|se|ne|pe|par|me|mein|online|cash|account|उधार|उधारी|दिया|दिए|बाकी|ले|गया|जमा|आया|आए|मिला|मिले|पेमेंट|वसूल|को|से|ने|है|था|थी|का|की|के)(?=$|[\s\p{P}])/giu,
    " "
  );

  residual = residual.trim().replace(/\s+/g, " ");
  if (residual.length > 0 && !isInvalidPersonName(residual)) {
    return cleanPersonName(residual);
  }

  return null;
}

function cleanPersonName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  // If in Latin alphabet, capitalize title style
  if (/^[a-zA-Z\s]+$/.test(trimmed)) {
    return trimmed
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return trimmed;
}

/**
 * Calculates string similarity between a candidate and an existing customer name (0.0 to 1.0).
 */
export function calculateStringSimilarity(candidate: string, target: string): number {
  const c = candidate.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (!c || !t) return 0;
  if (c === t) return 1.0;

  // Substring / containment boost (e.g. "Ramesh" in "Ramesh Kumar" or "Sharma" in "Sharma Ji")
  if (t.includes(c) || c.includes(t)) {
    const ratio = Math.min(c.length, t.length) / Math.max(c.length, t.length);
    return 0.8 + 0.15 * ratio;
  }

  // Levenshtein distance
  const an = c.length;
  const bn = t.length;
  const matrix: number[][] = Array.from({ length: bn + 1 }, () =>
    new Array(an + 1).fill(0)
  );

  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (t.charAt(j - 1) === c.charAt(i - 1)) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1
        );
      }
    }
  }

  const dist = matrix[bn][an];
  const maxLen = Math.max(an, bn);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Main parser function: parses Hinglish/Hindi transcript into structured transaction intent.
 */
export function parseVoiceTranscript(transcript: string): VoiceParsedIntent {
  const raw = transcript.trim();
  const normalized = normalizeDigits(raw);

  const type = parseTransactionType(normalized);
  const { note, matchedText: noteMatchedText } = extractNote(normalized);
  const { amount, matchedText: amountMatchedText } = extractAmount(
    normalized,
    noteMatchedText
  );
  const personName = extractPersonName(
    normalized,
    amountMatchedText,
    noteMatchedText
  );

  // Confidence calculation
  let confidence = 0.5;
  if (amount !== null && personName !== null) {
    confidence = 0.95;
  } else if (amount !== null) {
    confidence = 0.75;
  } else if (personName !== null) {
    confidence = 0.65;
  } else {
    confidence = 0.2;
  }

  return {
    type,
    amount,
    personName,
    note,
    confidence,
    rawTranscript: raw,
  };
}

export type CustomerLookupItem = {
  id: string;
  name: string;
  phone: string | null;
};

/**
 * Searches and scores existing customers directly against the transcript and candidate name.
 * Database-first: exact full name or multi-word matches in the transcript take precedence.
 */
export function matchCustomerInDatabase(
  transcript: string,
  candidateName: string | null,
  activeCustomers: CustomerLookupItem[]
): {
  matchedPerson: CustomerLookupItem | null;
  candidates: Array<CustomerLookupItem & { score: number }>;
} {
  const normTranscript = transcript.toLowerCase().replace(/[.,!?;:]/g, " ");

  const scored = activeCustomers.map((cust) => {
    const custName = cust.name.toLowerCase().trim();
    let score = 0;

    // 0. Direct Phonetic & Indic (Hindi / Gujarati / Hinglish) transliteration matching
    const phoneticScore = calculatePhoneticMatchScore(transcript, cust.name);
    if (phoneticScore > score) {
      score = phoneticScore;
    }

    // 1. Exact full-name substring in transcript (e.g. "Vikram Mehta" present in transcript)
    const escaped = custName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const fullRegex = new RegExp(`(?:^|[\\s\\p{P}])${escaped}(?=$|[\\s\\p{P}])`, "iu");
    if (fullRegex.test(normTranscript)) {
      score = 1.0;
    } else if (normTranscript.includes(custName)) {
      score = 0.98;
    } else {
      // 2. Token overlap: all parts of a multi-word customer name appear in the transcript
      const parts = custName.split(/\s+/).filter((p) => p.length >= 2);
      if (parts.length > 1) {
        const allPresent = parts.every((part) => {
          const partRegex = new RegExp(
            `(?:^|[\\s\\p{P}])${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[\\s\\p{P}])`,
            "iu"
          );
          return partRegex.test(normTranscript);
        });
        if (allPresent) {
          score = 0.95;
        }
      }

      // 3. First name match (if customer has distinctive first name >= 3 chars)
      if (score === 0 && parts.length > 0) {
        const first = parts[0];
        if (first.length >= 3) {
          const firstRegex = new RegExp(
            `(?:^|[\\s\\p{P}])${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[\\s\\p{P}])`,
            "iu"
          );
          if (firstRegex.test(normTranscript)) {
            score = 0.8;
          }
        }
      }

      // 4. Fallback to candidate name similarity
      if (candidateName) {
        const sim = calculateStringSimilarity(candidateName, cust.name);
        score = Math.max(score, sim);
      }
    }

    return {
      ...cust,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const candidates = scored.filter((c) => c.score >= 0.4).slice(0, 5);

  const matchedPerson =
    scored.length > 0 && scored[0].score >= 0.7
      ? { id: scored[0].id, name: scored[0].name, phone: scored[0].phone }
      : null;

  return { matchedPerson, candidates };
}
