"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Dialog,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import {
  useSpeechRecognition,
  mapLocaleToSpeechLang,
  VOICE_MODAL_EVENT,
  openGlobalVoiceModal,
} from "@/hooks/use-speech-recognition";
import {
  confirmVoiceEntry,
  parseVoiceEntry,
  type CandidateCustomerMatch,
  type MatchedCustomer,
} from "@/actions/voice";
import { useLanguage } from "@/lib/i18n/client";
import type { EntryType } from "@/lib/types";
import {
  saveVoiceEnginePreference,
  getSavedVoiceEnginePreference,
  type VoiceEngineMode,
} from "@/lib/voice/voice-preferences";


export { VOICE_MODAL_EVENT, openGlobalVoiceModal };

type Step = "RECORD" | "PROCESSING" | "PREVIEW" | "SUCCESS";

export function GlobalVoiceModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
} = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleClose = useCallback(() => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  }, [isControlled, controlledOnClose]);

  // Listen to global open event
  useEffect(() => {
    function onOpenEvent() {
      if (isControlled && controlledOnClose) {
        // Parent will manage
      } else {
        setInternalIsOpen(true);
      }
    }
    window.addEventListener(VOICE_MODAL_EVENT, onOpenEvent);
    return () => window.removeEventListener(VOICE_MODAL_EVENT, onOpenEvent);
  }, [isControlled, controlledOnClose]);

  // Global keyboard shortcut: Alt+V or Ctrl+Shift+V
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.altKey && e.code === "KeyV") ||
        (e.ctrlKey && e.shiftKey && e.code === "KeyV")
      ) {
        e.preventDefault();
        if (isControlled && controlledOnClose) {
          // controlled
        } else {
          setInternalIsOpen((prev) => !prev);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isControlled, controlledOnClose]);

  const { locale, t } = useLanguage();
  const [speechLang, setSpeechLang] = useState<string>(() => mapLocaleToSpeechLang(locale));

  useEffect(() => {
    setSpeechLang(mapLocaleToSpeechLang(locale));
  }, [locale]);

  const [step, setStep] = useState<Step>("RECORD");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);

  // Engine mode: "BROWSER" (fast Web Speech) or "AUDIO_RECORDING" (MediaRecorder -> Whisper fallback)
  const [engineMode, setEngineMode] = useState<VoiceEngineMode>("BROWSER");

  // Load persisted engine preference from localStorage on client mount
  useEffect(() => {
    setEngineMode(getSavedVoiceEnginePreference());
  }, []);

  const switchEngineMode = useCallback((mode: VoiceEngineMode) => {
    setEngineMode(mode);
    saveVoiceEnginePreference(mode);
  }, []);


  // Audio recording states and refs for server fallback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordAudioLevel, setRecordAudioLevel] = useState(0);
  const recordAnimRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);

  // Parsed / Preview state
  const [rawTranscript, setRawTranscript] = useState("");
  const [detectedType, setDetectedType] = useState<EntryType>("GAVE");
  const [amountStr, setAmountStr] = useState<string>("");
  const [noteStr, setNoteStr] = useState<string>("");
  const [selectedPerson, setSelectedPerson] = useState<MatchedCustomer | null>(null);
  const [candidateMatches, setCandidateMatches] = useState<CandidateCustomerMatch[]>([]);
  const [allCustomers, setAllCustomers] = useState<MatchedCustomer[]>([]);
  const [isChangingCustomer, setIsChangingCustomer] = useState(false);
  const [customerSearchFilter, setCustomerSearchFilter] = useState("");

  // Manual fallback input state
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");

  const [isPending, startTransition] = useTransition();
  const hasTriggeredProcessingRef = useRef(false);

  // Clean up media streams, Web Audio context, and timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordAnimRef.current) cancelAnimationFrame(recordAnimRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const processTranscript = useCallback(
    async (transcriptText: string) => {
      const clean = transcriptText.trim();
      if (!clean) return;
      setStep("PROCESSING");
      setStatusMessage(t("voice.parsing"));

      startTransition(async () => {
        try {
          const result = await parseVoiceEntry(clean);
          if (!result.ok) {
            throw new Error(result.error);
          }

          const { proposal } = result;
          setRawTranscript(proposal.parsed.rawTranscript);
          setDetectedType(proposal.parsed.type);
          setAmountStr(
            proposal.parsed.amount != null ? String(proposal.parsed.amount) : ""
          );
          setNoteStr(proposal.parsed.note || "");
          setSelectedPerson(proposal.matchedPerson);
          setCandidateMatches(proposal.candidateMatches);
          setAllCustomers(proposal.allCustomers);
          setIsChangingCustomer(!proposal.matchedPerson);
          setStep("PREVIEW");
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Error parsing speech.";
          setErrorMessage(msg);
          setStep("RECORD");
        }
      });
    },
    [t]
  );

  const handleSpeechEnd = useCallback(
    (finalResult: string) => {
      if (finalResult && finalResult.trim() && !hasTriggeredProcessingRef.current) {
        hasTriggeredProcessingRef.current = true;
        processTranscript(finalResult.trim());
      }
    },
    [processTranscript]
  );

  // Automatic fallback on Web Speech network / connection failure
  const handleSpeechError = useCallback((_errText: string, code?: string) => {
    if (code === "network") {
      switchEngineMode("AUDIO_RECORDING");
      setSwitchNotice(
        "Browser speech cloud is unreachable on this network. Switched to Audio Recording mode."
      );
    }
  }, [switchEngineMode]);

  const {
    isListening,
    transcript,
    error: speechError,
    audioLevel: browserAudioLevel,
    isSupported,
    startListening,
    stopListening,
    reset: resetSpeech,
  } = useSpeechRecognition({
    lang: speechLang,
    interimResults: true,
    continuous: false,
    onEnd: handleSpeechEnd,
    onError: handleSpeechError,
  });

  const stopAudioRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recordAnimRef.current) {
      cancelAnimationFrame(recordAnimRef.current);
      recordAnimRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setRecordAudioLevel(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      mediaStreamRef.current = null;
    }
    setIsAudioRecording(false);
  }, []);

  const startAudioRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      setSwitchNotice(null);
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setErrorMessage("Microphone access is not supported in this browser.");
        return;
      }

      // 16kHz mono audio constraints with active noise suppression for noisy shop counters
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let options: MediaRecorderOptions | undefined = undefined;
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options = { mimeType: "audio/webm;codecs=opus" };
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          options = { mimeType: "audio/webm" };
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options = { mimeType: "audio/mp4" };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (recordAnimRef.current) {
          cancelAnimationFrame(recordAnimRef.current);
          recordAnimRef.current = null;
        }
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close();
          } catch {
            // ignore
          }
          audioContextRef.current = null;
        }
        analyserRef.current = null;

        if (mediaStreamRef.current) {
          try {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          } catch {
            // ignore
          }
          mediaStreamRef.current = null;
        }

        const mime = recorder.mimeType || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, { type: mime });
        audioChunksRef.current = [];

        if (recordedBlob.size < 300) {
          setErrorMessage("Recording was too short. Please speak and try again.");
          setIsAudioRecording(false);
          setStep("RECORD");
          return;
        }

        setStep("PROCESSING");
        setStatusMessage(t("voice.transcribing") || "Transcribing audio...");

        try {
          const formData = new FormData();
          const ext = mime.includes("mp4") ? "mp4" : "webm";
          formData.append("file", recordedBlob, `voice-entry.${ext}`);
          const langIso = speechLang.split("-")[0];
          formData.append("language", langIso);

          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (!res.ok || data.error) {
            const err = data.error || "Failed to transcribe audio.";
            if (err.includes("GROQ_API_KEY")) {
              setErrorMessage("GROQ_API_KEY is not configured on the server. You can type your transaction below.");
              setShowManualInput(true);
            } else {
              setErrorMessage(err);
            }
            setStep("RECORD");
            setIsAudioRecording(false);
            return;
          }

          const transcribed = data.text?.trim() || "";
          if (!transcribed) {
            setErrorMessage("No speech detected. Please speak louder or try again.");
            setStep("RECORD");
            setIsAudioRecording(false);
            return;
          }

          setIsAudioRecording(false);
          await processTranscript(transcribed);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Error contacting transcription service.";
          setErrorMessage(msg);
          setStep("RECORD");
          setIsAudioRecording(false);
        }
      };

      // Set up Web Audio Analyser for real-time visualizer & Voice Activity Detection (VAD)
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.3;
          source.connect(analyser);
          analyserRef.current = analyser;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          hasSpokenRef.current = false;
          let silenceStart: number | null = null;
          const recordingStart = Date.now();

          const monitorAudio = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const avg = sum / bufferLength;
            const normalizedLevel = Math.min(1, Math.max(0, avg / 128));
            setRecordAudioLevel(normalizedLevel);

            const elapsed = Date.now() - recordingStart;

            // Voice Activity Detection (VAD):
            // Detect speech onset (threshold ~0.06)
            if (normalizedLevel > 0.06) {
              hasSpokenRef.current = true;
              silenceStart = null;
            } else if (hasSpokenRef.current && elapsed > 1200) {
              // Once spoken and at least 1.2s recorded:
              if (silenceStart === null) {
                silenceStart = Date.now();
              } else if (Date.now() - silenceStart > 1500) {
                // 1.5 seconds of consecutive silence -> hands-free auto-stop!
                silenceStart = null;
                stopAudioRecording();
                return;
              }
            }

            recordAnimRef.current = requestAnimationFrame(monitorAudio);
          };

          recordAnimRef.current = requestAnimationFrame(monitorAudio);
        }
      } catch {
        // Fallback silently if Web Audio cannot be initialized
      }

      recorder.start(250);
      setIsAudioRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not access microphone.";
      setErrorMessage(msg);
      setIsAudioRecording(false);
    }
  }, [processTranscript, speechLang, stopAudioRecording, t]);

  const isRecording = engineMode === "BROWSER" ? isListening : isAudioRecording;
  const effectiveAudioLevel = engineMode === "BROWSER" ? browserAudioLevel : recordAudioLevel;

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep("RECORD");
      setErrorMessage(null);
      setSwitchNotice(null);
      setStatusMessage("");
      setShowManualInput(!isSupported);
      setManualText("");
      setIsChangingCustomer(false);
      setCustomerSearchFilter("");
      hasTriggeredProcessingRef.current = false;
      resetSpeech();
      stopAudioRecording();
    } else {
      resetSpeech();
      stopAudioRecording();
    }
  }, [isOpen, isSupported, resetSpeech, stopAudioRecording]);

  const handleToggleListening = useCallback(async () => {
    if (engineMode === "BROWSER") {
      if (isListening) {
        stopListening();
        if (transcript && transcript.trim() && !hasTriggeredProcessingRef.current) {
          hasTriggeredProcessingRef.current = true;
          processTranscript(transcript.trim());
        }
      } else {
        hasTriggeredProcessingRef.current = false;
        setErrorMessage(null);
        setSwitchNotice(null);
        await startListening({ lang: speechLang });
      }
    } else {
      if (isAudioRecording) {
        stopAudioRecording();
      } else {
        hasTriggeredProcessingRef.current = false;
        await startAudioRecording();
      }
    }
  }, [
    engineMode,
    isListening,
    stopListening,
    transcript,
    processTranscript,
    speechLang,
    startListening,
    isAudioRecording,
    stopAudioRecording,
    startAudioRecording,
  ]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualText.trim()) return;
    processTranscript(manualText.trim());
  }

  async function handleConfirmEntry() {
    if (!selectedPerson) {
      setErrorMessage(t("voice.customerNotFound"));
      return;
    }

    if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
      setErrorMessage("Please enter a valid amount.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const payload = {
          personId: selectedPerson.id,
          type: detectedType,
          amount: Number(amountStr),
          note: noteStr.trim() || null,
        };

        const res = await confirmVoiceEntry(payload);
        if (res.error) {
          setErrorMessage(res.error);
          return;
        }

        setStep("SUCCESS");
        setTimeout(() => {
          handleClose();
        }, 1200);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to save khata entry.";
        setErrorMessage(msg);
      }
    });
  }

  function handleReset() {
    setStep("RECORD");
    setErrorMessage(null);
    setSwitchNotice(null);
    setStatusMessage("");
    setIsChangingCustomer(false);
    hasTriggeredProcessingRef.current = false;
    resetSpeech();
    stopAudioRecording();
  }

  const filteredCustomerList = allCustomers.filter((c) =>
    c.name.toLowerCase().includes(customerSearchFilter.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearchFilter))
  );

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} className="max-w-lg">
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-ink text-paper shadow-sm">
            <MicIcon className="size-4.5" />
          </span>
          <div>
            <DialogTitle className="flex items-center gap-2">
              <span>{t("voice.title")}</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-paper px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted border border-rule">
                Alt+V
              </span>
            </DialogTitle>
            <p className="font-mono text-xs text-muted">
              {t("voice.subtitle")}
            </p>
          </div>
        </div>
        <DialogCloseButton onClose={handleClose} />
      </DialogHeader>

      <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
        {errorMessage && (
          <div className="rounded-xl border border-danger/30 bg-danger-light p-3 text-xs font-medium text-danger flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: RECORDING / SPEECH RECOGNITION SCREEN */}
        {step === "RECORD" && (
          <div className="flex flex-col items-center justify-center py-5 gap-5 text-center">
            {/* Dual-Engine Mode Selector Pills */}
            <div
              role="radiogroup"
              aria-label="Speech recognition engine selection"
              className="flex items-center justify-center p-1 rounded-xl bg-rule/30 border border-rule/50 gap-1 text-[11px] font-medium text-muted"
            >
              <button
                type="button"
                role="radio"
                aria-checked={engineMode === "BROWSER"}
                aria-label="Fast Browser Speech engine"
                disabled={isRecording}
                onClick={() => {
                  switchEngineMode("BROWSER");
                  setSwitchNotice(null);
                  setErrorMessage(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  engineMode === "BROWSER"
                    ? "bg-paper text-ink font-semibold shadow-2xs border border-rule/60"
                    : "hover:text-ink"
                } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span>⚡</span>
                <span>Fast Speech</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={engineMode === "AUDIO_RECORDING"}
                aria-label="Groq Whisper cloud transcription engine"
                disabled={isRecording}
                onClick={() => {
                  switchEngineMode("AUDIO_RECORDING");
                  setSwitchNotice(null);
                  setErrorMessage(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  engineMode === "AUDIO_RECORDING"
                    ? "bg-paper text-ink font-semibold shadow-2xs border border-rule/60"
                    : "hover:text-ink"
                } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span>🎙️</span>
                <span>Groq Whisper</span>
              </button>
            </div>


            {/* Language Selector Pills */}
            <div className="flex items-center justify-center gap-1.5 -mb-1">
              {[
                { code: "hi-IN", label: "हिन्दी" },
                { code: "gu-IN", label: "ગુજરાતી" },
                { code: "en-IN", label: "English" },
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  disabled={isRecording}
                  onClick={() => setSpeechLang(l.code)}
                  className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer ${
                    speechLang === l.code
                      ? "bg-ink text-paper shadow-2xs font-semibold"
                      : "bg-paper text-muted hover:text-ink hover:bg-rule/40"
                  } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Switch notice banner if automatically or manually switched */}
            {switchNotice && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-800 dark:text-amber-200 flex items-start gap-2.5 animate-in fade-in duration-200 w-full max-w-sm text-left">
                <InfoIcon className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="font-semibold">{switchNotice}</p>
                  <p className="mt-0.5 text-[11px] opacity-90">
                    Tap the mic to record audio for server Whisper transcription.
                  </p>
                </div>
              </div>
            )}

            {/* Visual Pulse & Mic Button with layered fluid ripple rings */}
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <>
                  {/* Outer pulsating wave */}
                  <div
                    className="absolute rounded-full bg-rose-500/15 dark:bg-rose-500/25 transition-transform duration-100 ease-out pointer-events-none"
                    style={{
                      width: `${130 + effectiveAudioLevel * 80}px`,
                      height: `${130 + effectiveAudioLevel * 80}px`,
                    }}
                  />
                  {/* Middle ring */}
                  <div
                    className="absolute rounded-full bg-rose-500/25 dark:bg-rose-500/35 transition-transform duration-75 ease-out pointer-events-none"
                    style={{
                      width: `${115 + effectiveAudioLevel * 50}px`,
                      height: `${115 + effectiveAudioLevel * 50}px`,
                    }}
                  />
                  {/* Radar ping ring */}
                  <div
                    className="absolute rounded-full bg-rose-500/40 dark:bg-rose-500/50 animate-ping pointer-events-none"
                    style={{
                      width: "110px",
                      height: "110px",
                      animationDuration: "1.6s",
                    }}
                  />
                </>
              )}

              <button
                type="button"
                onClick={handleToggleListening}
                disabled={engineMode === "BROWSER" && !isSupported}
                aria-label={
                  isRecording
                    ? engineMode === "AUDIO_RECORDING"
                      ? "Stop recording audio and transcribe immediately"
                      : t("voice.stopRecording")
                    : t("voice.startRecording")
                }
                title={
                  isRecording
                    ? "Click or press Space/Enter to stop recording and submit"
                    : "Click to start recording"
                }
                className={`group relative z-10 flex size-24 items-center justify-center rounded-full shadow-xl transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-focus ${
                  isRecording
                    ? "bg-debit text-white scale-105 shadow-debit/40 ring-4 ring-debit/20"
                    : engineMode === "AUDIO_RECORDING" || isSupported
                    ? "bg-ink text-paper hover:scale-105 active:scale-95 shadow-ink/20 hover:shadow-2xl"
                    : "bg-muted/40 text-muted cursor-not-allowed shadow-none"
                }`}
              >

                {isRecording ? (
                  <div className="flex flex-col items-center justify-center size-8 rounded-lg bg-white shadow-inner animate-pulse">
                    <span className="size-3.5 rounded-sm bg-debit" />
                  </div>
                ) : (
                  <MicIcon className="size-10 transition-transform duration-200 group-hover:scale-110" />
                )}
              </button>
            </div>

            {/* Status & Live Speech Stream */}
            <div className="space-y-2 w-full max-w-sm">
              <p className="font-display text-base font-bold text-ink">
                {isRecording
                  ? engineMode === "AUDIO_RECORDING"
                    ? `Recording audio… (${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, "0")})`
                    : t("voice.listening")
                  : engineMode === "AUDIO_RECORDING"
                  ? "Tap to Record Audio (Whisper)"
                  : isSupported
                  ? t("voice.startRecording")
                  : "Speech recognition unavailable"}
              </p>

              {isRecording ? (
                <div className="rounded-xl border border-debit/20 bg-debit/5 p-3 text-center animate-in fade-in duration-150">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-debit mb-1 uppercase tracking-wider">
                    <span className="size-2 rounded-full bg-debit animate-ping" />
                    <span>
                      {engineMode === "AUDIO_RECORDING"
                        ? "Live Mic Active • Auto-stops on 1.5s silence"
                        : t("voice.listening")}
                    </span>
                  </div>

                  <p className="font-sans text-sm font-medium text-ink min-h-[24px] break-words">
                    {engineMode === "BROWSER" ? (
                      transcript ? (
                        `“${transcript}”`
                      ) : (
                        <span className="text-muted italic">{t("voice.exampleHint")}</span>
                      )
                    ) : (
                      <span className="text-muted italic">
                        Speak clearly. Recording will auto-submit after you stop speaking, or tap the mic.
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="font-mono text-xs text-muted max-w-xs mx-auto">
                  {t("voice.exampleHint")}
                </p>
              )}
            </div>

            {/* Live Audio Waveform Bars */}
            {isRecording && (
              <div className="flex items-center justify-center gap-1.5 h-9">
                {[0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.6].map((scale, i) => {
                  const barHeight = Math.max(
                    6,
                    Math.round(32 * (effectiveAudioLevel * scale + 0.15))
                  );
                  return (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-debit transition-all duration-75 shadow-xs"
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>
            )}

            {/* Instruction chips */}
            {!isRecording && (
              <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                <span className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper px-3 py-1 font-mono text-[11px] text-muted shadow-2xs">
                  <SparklesIcon className="size-3 text-muted" />
                  &ldquo;Vikram Mehta ne 5000 diye&rdquo;
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper px-3 py-1 font-mono text-[11px] text-muted shadow-2xs">
                  <SparklesIcon className="size-3 text-muted" />
                  &ldquo;Ramesh 100 rupaye udhar chai&rdquo;
                </span>
              </div>
            )}

            {/* Unsupported notice or manual text fallback */}
            {!isRecording && (
              <div className="w-full pt-3 border-t border-rule/50">
                {!isSupported && engineMode === "BROWSER" && (
                  <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                    Web Speech recognition is not supported in this browser. Please switch to Audio Recording or type your entry below.
                  </div>
                )}
                {!showManualInput && (isSupported || engineMode === "AUDIO_RECORDING") ? (
                  <button
                    type="button"
                    onClick={() => setShowManualInput(true)}
                    className="text-xs font-semibold text-muted hover:text-ink transition-colors underline underline-offset-4 cursor-pointer"
                  >
                    {t("voice.manualFallback")}
                  </button>
                ) : (
                  <form
                    onSubmit={handleManualSubmit}
                    className="flex flex-col gap-2 pt-1 text-left"
                  >
                    <Label htmlFor="voice-manual-input">
                      {t("voice.manualFallback")}
                    </Label>
                    <div className="flex gap-2">
                      <input
                        id="voice-manual-input"
                        type="text"
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder="e.g. Vikram Mehta ne 5000 diye"
                        className={inputClass}
                        autoFocus
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!manualText.trim()}
                      >
                        {t("voice.analyze")}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {speechError && engineMode === "BROWSER" && !switchNotice && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 flex flex-col items-center gap-2 w-full max-w-sm text-center">
                <p className="font-semibold text-rose-700 dark:text-rose-300">
                  {speechError}
                </p>
                <p className="text-[11px] opacity-90">
                  Google speech service is unreachable. Switch to Groq Whisper for server-side recognition.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    switchEngineMode("AUDIO_RECORDING");
                    setSwitchNotice("Switched to Groq Whisper mode");
                    setErrorMessage(null);
                  }}
                  className="mt-0.5 px-2.5 py-1 text-xs font-semibold border-amber-600/40 hover:bg-amber-500/20"
                >
                  Switch to Groq Whisper
                </Button>

              </div>
            )}

          </div>
        )}

        {/* STEP 2: PROCESSING SCREEN */}
        {step === "PROCESSING" && (
          <div className="flex flex-col items-center justify-center py-12 gap-5 text-center animate-in fade-in duration-200">
            <div className="relative size-16 rounded-2xl bg-paper border border-rule flex items-center justify-center shadow-md">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="size-8 animate-spin text-ink"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeOpacity="0.15"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-base font-bold text-ink tracking-tight">
                {statusMessage}
              </h3>
              <p className="font-mono text-xs text-muted flex items-center justify-center gap-1.5">
                <SparklesIcon className="size-3.5 text-debit" />
                <span>Powered by Groq Whisper & Ledger AI</span>
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW SCREEN */}
        {step === "PREVIEW" && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Transcript pill with Speech Icon */}
            <div className="rounded-xl border border-rule bg-paper/70 p-3 flex items-start gap-2.5 shadow-2xs">
              <span className="flex size-5 items-center justify-center rounded-md bg-rule/40 text-muted shrink-0 mt-0.5">
                <AudioWaveIcon className="size-3.5" />
              </span>
              <p className="font-sans text-xs italic text-muted flex-1 leading-relaxed">
                &ldquo;{rawTranscript}&rdquo;
              </p>
            </div>

            {/* Transaction Type Selector (Udhar in rose / Jama in emerald) */}
            <div>
              <Label className="mb-1.5 flex items-center gap-1.5">
                <span>{t("voice.type")}</span>
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDetectedType("GAVE")}
                  className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition-all duration-150 cursor-pointer ${
                    detectedType === "GAVE"
                      ? "border-debit bg-debit-light text-debit shadow-sm font-bold ring-2 ring-debit/20 scale-[1.01]"
                      : "border-rule bg-surface text-muted hover:text-ink hover:bg-paper active:scale-98"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ArrowUpRightIcon className="size-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      {t("entry.gave")} (Udhar)
                    </span>
                  </div>
                  <span className="font-mono text-[10px] opacity-80 mt-0.5">
                    {t("entry.gaveHint")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetectedType("RECEIVED")}
                  className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition-all duration-150 cursor-pointer ${
                    detectedType === "RECEIVED"
                      ? "border-credit bg-credit-light text-credit shadow-sm font-bold ring-2 ring-credit/20 scale-[1.01]"
                      : "border-rule bg-surface text-muted hover:text-ink hover:bg-paper active:scale-98"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ArrowDownLeftIcon className="size-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      {t("entry.received")} (Jama)
                    </span>
                  </div>
                  <span className="font-mono text-[10px] opacity-80 mt-0.5">
                    {t("entry.receivedHint")}
                  </span>
                </button>
              </div>
            </div>

            {/* Customer Section: STRICT EXISTING CUSTOMER RULE */}
            <div className="rounded-xl border border-rule bg-surface p-3.5 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <UserCheckIcon className="size-3.5 text-muted" />
                  <span>{t("voice.customer")}</span>
                </Label>
                {selectedPerson ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-credit-light border border-credit/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-credit">
                    <CheckCircleIcon className="size-3" />
                    <span>{t("voice.existingCustomer")}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-light border border-danger/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-danger">
                    <AlertTriangleIcon className="size-3" />
                    <span>Not in Khata</span>
                  </span>
                )}
              </div>

              {selectedPerson && !isChangingCustomer ? (
                <div className="flex items-center justify-between rounded-lg border border-rule bg-paper p-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-full bg-ink text-paper font-display text-sm font-bold">
                      {selectedPerson.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-ink">
                        {selectedPerson.name}
                      </p>
                      {selectedPerson.phone && (
                        <p className="font-mono text-[11px] text-muted">
                          {selectedPerson.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[36px] px-3 py-1.5 text-xs"
                    onClick={() => setIsChangingCustomer(true)}
                  >
                    {t("voice.changeCustomer")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {!selectedPerson && (
                    <div className="rounded-lg border border-warning/30 bg-warning-light p-2.5 text-xs text-warning flex items-start gap-2">
                      <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                      <span>{t("voice.customerNotFound")}</span>
                    </div>
                  )}

                  {/* Customer search & select dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={customerSearchFilter}
                      onChange={(e) => setCustomerSearchFilter(e.target.value)}
                      placeholder="Search existing customer by name..."
                      className={inputClass}
                      autoFocus={isChangingCustomer}
                    />

                    <select
                      value={selectedPerson?.id || ""}
                      onChange={(e) => {
                        const cust = allCustomers.find(
                          (c) => c.id === e.target.value
                        );
                        if (cust) {
                          setSelectedPerson(cust);
                          setIsChangingCustomer(false);
                          setErrorMessage(null);
                        }
                      }}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        -- {t("voice.selectCustomer")} ({filteredCustomerList.length}) --
                      </option>
                      {filteredCustomerList.map((cust) => (
                        <option key={cust.id} value={cust.id}>
                          {cust.name} {cust.phone ? `(${cust.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Candidate matches suggestion chips if available */}
              {candidateMatches.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="font-mono text-[10px] text-muted">
                    Suggestions:
                  </span>
                  {candidateMatches.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => {
                        setSelectedPerson({
                          id: cand.id,
                          name: cand.name,
                          phone: cand.phone,
                        });
                        setIsChangingCustomer(false);
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs transition-all cursor-pointer ${
                        selectedPerson?.id === cand.id
                          ? "bg-ink text-paper font-semibold shadow-2xs"
                          : "border border-rule bg-paper text-muted hover:text-ink hover:bg-rule/20"
                      }`}
                    >
                      <span>{cand.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount (Rupees) */}
            <div>
              <Label htmlFor="voice-amount-input" className="flex items-center gap-1">
                <CurrencyRupeeIcon className="size-3.5 text-muted" />
                <span>{t("voice.amount")}</span>
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-muted select-none">
                  ₹
                </span>
                <input
                  id="voice-amount-input"
                  type="number"
                  step="any"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-8 font-mono text-lg font-bold`}
                />
              </div>
            </div>

            {/* Note / Item */}
            <div>
              <Label htmlFor="voice-note-input" className="flex items-center gap-1">
                <DocumentTextIcon className="size-3.5 text-muted" />
                <span>{t("voice.note")}</span>
              </Label>
              <input
                id="voice-note-input"
                type="text"
                value={noteStr}
                onChange={(e) => setNoteStr(e.target.value)}
                placeholder="e.g. 2 chai, samosa, payment"
                className={inputClass}
              />
            </div>

            {/* Actions: 1-Tap Confirm vs Record Again */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                {t("voice.tryAgain")}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmEntry}
                isLoading={isPending}
                disabled={!selectedPerson}
                className="w-full flex-1"
              >
                <CheckCircleIcon className="size-4" />
                <span>
                  {selectedPerson
                    ? t("voice.confirm")
                    : "Select a customer to confirm"}
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === "SUCCESS" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3.5 text-center animate-in zoom-in-95 duration-200">
            <div className="size-16 rounded-full bg-credit-light border border-credit/30 flex items-center justify-center text-credit shadow-sm animate-bounce">
              <CheckCircleIcon className="size-9" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">
              {t("voice.success")}
            </h3>
            <p className="font-mono text-xs text-muted">
              {selectedPerson?.name} &bull; ₹{amountStr} &bull;{" "}
              {detectedType === "GAVE" ? "Udhar" : "Jama"}
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/**
 * Universal Floating Action Button (FAB) for Voice Khata.
 */
export function VoiceFloatingButton({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={openGlobalVoiceModal}
      aria-label={t("voice.title")}
      title={`${t("voice.title")} (Alt+V)`}
      className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2.5 rounded-full bg-ink px-4 py-3 text-paper shadow-[0_8px_24px_rgba(30,27,24,0.3)] transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-focus cursor-pointer ${className}`}
    >
      <span className="relative flex size-5 items-center justify-center">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
        <MicIcon className="relative size-4 text-paper" />
      </span>
      <span className="font-display text-sm font-bold tracking-tight pr-1">
        {t("voice.title")}
      </span>
    </button>
  );
}

/**
 * Header Voice Trigger Icon Button for mobile top bar or compact headers.
 */
export function VoiceHeaderButton({
  className = "",
}: {
  className?: string;
}) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={openGlobalVoiceModal}
      aria-label={t("voice.title")}
      title={`${t("voice.title")} (Alt+V)`}
      className={`inline-flex size-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-xl border border-rule bg-surface text-ink hover:bg-paper active:scale-95 transition-all cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-focus ${className}`}
    >
      <MicIcon className="size-4 text-debit" />
    </button>
  );
}

// --- Icons ---

function MicIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function UserCheckIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

function CheckCircleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ArrowUpRightIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function ArrowDownLeftIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="17" y1="7" x2="7" y2="17" />
      <polyline points="17 17 7 17 7 7" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SparklesIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function CurrencyRupeeIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="m6 13 8.5 8" />
      <path d="M6 13h3a4 4 0 0 0 0-8" />
    </svg>
  );
}

function DocumentTextIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function AudioWaveIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 10v4" />
      <path d="M6 6v12" />
      <path d="M10 3v18" />
      <path d="M14 8v8" />
      <path d="M18 5v14" />
      <path d="M22 10v4" />
    </svg>
  );
}

function InfoIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
