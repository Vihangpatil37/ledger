import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEME_COOKIE, THEME_STORAGE_KEY, type Theme } from "@/lib/theme/types";
import { en } from "@/lib/i18n/dictionaries/en";
import { gu } from "@/lib/i18n/dictionaries/gu";
import { hi } from "@/lib/i18n/dictionaries/hi";

describe("Theme system and constants", () => {
  it("has default theme as system", () => {
    expect(DEFAULT_THEME).toBe("system");
    expect(THEME_COOKIE).toBe("theme");
    expect(THEME_STORAGE_KEY).toBe("theme");
  });

  it("supports all required themes", () => {
    const validThemes: Theme[] = ["light", "dark", "system"];
    expect(validThemes).toHaveLength(3);
  });

  it("has dictionary translations for all theme keys in all 3 languages", () => {
    const themeKeys = [
      "settings.themeTitle",
      "settings.themeSubtitle",
      "theme.light",
      "theme.dark",
      "theme.system",
      "theme.lightDesc",
      "theme.darkDesc",
      "theme.systemDesc",
    ] as const;

    for (const key of themeKeys) {
      expect(en[key]).toBeTruthy();
      expect(gu[key]).toBeTruthy();
      expect(hi[key]).toBeTruthy();

      expect(typeof en[key]).toBe("string");
      expect(typeof gu[key]).toBe("string");
      expect(typeof hi[key]).toBe("string");
    }
  });
});
