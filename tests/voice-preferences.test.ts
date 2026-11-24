import { describe, it, expect, beforeEach, vi, afterAll } from "vitest";
import {
  saveVoiceEnginePreference,
  getSavedVoiceEnginePreference,
  VOICE_ENGINE_STORAGE_KEY,
} from "@/lib/voice/voice-preferences";

class MockLocalStorage {
  public store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("Voice Engine Preferences Local Storage", () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", { localStorage: mockStorage });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to BROWSER mode when local storage is empty", () => {
    const preference = getSavedVoiceEnginePreference();
    expect(preference).toBe("BROWSER");
  });

  it("saves and retrieves AUDIO_RECORDING preference", () => {
    saveVoiceEnginePreference("AUDIO_RECORDING");
    expect(mockStorage.getItem(VOICE_ENGINE_STORAGE_KEY)).toBe(
      "AUDIO_RECORDING"
    );

    const preference = getSavedVoiceEnginePreference();
    expect(preference).toBe("AUDIO_RECORDING");
  });

  it("saves and retrieves BROWSER preference", () => {
    saveVoiceEnginePreference("BROWSER");
    expect(mockStorage.getItem(VOICE_ENGINE_STORAGE_KEY)).toBe("BROWSER");

    const preference = getSavedVoiceEnginePreference();
    expect(preference).toBe("BROWSER");
  });

  it("falls back to default if stored value is invalid", () => {
    mockStorage.setItem(VOICE_ENGINE_STORAGE_KEY, "INVALID_ENGINE");
    const preference = getSavedVoiceEnginePreference("BROWSER");
    expect(preference).toBe("BROWSER");
  });

  it("gracefully handles localStorage exceptions without throwing", () => {
    vi.spyOn(mockStorage, "getItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const preference = getSavedVoiceEnginePreference("BROWSER");
    expect(preference).toBe("BROWSER");
  });
});

