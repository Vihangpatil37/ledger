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
