"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const VOICE_MODAL_EVENT = "chai-ledger:open-voice-modal";

export function openGlobalVoiceModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(VOICE_MODAL_EVENT));
  }
}

export interface SpeechRecognitionHookOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onEnd?: (finalTranscript: string) => void;
  onError?: (error: string, code?: string) => void;
}

export interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  errorCode: string | null;
  isNetworkError: boolean;
  audioLevel: number; // 0 to 1 for visualizer animations
  isSupported: boolean;
}

export interface UseSpeechRecognitionReturn extends SpeechRecognitionState {
  startListening: (options?: SpeechRecognitionHookOptions) => Promise<void>;
  stopListening: () => void;
  abortListening: () => void;
  reset: () => void;
}

// Browser SpeechRecognition interface types
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      length: number;
      item(index: number): { transcript: string; confidence: number };
      isFinal: boolean;
      [index: number]: { transcript: string; confidence: number };
    };
    [index: number]: {
      length: number;
      item(index: number): { transcript: string; confidence: number };
      isFinal: boolean;
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: BrowserSpeechRecognition, ev: Event) => void) | null;
  onend: ((this: BrowserSpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: BrowserSpeechRecognition, ev: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((this: BrowserSpeechRecognition, ev: SpeechRecognitionEventLike) => void) | null;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

/**
 * Maps application locale code to BCP 47 Speech Recognition language tag
 */
export function mapLocaleToSpeechLang(locale?: string): string {
  switch (locale?.toLowerCase()) {
    case "hi":
      return "hi-IN";
    case "gu":
      return "gu-IN";
    case "en":
    default:
      return "en-IN";
  }
}

export function useSpeechRecognition(
  initialOptions: SpeechRecognitionHookOptions = {}
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const optionsRef = useRef<SpeechRecognitionHookOptions>(initialOptions);
  optionsRef.current = initialOptions;

  const finalTranscriptRef = useRef("");
  const animFrameRef = useRef<number | null>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    const supported = !!getSpeechRecognitionConstructor();
    setIsSupported(supported);
  }, []);

  const stopAudioLevelSimulation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startAudioLevelSimulation = useCallback(() => {
    stopAudioLevelSimulation();
    let tick = 0;
    const animate = () => {
      if (!isListeningRef.current) {
        setAudioLevel(0);
        return;
      }
      tick += 0.15;
      // Oscillate with organic wave variation between 0.25 and 0.85
      const wave = Math.sin(tick) * 0.3 + Math.cos(tick * 1.7) * 0.15 + 0.45;
      const normalized = Math.max(0.15, Math.min(1, wave));
      setAudioLevel(normalized);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [stopAudioLevelSimulation]);

  const cleanup = useCallback(() => {
    isListeningRef.current = false;
    stopAudioLevelSimulation();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, [stopAudioLevelSimulation]);

  const reset = useCallback(() => {
    cleanup();
    setIsListening(false);
    setTranscript("");
    setInterimTranscript("");
    setFinalTranscript("");
    finalTranscriptRef.current = "";
    setError(null);
    setErrorCode(null);
    setAudioLevel(0);
  }, [cleanup]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    stopAudioLevelSimulation();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, [stopAudioLevelSimulation]);

  const abortListening = useCallback(() => {
    cleanup();
    setIsListening(false);
  }, [cleanup]);

  const startListening = useCallback(
    async (overrideOptions?: SpeechRecognitionHookOptions) => {
      const Constructor = getSpeechRecognitionConstructor();
      if (!Constructor) {
        const errMsg = "Web Speech API is not supported in this browser.";
        setError(errMsg);
        optionsRef.current.onError?.(errMsg);
        return;
      }

      cleanup();

      const mergedOptions = { ...optionsRef.current, ...overrideOptions };
      const lang = mergedOptions.lang || mapLocaleToSpeechLang();
      const continuous = mergedOptions.continuous ?? false;
      const interimResults = mergedOptions.interimResults ?? true;

      finalTranscriptRef.current = "";
      setTranscript("");
      setInterimTranscript("");
      setFinalTranscript("");
      setError(null);
      setErrorCode(null);

      try {
        const recognition = new Constructor();
        recognitionRef.current = recognition;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = lang;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isListeningRef.current = true;
          setIsListening(true);
          setError(null);
          setErrorCode(null);
          startAudioLevelSimulation();
        };

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let currentInterim = "";
          let currentFinal = finalTranscriptRef.current;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0]?.transcript || "";
            if (result.isFinal) {
              currentFinal += (currentFinal ? " " : "") + text.trim();
            } else {
              currentInterim += (currentInterim ? " " : "") + text.trim();
            }
          }

          finalTranscriptRef.current = currentFinal;
          const fullTranscript = (currentFinal + " " + currentInterim).trim();

          setFinalTranscript(currentFinal);
          setInterimTranscript(currentInterim);
          setTranscript(fullTranscript);

          mergedOptions.onResult?.(fullTranscript, currentInterim.length === 0);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          isListeningRef.current = false;
          stopAudioLevelSimulation();
          setIsListening(false);
          const rawCode = event.error;
          setErrorCode(rawCode);

          let errorMsg = "Speech recognition failed.";
          switch (rawCode) {
            case "no-speech":
              errorMsg = "No speech detected. Please speak closer to the microphone.";
              break;
            case "audio-capture":
              errorMsg = "No microphone found or audio capture failed.";
              break;
            case "not-allowed":
              errorMsg = "Microphone permission was denied. Please allow microphone access.";
              break;
            case "network":
              errorMsg = "Network connection error during speech recognition.";
              break;
            case "aborted":
              return; // User initiated abort, don't set an error message
            default:
              errorMsg = `Speech recognition error: ${rawCode}`;
          }

          setError(errorMsg);
          mergedOptions.onError?.(errorMsg, rawCode);
        };

        recognition.onend = () => {
          isListeningRef.current = false;
          stopAudioLevelSimulation();
          setIsListening(false);
          const finalResult = finalTranscriptRef.current.trim();
          mergedOptions.onEnd?.(finalResult);
        };

        recognition.start();
      } catch (err: unknown) {
        cleanup();
        const msg =
          err instanceof Error ? err.message : "Failed to start speech recognition.";
        setError(msg);
        mergedOptions.onError?.(msg);
      }
    },
    [cleanup, startAudioLevelSimulation, stopAudioLevelSimulation]
  );

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const isNetworkError = errorCode === "network";

  return {
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    error,
    errorCode,
    isNetworkError,
    audioLevel,
    isSupported,
    startListening,
    stopListening,
    abortListening,
    reset,
  };
}
