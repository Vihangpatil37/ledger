/**
 * Audio Capture Engine for Groq Whisper integration
 */

export interface AudioCaptureConstraintsOptions {
  sampleRate?: number;
  channelCount?: number;
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
