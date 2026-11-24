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

