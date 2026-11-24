/**
 * Audio Capture Engine for Groq Whisper integration
 */

export interface AudioCaptureConstraintsOptions {
  sampleRate?: number;
  channelCount?: number;
}

export type SupportedContainer = "webm" | "mp4" | "ogg";

/**
 * Detect supported browser recording containers across webm, opus, and mp4
 */
export function getSupportedAudioMimeType(): {
  mimeType: string;
  container: SupportedContainer;
} {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "audio/webm", container: "webm" };
  }

  const preferredCandidates: Array<{
    mimeType: string;
    container: SupportedContainer;
  }> = [
    { mimeType: "audio/webm;codecs=opus", container: "webm" },
    { mimeType: "audio/webm", container: "webm" },
    { mimeType: "audio/mp4", container: "mp4" },
    { mimeType: "audio/ogg;codecs=opus", container: "ogg" },
  ];

  for (const candidate of preferredCandidates) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  return { mimeType: "", container: "webm" };
}

/**
 * Build standard audio media track constraints for optimal speech processing
 */
export function getOptimalAudioConstraints(
  options: AudioCaptureConstraintsOptions = {}
): MediaTrackConstraints {
  const { sampleRate = 16000, channelCount = 1 } = options;

  return {
    channelCount: { ideal: channelCount, max: channelCount },
    sampleRate: { ideal: sampleRate },
  };
}
