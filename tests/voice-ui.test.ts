import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
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

  describe("Voice Khata icon definition & navigation integration", () => {
    it("source file contains complete microphone capsule and footing base", () => {
      const iconSource = fs.readFileSync(
        path.join(process.cwd(), "src", "components", "voice", "voice-icon.tsx"),
        "utf-8"
      );
      expect(iconSource).toContain('line x1="8" y1="22" x2="16" y2="22"');
      expect(iconSource).toContain('path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"');
    });

    it("mobile navigation includes voice modal trigger button", () => {
      const mobileNavSource = fs.readFileSync(
        path.join(process.cwd(), "src", "components", "shell", "mobile-nav.tsx"),
        "utf-8"
      );
      expect(mobileNavSource).toContain("grid-cols-4");
      expect(mobileNavSource).toContain("openGlobalVoiceModal");
      expect(mobileNavSource).toContain("VoiceKhataIcon");
    });

    it("desktop side navigation includes voice modal trigger with Alt+V shortcut", () => {
      const sideNavSource = fs.readFileSync(
        path.join(process.cwd(), "src", "components", "shell", "nav.tsx"),
        "utf-8"
      );
      expect(sideNavSource).toContain("openGlobalVoiceModal");
      expect(sideNavSource).toContain("Alt+V");
      expect(sideNavSource).toContain("VoiceKhataIcon");
    });
  });
});
