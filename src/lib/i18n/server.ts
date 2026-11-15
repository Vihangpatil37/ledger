import { cookies } from "next/headers";
import { en, type TranslationKey } from "./dictionaries/en";
import { gu } from "./dictionaries/gu";
import { hi } from "./dictionaries/hi";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./types";

const DICTIONARIES = {
  en,
  gu,
  hi,
};

export async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get(LOCALE_COOKIE)?.value;
    if (val === "gu" || val === "hi" || val === "en") {
      return val;
    }
  } catch {
    // cookies() unavailable outside request context
  }
  return DEFAULT_LOCALE;
}

export async function getServerTranslations(localeOverride?: Locale) {
  const locale = localeOverride || (await getLocale());
  const dict = DICTIONARIES[locale] || en;

  return {
    locale,
    t: (key: TranslationKey): string => dict[key] ?? en[key] ?? key,
  };
}
