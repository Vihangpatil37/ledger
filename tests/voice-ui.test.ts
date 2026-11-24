import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  openGlobalVoiceModal,
  VOICE_MODAL_EVENT,
  mapLocaleToSpeechLang,
} from "@/hooks/use-speech-recognition";
import { en } from "@/lib/i18n/dictionaries/en";
import { hi } from "@/lib/i18n/dictionaries/hi";
import { gu } from "@/lib/i18n/dictionaries/gu";

describe("Global Voice Modal & UI helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exports VOICE_MODAL_EVENT constant", () => {
    expect(VOICE_MODAL_EVENT).toBe("chai-ledger:open-voice-modal");
  });

  it("maps app locale codes to BCP 47 SpeechRecognition language tags", () => {
    expect(mapLocaleToSpeechLang("en")).toBe("en-IN");
    expect(mapLocaleToSpeechLang("hi")).toBe("hi-IN");
    expect(mapLocaleToSpeechLang("gu")).toBe("gu-IN");
    expect(mapLocaleToSpeechLang(undefined)).toBe("en-IN");
    expect(mapLocaleToSpeechLang("unknown")).toBe("en-IN");
  });

  it("dispatches custom event on openGlobalVoiceModal", () => {
    const dispatchSpy = vi.fn();
    const originalWindow = globalThis.window;
    // @ts-expect-error test mock
    globalThis.window = {
      dispatchEvent: dispatchSpy,
    };

    openGlobalVoiceModal();

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.type).toBe("chai-ledger:open-voice-modal");

    globalThis.window = originalWindow;
  });

  it("handles openGlobalVoiceModal gracefully when window is undefined (SSR)", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate SSR
    delete globalThis.window;

    expect(() => openGlobalVoiceModal()).not.toThrow();

    globalThis.window = originalWindow;
  });

  it("has complete voice translations across all 3 languages", () => {
    const voiceKeys = [
      "voice.title",
      "voice.subtitle",
      "voice.startRecording",
      "voice.stopRecording",
      "voice.listening",
      "voice.transcribing",
      "voice.parsing",
      "voice.exampleHint",
      "voice.previewTitle",
      "voice.confirm",
      "voice.saving",
      "voice.tryAgain",
      "voice.customer",
      "voice.newCustomer",
      "voice.existingCustomer",
      "voice.customerNotFound",
      "voice.selectCustomer",
      "voice.changeCustomer",
      "voice.type",
      "voice.amount",
      "voice.note",
      "voice.transcript",
      "voice.manualFallback",
      "voice.analyze",
      "voice.success",
      "voice.quickVoiceTyping",
    ] as const;

    for (const key of voiceKeys) {
      expect(en[key]).toBeTruthy();
      expect(typeof en[key]).toBe("string");

      expect(hi[key]).toBeTruthy();
      expect(typeof hi[key]).toBe("string");

      expect(gu[key]).toBeTruthy();
      expect(typeof gu[key]).toBe("string");
    }
  });
});
