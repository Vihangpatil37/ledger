/**
 * Audio Digital Signal Processing and Voice Activity Detection for Groq Whisper
 */

export interface AnalyserNodeSetup {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
}

export interface AnalyserConfigOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
}

/**
 * Connect an audio analyser node to the input stream for live amplitude checks
 */
export function connectStreamAnalyser(
  stream: MediaStream,
  options: AnalyserConfigOptions = {}
): AnalyserNodeSetup {
  const { fftSize = 512, smoothingTimeConstant = 0.3 } = options;

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  const audioContext = new AudioContextClass();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothingTimeConstant;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  return { audioContext, analyser, source };
}

/**
 * Calculate true root mean square (RMS) volume normalized between 0.0 and 1.0
 */
export function calculateRmsVolume(analyser: AnalyserNode): number {
  const bufferLength = analyser.frequencyBinCount;
  const timeData = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(timeData);

  let sumSquares = 0;
  for (let i = 0; i < bufferLength; i++) {
    // Convert 0..255 byte domain to -1.0..1.0 float domain
    const normalized = (timeData[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }

  const rms = Math.sqrt(sumSquares / bufferLength);
  return Math.min(1, Math.max(0, rms));
}

/**
 * Sample ambient room sound during initial startup to establish dynamic noise floor baseline
 */
export async function sampleRoomNoiseBaseline(
  analyser: AnalyserNode,
  sampleDurationMs: number = 300,
  stepIntervalMs: number = 50
): Promise<number> {
  const samples: number[] = [];
  const iterations = Math.max(1, Math.floor(sampleDurationMs / stepIntervalMs));

  for (let i = 0; i < iterations; i++) {
    samples.push(calculateRmsVolume(analyser));
    await new Promise((resolve) => setTimeout(resolve, stepIntervalMs));
  }

  const average = samples.reduce((acc, val) => acc + val, 0) / samples.length;
  // Floor baseline at a reasonable ambient floor (0.01)
  return Math.max(0.01, average);
}

export interface SpeechDetectionThresholds {
  noiseFloor: number;
  snrMultiplier?: number;
  minimumSpeechRms?: number;
}

/**
 * Determine if the current volume reading qualifies as active speech over noise floor
 */
export function isSpeechActive(
  currentVolume: number,
  thresholds: SpeechDetectionThresholds
): boolean {
  const { noiseFloor, snrMultiplier = 1.8, minimumSpeechRms = 0.04 } = thresholds;
  const triggerLevel = Math.max(minimumSpeechRms, noiseFloor * snrMultiplier);
  return currentVolume >= triggerLevel;
}

/**
 * Stopwatch tracking consecutive duration of silence after speech has commenced
 */
export class SilenceStopwatch {
  private silenceStartTimestamp: number | null = null;

  public markSilence(now: number = Date.now()): void {
    if (this.silenceStartTimestamp === null) {
      this.silenceStartTimestamp = now;
    }
  }

  public reset(): void {
    this.silenceStartTimestamp = null;
  }

  public getElapsedSilenceMs(now: number = Date.now()): number {
    if (this.silenceStartTimestamp === null) {
      return 0;
    }
    return Math.max(0, now - this.silenceStartTimestamp);
  }

  public get isTracking(): boolean {
    return this.silenceStartTimestamp !== null;
  }
}





