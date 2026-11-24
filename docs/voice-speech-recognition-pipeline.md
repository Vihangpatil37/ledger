# Speech Recognition Architecture and Voice Pipeline

This document explains the end-to-end speech recognition and voice transcription pipeline in the Chai Ledger application.

---

## 1. Dual-Engine Architecture

The application provides dual recognition engines to ensure resilience in diverse shop environments:

1. **Fast Speech (Client-side Web Speech API)**
   - Delivers low latency on Chrome and Chromium-based browsers on stable network connections.
   - Operates with real-time continuous word streaming and instant visual feedback.

2. **Groq Whisper (Server-side Multilingual Transcription)**
   - Acts as a resilient cloud engine (`whisper-large-v3-turbo`) when browser speech recognition encounters network restrictions or unsupported user agents.
   - Accepts compressed audio streams (WebM Opus, MP4 AAC, Ogg, WAV) and transcribes speech using vocabulary conditioning.

---

## 2. Audio Capture and Pre-Processing (`src/lib/voice/audio-capture.ts`)

- **Optimal Stream Constraints:** Requests single-channel (mono) audio at 16,000Hz with hardware echo cancellation, noise suppression, and auto gain control to isolate counter speech from ambient tea stall sounds.
- **Container Detection:** Dynamically detects browser-supported recording formats (`audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`).
- **Ring Buffer Allocation:** Implements `AudioChunkRingBuffer` with 250ms time slices to avoid memory spikes or dropped packets during bursts of audio input.
- **Hardware Disconnection Monitoring:** Attaches listeners to media tracks to gracefully notify users when Bluetooth headsets or external microphones disconnect.

---

## 3. Live Sound Analysis and Hands-Free Auto-Stop (`src/lib/voice/audio-dsp.ts`)

- **Web Audio AnalyserNode:** Analyzes live incoming sound with smoothing set to `0.3` to filter out momentary sharp sounds (clinking glasses, spoons).
- **Dynamic Noise Floor:** Samples ambient room noise during the initial 300ms of recording to establish a baseline threshold.
- **Voice Activity Detection (VAD):** Detects voice onset when signal volume exceeds the dynamic baseline by an SNR multiplier.
- **Silence Auto-Stop:** Operates a silence stopwatch that automatically stops recording after 1.5 seconds of consecutive quiet once speech has begun.
- **Micro-Tap Filter:** Enforces a minimum 400ms speech duration to discard accidental brief button taps.

---

## 4. Server Endpoint Hardening (`src/server/voice-transcribe.ts` & `/api/voice/transcribe`)

- **Payload Boundary Enforcement:** Enforces a 15MB maximum file size limit for incoming audio payloads.
- **Magic Byte Inspection:** Inspects initial binary header bytes to verify authentic WebM (`1A 45 DF A3`), Ogg (`4F 67 67 53`), WAV (`RIFF`/`WAVE`), or MP4 container signatures before passing to transcribers.
- **Session Authentication:** Requires valid user session authentication before opening transcription jobs.
- **Sliding-Window Rate Limiter:** Limits transcription calls per session (maximum 20 calls per minute) to guard against loops.
- **Lazy Groq Singleton:** Reuses server Groq instances with local API credentials.
- **Request Timeout & Backoff:** Attaches an 8-second `AbortSignal` timeout to prevent hanging connections, coupled with exponential backoff and randomized jitter for throttled provider calls.

---

## 5. Customer Vocabulary Conditioning (`src/lib/voice/prompt-builder.ts`)

- **Dynamic Database Conditioning:** Queries the shopkeeper's active customer names, cleans special characters and emojis, and ranks them by recent transaction recency.
- **Vocabulary Seeding:** Injects standard khata terminology (`khata`, `hisab`, `baaki`), currency words (`rupaye`, `roqda`, `paise`), bookkeeping verbs (`udhar`, `jama`, `diya`, `aaya`), and inventory items (`chai`, `biskut`, `samosa`).
- **Token Protection:** Limits prompt text strictly to 800 characters to respect Whisper's initial prompt context window.
- **In-Memory TTL Caching:** Caches compiled prompts for 5 minutes per user, with automatic cache invalidation when customers are updated or created.

---

## 6. Indic Multilingual Normalization (`src/lib/voice/indic-normalizer.ts`)

- **Numeral Conversion:** Normalizes Devanagari numerals (`०-९`) and Gujarati numerals (`૦-૯`) directly to standard Arabic digits.
- **Spoken Hindi Multipliers:** Converts spoken phrases such as *paanch sau* (500) and *do hazaar* (2000) into numerical representations.
- **Informal Currency:** Standardizes informal phrases like *dedh sau* (150) and *dhai sau* (250).
- **Gujarati Payment Verbs:** Maps Gujarati verbs (*aapya*, *lidha*) to standard debit and credit operations.
- **Phonetic Matching:** Employs Double Metaphone phonetic hashing and Levenshtein edit distance to rank candidate customer matches even with regional pronunciation differences.

---

## 7. Interface States and Accessibility (`src/components/voice/global-voice-modal.tsx`)

- **Preference Persistence:** Stores chosen engine mode in local storage (`chai-ledger:voice-engine`) to eliminate startup network warnings.
- **Accessible Controls:** Provides full keyboard navigation with ARIA radiogroup roles and shortcut triggers (`Alt+V` and `Ctrl+Shift+V`).
- **Visual Feedback:** Drives responsive seven-bar equalizer and ring scaling directly from incoming audio energy.
- **Resilient Fallback:** Displays an informative amber guidance banner if Google speech cloud is unreachable and reveals manual typing inputs smoothly if API credentials are absent.
