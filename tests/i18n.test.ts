import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { gu } from "@/lib/i18n/dictionaries/gu";
import { hi } from "@/lib/i18n/dictionaries/hi";
import { getServerTranslations } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/types";

describe("i18n dictionaries and key parity", () => {
  const enKeys = Object.keys(en).sort();
  const guKeys = Object.keys(gu).sort();
  const hiKeys = Object.keys(hi).sort();

  it("has supported locales defined", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(LOCALES.map((l) => l.code)).toEqual(["en", "gu", "hi"]);
  });

  it("has exact 100% key parity across English, Gujarati, and Hindi", () => {
    expect(guKeys).toEqual(enKeys);
    expect(hiKeys).toEqual(enKeys);
  });

  it("has non-empty string translations for every single key", () => {
    for (const key of enKeys) {
      const enVal = en[key as keyof typeof en];
      const guVal = gu[key as keyof typeof gu];
      const hiVal = hi[key as keyof typeof hi];

      expect(typeof enVal).toBe("string");
      expect(enVal.trim().length).toBeGreaterThan(0);

      expect(typeof guVal).toBe("string");
      expect(guVal.trim().length).toBeGreaterThan(0);

      expect(typeof hiVal).toBe("string");
      expect(hiVal.trim().length).toBeGreaterThan(0);
    }
  });

  it("resolves translations with getServerTranslations for each locale", async () => {
    const enServer = await getServerTranslations("en");
    expect(enServer.t("nav.dashboard")).toBe("Dashboard");
    expect(enServer.t("entry.gave")).toBe("Udhar");
    expect(enServer.t("queue.remindWhatsApp")).toBe("WhatsApp");
    expect(enServer.t("queue.promise")).toBe("Promise");

    const guServer = await getServerTranslations("gu");
    expect(guServer.t("nav.dashboard")).toBe("ડેશબોર્ડ");
    expect(guServer.t("entry.gave")).toBe("ઉધાર આપ્યા");
    expect(guServer.t("queue.remindWhatsApp")).toBe("વોટ્સએપ");
    expect(guServer.t("queue.promise")).toBe("વાયદો");

    const hiServer = await getServerTranslations("hi");
    expect(hiServer.t("nav.dashboard")).toBe("डैशबोर्ड");
    expect(hiServer.t("entry.gave")).toBe("उधार दिया");
    expect(hiServer.t("queue.remindWhatsApp")).toBe("व्हाट्सएप");
    expect(hiServer.t("queue.promise")).toBe("वादा");
  });
});
