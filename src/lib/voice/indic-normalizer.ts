/**
 * Indic Multilingual Normalization and Phonetic Ranking Engine
 */

export type SupportedSpeechLocale = "hi-IN" | "gu-IN" | "en-IN";

/**
 * Map application locale selections directly to standard BCP-47 speech tags
 */
export function mapToBcp47SpeechTag(
  locale: string | undefined
): SupportedSpeechLocale {
  if (!locale) return "en-IN";
  const normalized = locale.toLowerCase().trim();

  if (normalized.startsWith("hi")) {
    return "hi-IN";
  }
  if (normalized.startsWith("gu")) {
    return "gu-IN";
  }
  return "en-IN";
}

/**
 * Forward chosen language code to Groq Whisper to prevent language guesswork
 */
export function mapToWhisperLanguageCode(
  locale: string | undefined
): string | undefined {
  if (!locale) return undefined;
  const normalized = locale.toLowerCase().trim();
  if (normalized.startsWith("hi")) return "hi";
  if (normalized.startsWith("gu")) return "gu";
  if (normalized.startsWith("en")) return "en";
  return undefined;
}

const DEVANAGARI_DIGIT_MAP: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

/**
 * Convert spoken Devanagari numerals into plain Arabic integer digits
 */
export function convertDevanagariNumeralsToArabic(text: string): string {
  if (!text) return "";
  return text.replace(
    /[०-९]/g,
    (digit) => DEVANAGARI_DIGIT_MAP[digit] || digit
  );
}

const GUJARATI_DIGIT_MAP: Record<string, string> = {
  "૦": "0",
  "૧": "1",
  "૨": "2",
  "૩": "3",
  "૪": "4",
  "૫": "5",
  "૬": "6",
  "૭": "7",
  "૮": "8",
  "૯": "9",
};

/**
 * Convert spoken Gujarati numerals into plain Arabic integer digits
 */
export function convertGujaratiNumeralsToArabic(text: string): string {
  if (!text) return "";
  return text.replace(
    /[૦-૯]/g,
    (digit) => GUJARATI_DIGIT_MAP[digit] || digit
  );
}

const SPOKEN_NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  che: 6,
  chhah: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  terah: 13,
  chaudah: 14,
  pandrah: 15,
  solah: 16,
  satrah: 17,
  atharah: 18,
  unnis: 19,
  bees: 20,
  tees: 30,
  chalis: 40,
  pachas: 50,
  saath: 60,
  sattar: 70,
  assi: 80,
  nabbe: 90,
  sau: 100,
  so: 100,
  hazaar: 1000,
  hazar: 1000,
  lakh: 100000,
};

/**
 * Translate spoken Hindi number phrases like paanch sau into numeric values
 */
export function translateSpokenNumberPhrases(text: string): string {
  if (!text) return "";
  return text.replace(
    /\b(ek|do|teen|chaar|char|paanch|panch|che|saat|aath|nau|das)\s+(sau|so|hazaar|hazar)\b/gi,
    (_, numStr, multStr) => {
      const num = SPOKEN_NUMBER_WORDS[numStr.toLowerCase()] || 1;
      const mult = SPOKEN_NUMBER_WORDS[multStr.toLowerCase()] || 1;
      return String(num * mult);
    }
  );
}

/**
 * Standardize informal Hindi currency terms into clear decimal representations
 */
export function standardizeInformalCurrencyTerms(text: string): string {
  if (!text) return "";
  return text
    .replace(/\bdedh\s+sau\b/gi, "150")
    .replace(/\bdhai\s+sau\b/gi, "250")
    .replace(/\bdedh\s+(?:hazaar|hazar)\b/gi, "1500")
    .replace(/\bdhai\s+(?:hazaar|hazar)\b/gi, "2500")
    .replace(/\bsaadhe\s+teen\s+sau\b/gi, "350")
    .replace(/\bsaadhe\s+char\s+sau\b/gi, "450");
}





