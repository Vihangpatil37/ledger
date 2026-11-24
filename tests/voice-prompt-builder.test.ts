import { describe, it, expect } from "vitest";
import {
  cleanCustomerNameForPrompt,
  rankCustomerNames,
  compileConditionedWhisperPrompt,
  getLocalePromptKeywords,
  MAX_WHISPER_PROMPT_CHARS,
  STANDARD_KHATA_TERMINOLOGY,
  REGIONAL_BOOKKEEPING_VERBS,
} from "@/lib/voice/prompt-builder";

describe("Voice Prompt Builder and Conditioning", () => {
  describe("cleanCustomerNameForPrompt", () => {
    it("strips emojis and special symbols", () => {
      const raw = "Vikram Mehta ☕ (VIP) #1!";
      const cleaned = cleanCustomerNameForPrompt(raw);
      expect(cleaned).toBe("Vikram Mehta VIP 1");
    });

    it("strips phone numbers from name strings", () => {
      const raw = "Ramesh Bhai 9876543210";
      const cleaned = cleanCustomerNameForPrompt(raw);
      expect(cleaned).toBe("Ramesh Bhai");
    });
  });

  describe("rankCustomerNames", () => {
    it("orders customer names by update timestamp descending", () => {
      const customers = [
        { id: "1", name: "Anand", updatedAt: new Date("2026-01-01") },
        { id: "2", name: "Bhavik", updatedAt: new Date("2026-05-01") },
        { id: "3", name: "Chetan", updatedAt: new Date("2026-03-01") },
      ];

      const ranked = rankCustomerNames(customers);
      expect(ranked).toEqual(["Bhavik", "Chetan", "Anand"]);
    });

    it("deduplicates identical cleaned names", () => {
      const customers = [
        { id: "1", name: "Suresh Patel", updatedAt: new Date("2026-05-01") },
        { id: "2", name: "Suresh Patel (Old)", updatedAt: new Date("2026-04-01") },
      ];

      const ranked = rankCustomerNames(customers);
      expect(ranked).toContain("Suresh Patel");
    });
  });

  describe("compileConditionedWhisperPrompt", () => {
    it("includes standard khata terminology and customer names", () => {
      const names = ["Dipali", "Vikram Mehta"];
      const prompt = compileConditionedWhisperPrompt(names);

      for (const term of STANDARD_KHATA_TERMINOLOGY.slice(0, 3)) {
        expect(prompt).toContain(term);
      }
      for (const verb of REGIONAL_BOOKKEEPING_VERBS.slice(0, 3)) {
        expect(prompt).toContain(verb);
      }
      expect(prompt).toContain("Dipali");
      expect(prompt).toContain("Vikram Mehta");
    });

    it("enforces strict maximum character limit of 800", () => {
      const longNameList = Array.from({ length: 100 }, (_, i) => `CustomerNumber${i}LongName`);
      const prompt = compileConditionedWhisperPrompt(longNameList);

      expect(prompt.length).toBeLessThanOrEqual(MAX_WHISPER_PROMPT_CHARS);
    });
  });

  describe("getLocalePromptKeywords", () => {
    it("returns Hindi keywords for hi-IN locale", () => {
      const keywords = getLocalePromptKeywords("hi-IN");
      expect(keywords).toContain("रुपये");
      expect(keywords).toContain("उधार");
      expect(keywords).toContain("जमा");
    });

    it("returns Gujarati keywords for gu-IN locale", () => {
      const keywords = getLocalePromptKeywords("gu-IN");
      expect(keywords).toContain("રૂપિયા");
      expect(keywords).toContain("ઉધાર");
      expect(keywords).toContain("જમા");
    });

    it("returns empty list for English or undefined", () => {
      expect(getLocalePromptKeywords("en-IN")).toEqual([]);
      expect(getLocalePromptKeywords(undefined)).toEqual([]);
    });
  });
});
