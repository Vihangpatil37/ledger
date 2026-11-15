export type Locale = "en" | "hi" | "gu";

export const LOCALES: Array<{
  code: Locale;
  label: string;
  nativeName: string;
  shortLabel: string;
}> = [
  { code: "en", label: "English", nativeName: "English", shortLabel: "EN" },
  { code: "gu", label: "Gujarati", nativeName: "ગુજરાતી", shortLabel: "ગુ" },
  { code: "hi", label: "Hindi", nativeName: "हिंदी", shortLabel: "हि" },
];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ledger_lang";
