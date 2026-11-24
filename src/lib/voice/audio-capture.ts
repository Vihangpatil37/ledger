/**
 * Audio Capture Engine for Groq Whisper integration
 */

export interface AudioCaptureConstraintsOptions {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  autoGainControl?: boolean;
  noiseSuppression?: boolean;
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
  const {
    sampleRate = 16000,
    channelCount = 1,
    echoCancellation = true,
    autoGainControl = true,
    noiseSuppression = true,
  } = options;

  return {
    channelCount: { ideal: channelCount, max: channelCount },
    sampleRate: { ideal: sampleRate },
    echoCancellation: { ideal: echoCancellation },
    autoGainControl: { ideal: autoGainControl },
    noiseSuppression: { ideal: noiseSuppression },
  };
}

/**
 * Query available audio input devices and return default or preferred microphone
 */
export async function getPreferredMicrophoneDeviceId(): Promise<
  string | undefined
> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return undefined;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    const defaultDevice = audioInputs.find(
      (d) =>
        d.deviceId === "default" || d.label.toLowerCase().includes("default")
    );
    return defaultDevice?.deviceId || audioInputs[0]?.deviceId;
  } catch {
    return undefined;
  }
}

export type MicrophonePermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported";

/**
 * Inspect microphone permission state and produce clear guidance
 */
export async function checkMicrophonePermissionState(): Promise<MicrophonePermissionState> {
  if (
    typeof navigator === "undefined" ||
    !navigator.permissions?.query
  ) {
    return "unsupported";
  }

  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state;
  } catch {
    return "unsupported";
  }
}

export function formatMicrophoneError(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Microphone permission is blocked. Please allow microphone access in your browser settings to record speech.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No microphone found on your device. Please plug in a microphone or headset.";
      case "NotReadableError":
      case "TrackStartError":
        return "Microphone is in use by another application. Please close other audio tabs.";
      default:
        return `Microphone error: ${error.message}`;
    }
  }
  return error instanceof Error
    ? error.message
    : "Unable to access microphone.";
}
