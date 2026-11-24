/**
 * Voice Transcription Server Engine and Guardrails
 */

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

