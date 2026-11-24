import { describe, it, expect } from "vitest";
import {
  isSpeechActive,
  SilenceStopwatch,
  evaluateAutoStop,
  hasMetMinimumSpeechDuration,
  calculateVisualizerRingScale,
  DEFAULT_SILENCE_AUTO_STOP_MS,
  MINIMUM_SPEECH_DURATION_MS,
} from "@/lib/voice/audio-dsp";

describe("Voice Activity Detection and Auto-Stop Triggers", () => {
  describe("isSpeechActive", () => {
    it("marks speech active when volume exceeds dynamic noise floor and minimum RMS", () => {
      const thresholds = { noiseFloor: 0.02, snrMultiplier: 1.8, minimumSpeechRms: 0.04 };
      expect(isSpeechActive(0.01, thresholds)).toBe(false);
      expect(isSpeechActive(0.03, thresholds)).toBe(false);
      expect(isSpeechActive(0.06, thresholds)).toBe(true);
    });
  });

  describe("SilenceStopwatch and evaluateAutoStop", () => {
    it("tracks silence start and measures elapsed time", () => {
      const stopwatch = new SilenceStopwatch();
      expect(stopwatch.isTracking).toBe(false);

      const t0 = 1000;
      stopwatch.markSilence(t0);
      expect(stopwatch.isTracking).toBe(true);
      expect(stopwatch.getElapsedSilenceMs(t0 + 500)).toBe(500);

      // Subsequent marks should not reset the initial timestamp
      stopwatch.markSilence(t0 + 200);
      expect(stopwatch.getElapsedSilenceMs(t0 + 500)).toBe(500);

      stopwatch.reset();
      expect(stopwatch.isTracking).toBe(false);
      expect(stopwatch.getElapsedSilenceMs(t0 + 500)).toBe(0);
    });

    it("triggers auto-stop once silence crosses 1500ms threshold", () => {
      const stopwatch = new SilenceStopwatch();
      const t0 = 1000;
      stopwatch.markSilence(t0);

      const evalBefore = evaluateAutoStop(stopwatch, DEFAULT_SILENCE_AUTO_STOP_MS, t0 + 1200);
      expect(evalBefore.shouldStop).toBe(false);
      expect(evalBefore.elapsedSilenceMs).toBe(1200);

      const evalAtThreshold = evaluateAutoStop(stopwatch, DEFAULT_SILENCE_AUTO_STOP_MS, t0 + 1500);
      expect(evalAtThreshold.shouldStop).toBe(true);
      expect(evalAtThreshold.reason).toBe("silence_timeout");
      expect(evalAtThreshold.elapsedSilenceMs).toBe(1500);
    });
  });

  describe("hasMetMinimumSpeechDuration", () => {
    it("rejects micro-taps under 400ms and accepts valid speech", () => {
      expect(hasMetMinimumSpeechDuration(200, MINIMUM_SPEECH_DURATION_MS)).toBe(false);
      expect(hasMetMinimumSpeechDuration(399, MINIMUM_SPEECH_DURATION_MS)).toBe(false);
      expect(hasMetMinimumSpeechDuration(400, MINIMUM_SPEECH_DURATION_MS)).toBe(true);
      expect(hasMetMinimumSpeechDuration(1200, MINIMUM_SPEECH_DURATION_MS)).toBe(true);
    });
  });

  describe("calculateVisualizerRingScale", () => {
    it("scales smoothly between base scale and maximum expanded ring scale", () => {
      const minScale = calculateVisualizerRingScale(0.0);
      expect(minScale).toBe(1.0);

      const maxScale = calculateVisualizerRingScale(1.0);
      expect(maxScale).toBe(1.35);

      const midScale = calculateVisualizerRingScale(0.5);
      expect(midScale).toBeGreaterThan(1.0);
      expect(midScale).toBeLessThan(1.35);
    });
  });
});
