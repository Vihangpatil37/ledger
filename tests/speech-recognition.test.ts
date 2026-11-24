import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapLocaleToSpeechLang,
  VOICE_MODAL_EVENT,
  openGlobalVoiceModal,
} from "@/hooks/use-speech-recognition";

// Mock SpeechRecognition class
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "en-IN";
  maxAlternatives = 1;

  onstart: (() => void) | null = null;
  onresult: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn(() => {
    this.onstart?.();
  });

  stop = vi.fn(() => {
    this.onend?.();
  });

  abort = vi.fn(() => {
    this.onend?.();
  });
}

describe("Speech Recognition helpers and logic", () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalWindow = globalThis.window;
  });

  it("exports VOICE_MODAL_EVENT constant", () => {
    expect(VOICE_MODAL_EVENT).toBe("chai-ledger:open-voice-modal");
  });

  it("dispatches custom event on openGlobalVoiceModal", () => {
    const spy = vi.fn();
    // @ts-expect-error test mock
    globalThis.window = { dispatchEvent: spy };
    openGlobalVoiceModal();
    expect(spy).toHaveBeenCalledTimes(1);
    const event = spy.mock.calls[0][0];
    expect(event.type).toBe("chai-ledger:open-voice-modal");

    globalThis.window = originalWindow;
  });

  it("handles openGlobalVoiceModal gracefully when window is undefined", () => {
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    expect(() => openGlobalVoiceModal()).not.toThrow();
    globalThis.window = originalWindow;
  });

  describe("mapLocaleToSpeechLang", () => {
    it("maps Hindi to hi-IN", () => {
      expect(mapLocaleToSpeechLang("hi")).toBe("hi-IN");
      expect(mapLocaleToSpeechLang("HI")).toBe("hi-IN");
    });

    it("maps Gujarati to gu-IN", () => {
      expect(mapLocaleToSpeechLang("gu")).toBe("gu-IN");
      expect(mapLocaleToSpeechLang("GU")).toBe("gu-IN");
    });

    it("maps English and default to en-IN", () => {
      expect(mapLocaleToSpeechLang("en")).toBe("en-IN");
      expect(mapLocaleToSpeechLang("EN")).toBe("en-IN");
      expect(mapLocaleToSpeechLang(undefined)).toBe("en-IN");
      expect(mapLocaleToSpeechLang("other")).toBe("en-IN");
    });
  });

  describe("MockSpeechRecognition class simulation", () => {
    it("configures continuous, interimResults, and lang correctly", () => {
      const recognition = new MockSpeechRecognition();
      recognition.lang = mapLocaleToSpeechLang("hi");
      recognition.interimResults = true;
      recognition.continuous = false;

      expect(recognition.lang).toBe("hi-IN");
      expect(recognition.interimResults).toBe(true);
      expect(recognition.continuous).toBe(false);

      const startSpy = vi.fn();
      recognition.onstart = startSpy;
      recognition.start();
      expect(startSpy).toHaveBeenCalled();
      expect(recognition.start).toHaveBeenCalledTimes(1);

      const endSpy = vi.fn();
      recognition.onend = endSpy;
      recognition.stop();
      expect(endSpy).toHaveBeenCalled();
    });

    it("processes speech recognition results structure", () => {
      const recognition = new MockSpeechRecognition();
      let capturedTranscript = "";

      recognition.onresult = (event: unknown) => {
        const ev = event as {
          resultIndex: number;
          results: Array<{ 0: { transcript: string }; isFinal: boolean }>;
        };
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          capturedTranscript += ev.results[i][0].transcript;
        }
      };

      recognition.onresult({
        resultIndex: 0,
        results: [
          {
            0: { transcript: "Vikram Mehta ne 5000 diye" },
            isFinal: true,
          },
        ],
      });

      expect(capturedTranscript).toBe("Vikram Mehta ne 5000 diye");
    });
  });
});
