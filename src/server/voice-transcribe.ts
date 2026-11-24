/**
 * Voice Transcription Server Engine and Guardrails
 */
import { NextResponse } from "next/server";
import Groq from "groq-sdk";


let cachedGroqClient: Groq | null = null;
let cachedApiKey: string | null = null;

/**
 * Initialize the Groq client as a lazy server singleton using local credentials
 */
export function getLazyGroqClient(apiKey: string): Groq {
  if (!cachedGroqClient || cachedApiKey !== apiKey) {
    cachedGroqClient = new Groq({ apiKey });
    cachedApiKey = apiKey;
  }
  return cachedGroqClient;
}

export const DEFAULT_TRANSCRIPTION_TIMEOUT_MS = 8000; // 8 seconds

/**
 * Attach an AbortSignal with an eight-second timeout to prevent hanging API requests
 */
export function createTranscriptionAbortSignal(
  timeoutMs: number = DEFAULT_TRANSCRIPTION_TIMEOUT_MS
): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

export interface FormattedTranscriptionError {
  status: number;
  message: string;
  isRateLimit: boolean;
  retryAfterSeconds?: number;
}

export interface JsonApiErrorResponse {
  error: string;
  code?: string;
  timestamp: string;
  status: number;
}

/**
 * Structure server errors into clean JSON payloads with human-readable messages
 */
export function buildJsonErrorResponse(
  message: string,
  status: number,
  code?: string,
  headers?: Record<string, string>
): NextResponse {
  const body: JsonApiErrorResponse = {
    error: message,
    code: code || `HTTP_${status}`,
    timestamp: new Date().toISOString(),
    status,
  };

  return NextResponse.json(body, { status, headers });
}


/**
 * Catch upstream rate limit errors and present friendly cooldown guidance
 */
export function formatUpstreamTranscriptionError(
  err: unknown
): FormattedTranscriptionError {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("quota exceeded")
    ) {
      return {
        status: 429,
        message:
          "Speech recognition service is experiencing high demand. Please pause 5 seconds and speak again.",
        isRateLimit: true,
        retryAfterSeconds: 5,
      };
    }

    if (
      err.name === "AbortError" ||
      msg.includes("timeout") ||
      msg.includes("aborted")
    ) {
      return {
        status: 504,
        message:
          "Transcription timed out. Please try speaking with a shorter phrase.",
        isRateLimit: false,
      };
    }
  }

  return {
    status: 500,
    message: err instanceof Error ? err.message : "Failed to transcribe audio.",
    isRateLimit: false,
  };
}

export const MAX_AUDIO_PAYLOAD_BYTES = 15 * 1024 * 1024; // 15 Megabytes




export interface PayloadValidationResult {
  valid: boolean;
  error?: string;
  sizeBytes?: number;
}

/**
 * Validate multipart boundaries and enforce a maximum audio payload limit of 15MB
 */
export function validateAudioPayloadSize(
  audioBlob: Blob,
  maxSizeBytes: number = MAX_AUDIO_PAYLOAD_BYTES
): PayloadValidationResult {
  const sizeBytes = audioBlob.size;
  if (!sizeBytes || sizeBytes === 0) {
    return {
      valid: false,
      error: "Audio payload is empty.",
      sizeBytes: 0,
    };
  }

  if (sizeBytes > maxSizeBytes) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
    const limitMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Audio file size (${sizeMb}MB) exceeds the maximum allowed limit of ${limitMb}MB.`,
      sizeBytes,
    };
  }

  return {
    valid: true,
    sizeBytes,
  };
}

/**
 * Inspect initial audio file bytes to verify genuine webm, mp4, ogg, or wav headers
 */
export function verifyAudioMagicBytes(buffer: Buffer): {
  valid: boolean;
  detectedFormat?: string;
  error?: string;
} {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: "Audio buffer is too small to inspect." };
  }

  // WebM / EBML: 1A 45 DF A3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { valid: true, detectedFormat: "webm" };
  }

  // OggS: 4F 67 67 53
  if (
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return { valid: true, detectedFormat: "ogg" };
  }

  // RIFF (WAV): 52 49 46 46
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    return { valid: true, detectedFormat: "wav" };
  }

  // MP4 / M4A: check for "ftyp" box within first 16 bytes
  const headerSlice = buffer.subarray(0, Math.min(buffer.length, 32)).toString("binary");
  if (headerSlice.includes("ftyp")) {
    return { valid: true, detectedFormat: "mp4" };
  }

  return {
    valid: false,
    error: "Unrecognized audio container header. Expected webm, mp4, ogg, or wav.",
  };
}

/**
 * Verify active user session before opening any transcription requests
 */
export function assertValidTranscriptionSession(
  session: { userId?: string } | null | undefined
): string {
  if (!session || !session.userId || typeof session.userId !== "string") {
    throw new Error("Unauthorized: Valid user session required.");
  }
  return session.userId;
}

interface RateLimitRecord {
  timestamps: number[];
}

const sessionRateLimits = new Map<string, RateLimitRecord>();

/**
 * Add a per-session rate limiter to guard the transcription route against loops
 * Defaults to 20 transcription calls per minute per user
 */
export function checkSessionRateLimit(
  userId: string,
  maxRequestsPerMinute: number = 20,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds?: number } {
  const now = Date.now();
  let record = sessionRateLimits.get(userId);

  if (!record) {
    record = { timestamps: [] };
    sessionRateLimits.set(userId, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequestsPerMinute) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequestsPerMinute - record.timestamps.length,
  };
}



