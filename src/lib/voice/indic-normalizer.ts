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



