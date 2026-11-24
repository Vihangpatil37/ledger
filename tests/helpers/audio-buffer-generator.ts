/**
 * Audio Buffer Generator for Voice Pipeline Tests
 * Generates synthetic WAV and WebM byte buffers with valid container headers
 */

export function generateSyntheticWavBuffer(
  durationSeconds: number = 0.5,
  sampleRate: number = 16000,
  frequencyHz: number = 440
): Buffer {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const dataSize = numSamples * 2; // 16-bit mono
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write sine wave samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequencyHz * t);
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

export function generateSyntheticWebmHeaderBuffer(): Buffer {
  // EBML Header: 1A 45 DF A3
  const buffer = Buffer.alloc(64);
  buffer[0] = 0x1a;
  buffer[1] = 0x45;
  buffer[2] = 0xdf;
  buffer[3] = 0xa3;
  return buffer;
}
