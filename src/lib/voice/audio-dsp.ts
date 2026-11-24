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


