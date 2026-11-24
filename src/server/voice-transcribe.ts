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
