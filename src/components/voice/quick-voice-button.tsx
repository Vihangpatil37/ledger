"use client";

import { useCallback, useRef, useState } from "react";
import {
  useSpeechRecognition,
  mapLocaleToSpeechLang,
} from "@/hooks/use-speech-recognition";
import { useLanguage } from "@/lib/i18n/client";

export interface QuickVoiceButtonProps {
  /**
   * Ref to the target HTML input or textarea element to populate.
   * If provided, transcribed speech will be inserted/appended directly.
   */
  targetInputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  /**
   * Optional custom callback receiving the transcribed text.
   */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /**
   * Mode: "replace" replaces the input's entire value; "append" appends to existing value.
   * Defaults to "replace" for amount fields, "append" for notes.
   */
  mode?: "replace" | "append";
  /**
   * If true, filters/extracts numeric values (e.g. for amount fields).
   */
  numericOnly?: boolean;
  className?: string;
  size?: "sm" | "md";
  title?: string;
}

export function QuickVoiceButton({
  targetInputRef,
  onTranscript,
  mode = "append",
  numericOnly = false,
  className = "",
  size = "sm",
  title,
}: QuickVoiceButtonProps) {
  const { locale, t } = useLanguage();
  const initialValueRef = useRef<string>("");
  const [errorTooltip, setErrorTooltip] = useState<string | null>(null);

  const handleError = useCallback((errorMsg: string, code?: string) => {
    const msg = code === "network" ? "Speech cloud unreachable" : errorMsg;
    setErrorTooltip(msg);
    setTimeout(() => setErrorTooltip(null), 3500);
  }, []);

  const handleResult = useCallback(
    (text: string, isFinal: boolean) => {
      let processed = text.trim();

      if (numericOnly) {
        // Extract numbers and decimal values from spoken text (e.g., "500 rupaye" -> "500")
        const match = processed.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          processed = match[1];
        }
      }

      if (targetInputRef?.current) {
        const el = targetInputRef.current;
        if (mode === "replace") {
          el.value = processed;
        } else {
          // In append mode, preserve what was there before recording began
          const base = initialValueRef.current ? `${initialValueRef.current} ` : "";
          el.value = `${base}${processed}`.trim();
        }
        // Trigger React change/input events so form state updates properly
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }

      onTranscript?.(processed, isFinal);
    },
    [mode, numericOnly, onTranscript, targetInputRef]
  );

  const { isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition({
      lang: mapLocaleToSpeechLang(locale),
      interimResults: true,
      continuous: false,
      onResult: handleResult,
      onError: handleError,
    });

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      if (targetInputRef?.current) {
        initialValueRef.current = targetInputRef.current.value.trim();
        targetInputRef.current.focus();
      }
      await startListening({
        lang: mapLocaleToSpeechLang(locale),
      });
    }
  }, [isListening, locale, startListening, stopListening, targetInputRef]);

  if (!isSupported) {
    return null;
  }

  const defaultTitle = errorTooltip
    ? errorTooltip
    : isListening
    ? t("voice.listening") || "Listening... Speak now"
    : title || t("voice.quickVoiceTyping") || "Voice type (Speak)";

  const isSmall = size === "sm";

  return (
    <button
      type="button"
      onClick={toggleListening}
      aria-label={defaultTitle}
      aria-pressed={isListening}
      title={defaultTitle}
      className={`relative inline-flex items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-2 focus-visible:outline-focus cursor-pointer ${
        isSmall ? "size-7 min-h-[28px] min-w-[28px]" : "size-8 min-h-[32px] min-w-[32px]"
      } ${
        isListening
          ? "bg-debit/15 text-debit hover:bg-debit/25 ring-2 ring-debit shadow-sm"
          : "text-muted hover:text-ink hover:bg-paper active:scale-95"
      } ${className}`}
    >
      {isListening && (
        <span
          className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-debit animate-ping"
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${isSmall ? "size-3.5" : "size-4"} ${
          isListening ? "animate-pulse text-debit" : ""
        }`}
        aria-hidden="true"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    </button>
  );
}
