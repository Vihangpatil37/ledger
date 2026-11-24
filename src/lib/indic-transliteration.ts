/**
 * Indic Transliteration and Phonetic Matching for Indian Ledger
 * Supports Devanagari (Hindi) and Gujarati script transliteration to Latin,
 * honorific suffix removal (bhai, ben, ji, kaka, etc.), and phonetic normalization.
 */

const CONSONANTS: Record<string, string> = {
  // Devanagari
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "f", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  "ड़": "d", "ढ़": "dh", "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z", "फ़": "f",
  // Gujarati
  "ક": "k", "ખ": "kh", "ગ": "g", "ઘ": "gh",
  "ચ": "ch", "છ": "chh", "જ": "j", "ઝ": "jh",
  "ટ": "t", "ઠ": "th", "ડ": "d", "ઢ": "dh", "ણ": "n",
  "ત": "t", "થ": "th", "દ": "d", "ધ": "dh", "ન": "n",
  "પ": "p", "ફ": "f", "બ": "b", "ભ": "bh", "મ": "m",
  "ય": "y", "ર": "r", "લ": "l", "વ": "v", "શ": "sh", "ષ": "sh", "સ": "s", "હ": "h", "ળ": "l",
};

const VOWELS: Record<string, string> = {
  // Devanagari
  "अ": "a", "आ": "a", "इ": "i", "ई": "i", "उ": "u", "ऊ": "u", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
  // Gujarati
  "અ": "a", "આ": "a", "ઇ": "i", "ઈ": "i", "ઉ": "u", "ઊ": "u", "ઋ": "ri", "એ": "e", "ઐ": "ai", "ઓ": "o", "ઔ": "au",
};

const MATRAS: Record<string, string> = {
  // Devanagari
  "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ं": "n", "ँ": "n", "ः": "h",
  // Gujarati
  "ા": "a", "િ": "i", "ી": "i", "ુ": "u", "ૂ": "u", "ૃ": "ri", "ે": "e", "ૈ": "ai", "ો": "o", "ૌ": "au", "ં": "n", "ઃ": "h",
};

const VIRAMA = new Set(["्", "્"]);

/**
 * Transliterates Devanagari or Gujarati text into Latin alphabet phonetics.
 */
export function transliterateIndicToLatin(text: string): string {
  let out = "";
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (VOWELS[ch]) {
      out += VOWELS[ch];
    } else if (CONSONANTS[ch]) {
      out += CONSONANTS[ch];
      if (next && VIRAMA.has(next)) {
        // Halant/Virama: consonant cluster without implicit vowel
        i++;
      } else if (next && MATRAS[next]) {
        out += MATRAS[next];
        i++;
      } else if (next && (CONSONANTS[next] || VOWELS[next])) {
        out += "a";
      }
    } else if (MATRAS[ch]) {
      out += MATRAS[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Phonetically normalizes a name string for cross-accent / spelling comparison:
 * - Strips honorifics (bhai, ben, ji, kaka, seth, bhaiya, uncle, etc.)
 * - Maps equivalent vowels (ee -> i, oo -> u, aa -> a)
 * - Maps equivalent consonants (w -> v, sh -> s, ph -> f, etc.)
 * - Deduplicates repeated consonants (patell -> patel)
 */
export function normalizePhonetic(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    // Honorific suffixes as standalone words or attached at end
    .replace(/\b(bhai|bhaiya|ben|kaka|uncle|aunty|seth|sethji|sheth|sahab|saab|ji|kumar|singh)\b/gi, " ")
    .replace(/(bhai|ben|kaka|seth|sheth|ji)$/i, "")
    // Vowel equivalences
    .replace(/ee+/g, "i")
    .replace(/oo+/g, "u")
    .replace(/aa+/g, "a")
    // Consonants
    .replace(/w/g, "v")
    .replace(/sh/g, "s")
    .replace(/ph/g, "f")
    .replace(/kh/g, "k")
    .replace(/gh/g, "g")
    .replace(/bh/g, "b")
    .replace(/dh/g, "d")
    .replace(/th/g, "t")
    .replace(/ch+/g, "c")
    .replace(/mehata/g, "mehta")
    .replace(/([a-z])\1+/g, "$1") // dedup double consonants
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Scores how closely a customer's English name matches a spoken transcript
 * (which may be in English, Hinglish, Devanagari Hindi, or Gujarati).
 * Returns a confidence score between 0.0 and 1.0.
 */
export function calculatePhoneticMatchScore(
  transcript: string,
  customerEnglishName: string
): number {
  const normCustomer = customerEnglishName.toLowerCase().trim();
  const phoneticCustomer = normalizePhonetic(customerEnglishName);

  // 1. Check raw transcript
  const rawTrans = transcript.toLowerCase();
  if (rawTrans.includes(normCustomer)) {
    return 1.0;
  }

  // 2. Transliterate transcript if Indic characters are detected
  const hasIndic = /[\u0900-\u097F\u0A80-\u0AFF]/.test(transcript);
  const latinTranscript = hasIndic ? transliterateIndicToLatin(transcript).toLowerCase() : rawTrans;

  if (latinTranscript.includes(normCustomer)) {
    return 1.0;
  }

  // 3. Phonetic match
  const phoneticTranscript = normalizePhonetic(latinTranscript);
  if (phoneticTranscript.includes(phoneticCustomer)) {
    return 0.98;
  }

  // 4. Token overlap of name parts (e.g. "vikram" and "mehta")
  const custParts = phoneticCustomer.split(/\s+/).filter((p) => p.length >= 2);
  if (custParts.length > 1) {
    const allPartsInTranscript = custParts.every((part) =>
      phoneticTranscript.split(/\s+/).some((tWord) => tWord === part || tWord.includes(part) || part.includes(tWord))
    );
    if (allPartsInTranscript) {
      return 0.95;
    }
  }

  // 5. First name phonetic match
  if (custParts.length > 0) {
    const firstName = custParts[0];
    if (firstName.length >= 3) {
      const words = phoneticTranscript.split(/\s+/);
      if (words.some((w) => w === firstName || (w.length >= 4 && (w.startsWith(firstName) || firstName.startsWith(w))))) {
        return 0.85;
      }
    }
  }

  return 0.0;
}
