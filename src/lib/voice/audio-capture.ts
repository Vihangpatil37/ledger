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

/**
 * Attach listeners to media stream tracks to notify on sudden disconnection (bluetooth/headset)
 */
export function monitorTrackDisconnection(
  stream: MediaStream,
  onDisconnect: (reason: string) => void
): () => void {
  const tracks = stream.getAudioTracks();
  const handlers: Array<{ track: MediaStreamTrack; handler: () => void }> = [];

  for (const track of tracks) {
    const handleEnded = () => {
      onDisconnect(`Audio track ended unexpectedly (${track.label || "microphone"})`);
    };
    track.addEventListener("ended", handleEnded);
    handlers.push({ track, handler: handleEnded });
  }

  return () => {
    for (const { track, handler } of handlers) {
      track.removeEventListener("ended", handler);
    }
  };
}

/**
 * Resample an AudioBuffer to target 16kHz sample rate using OfflineAudioContext
 */
export async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number = 16000
): Promise<AudioBuffer> {
  if (audioBuffer.sampleRate === targetSampleRate) {
    return audioBuffer;
  }

  if (typeof OfflineAudioContext === "undefined") {
    return audioBuffer;
  }

  const duration = audioBuffer.duration;
  const numFrames = Math.ceil(duration * targetSampleRate);
  const offlineCtx = new OfflineAudioContext(
    1,
    numFrames,
    targetSampleRate
  );

  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start(0);

  return await offlineCtx.startRendering();
}

/**
 * Ring buffer for incoming audio chunks to prevent memory bloat or frame dropping
 */
export class AudioChunkRingBuffer {
  private chunks: Blob[] = [];
  private readonly maxCapacity: number;

  constructor(maxCapacity: number = 200) {
    this.maxCapacity = maxCapacity;
  }

  public push(chunk: Blob): void {
    if (this.chunks.length >= this.maxCapacity) {
      this.chunks.shift();
    }
    this.chunks.push(chunk);
  }

  public getAll(): Blob[] {
    return [...this.chunks];
  }

  public clear(): void {
    this.chunks = [];
  }

  public get size(): number {
    return this.chunks.length;
  }

  public toCombinedBlob(mimeType: string): Blob {
    return new Blob(this.chunks, { type: mimeType });
  }
}

export const DEFAULT_AUDIO_TIMESLICE_MS = 250;

export interface MediaRecorderOptionsConfig {
  timesliceMs?: number;
  mimeType?: string;
}

export interface VoiceRecorderSessionCallbacks {
  onDataAvailable?: (chunk: Blob) => void;
  onError?: (error: Error) => void;
  onEnded?: (reason: string) => void;
}

/**
 * Reusable audio recorder session managing tracks, buffer slices, and teardown
 */
export class VoiceRecorderSession {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private buffer: AudioChunkRingBuffer;
  private unbindTrackMonitor: (() => void) | null = null;
  private isRecording = false;

  constructor(private readonly callbacks: VoiceRecorderSessionCallbacks = {}) {
    this.buffer = new AudioChunkRingBuffer();
  }

  public async start(options: {
    deviceId?: string;
    constraints?: AudioCaptureConstraintsOptions;
    timesliceMs?: number;
  } = {}): Promise<void> {
    const { deviceId, constraints, timesliceMs = DEFAULT_AUDIO_TIMESLICE_MS } = options;
    const mediaConstraints = getOptimalAudioConstraints(constraints);
    if (deviceId) {
      mediaConstraints.deviceId = { exact: deviceId };
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: mediaConstraints,
    });

    this.unbindTrackMonitor = monitorTrackDisconnection(this.stream, (reason) => {
      this.callbacks.onEnded?.(reason);
      this.teardown();
    });

    const { mimeType } = getSupportedAudioMimeType();
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);

    this.buffer.clear();
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.buffer.push(event.data);
        this.callbacks.onDataAvailable?.(event.data);
      }
    };

    this.mediaRecorder.onerror = (event: Event) => {
      const errorEvent = event as unknown as { error?: Error };
      const err = errorEvent.error || new Error("MediaRecorder error occurred");
      this.callbacks.onError?.(err);
    };

    this.mediaRecorder.start(timesliceMs);
    this.isRecording = true;
  }

  public async stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        resolve(this.buffer.toCombinedBlob(getSupportedAudioMimeType().mimeType || "audio/webm"));
        this.teardown();
        return;
      }

      this.mediaRecorder.onstop = () => {
        const finalBlob = this.buffer.toCombinedBlob(
          this.mediaRecorder?.mimeType || getSupportedAudioMimeType().mimeType || "audio/webm"
        );
        this.teardown();
        resolve(finalBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  public teardown(): void {
    if (this.unbindTrackMonitor) {
      this.unbindTrackMonitor();
      this.unbindTrackMonitor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.isRecording = false;
  }

  public get recording(): boolean {
    return this.isRecording;
  }

  public get currentBuffer(): AudioChunkRingBuffer {
    return this.buffer;
  }
}





