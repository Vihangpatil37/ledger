import { describe, it, expect } from "vitest";
import {
  convertDevanagariNumeralsToArabic,
  convertGujaratiNumeralsToArabic,
  translateSpokenNumberPhrases,
  standardizeInformalCurrencyTerms,
  translateGujaratiPaymentTerms,
  cleanTranscriptionPunctuation,
  doubleMetaphoneKey,
  calculateLevenshteinDistance,
  rankCandidateCustomerMatches,
} from "@/lib/voice/indic-normalizer";

describe("Indic Multilingual Normalization", () => {
  describe("convertDevanagariNumeralsToArabic", () => {
    it("converts single Devanagari digits to Arabic numerals", () => {
      expect(convertDevanagariNumeralsToArabic("५")).toBe("5");
      expect(convertDevanagariNumeralsToArabic("०")).toBe("0");
    });

    it("converts multi-digit amounts in spoken sentences", () => {
      expect(
        convertDevanagariNumeralsToArabic("रमेश ने ५०० रुपये दिए")
      ).toBe("रमेश ने 500 रुपये दिए");
    });
  });

  describe("convertGujaratiNumeralsToArabic", () => {
    it("converts Gujarati numerals to Arabic digits", () => {
      expect(convertGujaratiNumeralsToArabic("૫૦૦")).toBe("500");
      expect(convertGujaratiNumeralsToArabic("૨૫૦")).toBe("250");
    });

    it("converts mixed Gujarati phrases", () => {
      expect(
        convertGujaratiNumeralsToArabic("સુરેશ ૧૫૦૦ રૂપિયા")
      ).toBe("સુરેશ 1500 રૂપિયા");
    });
  });

  describe("translateSpokenNumberPhrases", () => {
    it("translates Hindi phrases like paanch sau into numeric digits", () => {
      expect(translateSpokenNumberPhrases("paanch sau")).toBe("500");
      expect(translateSpokenNumberPhrases("do hazaar")).toBe("2000");
    });
  });

  describe("standardizeInformalCurrencyTerms", () => {
    it("standardizes dedh sau to 150 and dhai sau to 250", () => {
      expect(standardizeInformalCurrencyTerms("dedh sau")).toBe("150");
      expect(standardizeInformalCurrencyTerms("dhai sau")).toBe("250");
      expect(standardizeInformalCurrencyTerms("dedh hazaar")).toBe("1500");
      expect(standardizeInformalCurrencyTerms("dhai hazaar")).toBe("2500");
    });
  });

  describe("translateGujaratiPaymentTerms", () => {
    it("translates aapya to udhar diya and lidha to jama mila", () => {
      expect(translateGujaratiPaymentTerms("aapya")).toBe("udhar diya");
      expect(translateGujaratiPaymentTerms("lidha")).toBe("jama mila");
    });
  });

  describe("cleanTranscriptionPunctuation", () => {
    it("strips trailing periods, commas, and filler words", () => {
      expect(cleanTranscriptionPunctuation("umm Vikram 500 diya, bhai.")).toBe(
        "Vikram 500 diya"
      );
    });
  });

  describe("doubleMetaphoneKey", () => {
    it("matches regional phonetic variants with identical phonetic hash", () => {
      expect(doubleMetaphoneKey("Deepali")).toBe(doubleMetaphoneKey("Dipali"));
      expect(doubleMetaphoneKey("Vikram")).toBe(doubleMetaphoneKey("Bikram"));
      expect(doubleMetaphoneKey("Suresh")).toBe(doubleMetaphoneKey("Sures"));
    });
  });

  describe("calculateLevenshteinDistance", () => {
    it("calculates exact edit distances", () => {
      expect(calculateLevenshteinDistance("Vikram", "Vikram")).toBe(0);
      expect(calculateLevenshteinDistance("Vikram", "Vikran")).toBe(1);
    });
  });

  describe("rankCandidateCustomerMatches", () => {
    it("ranks closest spelling and phonetic match at the top", () => {
      const candidates = ["Vikram Mehta", "Dipali", "Ramesh Kumar"];
      const results = rankCandidateCustomerMatches("Bikram Mehta", candidates);
      expect(results[0].customerName).toBe("Vikram Mehta");
      expect(results[0].score).toBeGreaterThan(0.8);
      expect(results[0].phoneticMatch).toBe(true);
    });
  });
});
