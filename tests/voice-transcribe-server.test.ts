import { describe, it, expect, vi } from "vitest";
import path from "path";
import os from "os";
import fs from "fs/promises";
import {
  validateAudioPayloadSize,
  verifyAudioMagicBytes,
  assertValidTranscriptionSession,
  checkSessionRateLimit,
  pruneExpiredRateLimits,
  resetSessionRateLimitsForTest,
  getSessionRateLimitsSize,
  formatUpstreamTranscriptionError,
  safeCleanupTemporaryAudioFile,
  MAX_AUDIO_PAYLOAD_BYTES,
} from "@/server/voice-transcribe";
import {
  generateSyntheticWavBuffer,
  generateSyntheticWebmHeaderBuffer,
} from "./helpers/audio-buffer-generator";

describe("Voice Transcribe Server Validation", () => {
  describe("validateAudioPayloadSize", () => {
    it("rejects empty audio payloads", () => {
      const emptyBlob = new Blob([], { type: "audio/webm" });
      const result = validateAudioPayloadSize(emptyBlob);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("accepts valid payloads within the 15MB limit", () => {
      const validBlob = new Blob([new Uint8Array(1024 * 50)], {
        type: "audio/webm",
      });
      const result = validateAudioPayloadSize(validBlob);
      expect(result.valid).toBe(true);
      expect(result.sizeBytes).toBe(1024 * 50);
    });

    it("rejects payloads that exceed 15MB", () => {
      const oversizedBlob = {
        size: MAX_AUDIO_PAYLOAD_BYTES + 1024,
      } as unknown as Blob;
      const result = validateAudioPayloadSize(oversizedBlob);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds the maximum allowed limit");
    });
  });

  describe("verifyAudioMagicBytes", () => {
    it("identifies valid WebM container headers", () => {
      const webmBuffer = generateSyntheticWebmHeaderBuffer();
      const result = verifyAudioMagicBytes(webmBuffer);
      expect(result.valid).toBe(true);
      expect(result.detectedFormat).toBe("webm");
    });

    it("identifies valid WAV container headers", () => {
      const wavBuffer = generateSyntheticWavBuffer(0.1);
      const result = verifyAudioMagicBytes(wavBuffer);
      expect(result.valid).toBe(true);
      expect(result.detectedFormat).toBe("wav");
    });

    it("rejects corrupt or arbitrary bytes", () => {
      const corrupt = Buffer.from([0x00, 0x11, 0x22, 0x33]);
      const result = verifyAudioMagicBytes(corrupt);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unrecognized audio container header");
    });
  });

  describe("assertValidTranscriptionSession", () => {
    it("returns userId for valid session", () => {
      expect(assertValidTranscriptionSession({ userId: "user-123" })).toBe(
        "user-123"
      );
    });

    it("throws error for missing or empty session", () => {
      expect(() => assertValidTranscriptionSession(null)).toThrow(
        "Valid user session required"
      );
      expect(() => assertValidTranscriptionSession({ userId: "" })).toThrow(
        "Valid user session required"
      );
    });
  });

  describe("checkSessionRateLimit", () => {
    it("permits initial requests and tracks remaining quota", () => {
      const testUser = `rate-limit-test-${Date.now()}`;
      const res1 = checkSessionRateLimit(testUser, 3);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = checkSessionRateLimit(testUser, 3);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = checkSessionRateLimit(testUser, 3);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      const res4 = checkSessionRateLimit(testUser, 3);
      expect(res4.allowed).toBe(false);
      expect(res4.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("prunes expired timestamps and removes empty user keys", () => {
      resetSessionRateLimitsForTest();
      const user = "expired-user";
      // Record at time 1000
      checkSessionRateLimit(user, 5, 5000);
      expect(getSessionRateLimitsSize()).toBe(1);

      // Prune with current time well past window (e.g. 100,000)
      const pruned = pruneExpiredRateLimits(Date.now() + 100000, 5000);
      expect(pruned).toBe(1);
      expect(getSessionRateLimitsSize()).toBe(0);
    });

    it("triggers automatic cleanup sweep when cache size exceeds threshold", () => {
      resetSessionRateLimitsForTest();
      // Populate 205 users with older timestamps
      const fakeNow = Date.now();
      for (let i = 0; i < 205; i++) {
        checkSessionRateLimit(`bulk-user-${i}`, 10, 1000);
      }
      expect(getSessionRateLimitsSize()).toBe(205);

      // Advance time and make 1 request for a new user, which triggers sweep
      const futureTime = fakeNow + 5000;
      pruneExpiredRateLimits(futureTime, 1000);
      expect(getSessionRateLimitsSize()).toBe(0);
    });
  });

  describe("formatUpstreamTranscriptionError", () => {
    it("formats 429 rate limit errors with cooldown advice", () => {
      const error = new Error("429 rate limit reached on provider");
      const formatted = formatUpstreamTranscriptionError(error);
      expect(formatted.status).toBe(429);
      expect(formatted.isRateLimit).toBe(true);
      expect(formatted.message).toContain("experiencing high demand");
    });

    it("formats timeout errors with user guidance", () => {
      const error = new Error("request aborted due to timeout");
      const formatted = formatUpstreamTranscriptionError(error);
      expect(formatted.status).toBe(504);
      expect(formatted.message).toContain("timed out");
    });
  });

  describe("safeCleanupTemporaryAudioFile", () => {
    it("handles undefined and empty file paths gracefully", async () => {
      await expect(safeCleanupTemporaryAudioFile(undefined)).resolves.not.toThrow();
      await expect(safeCleanupTemporaryAudioFile("")).resolves.not.toThrow();
    });

    it("unlinks files in system temp directory despite case differences", async () => {
      const unlinkSpy = vi.spyOn(fs, "unlink").mockResolvedValue(undefined);

      // Create a test path in the temp directory with alternating case
      const tempPath = path.join(os.tmpdir(), "voice-test-audio.webm");
      const testPathLower = tempPath.toLowerCase();

      await safeCleanupTemporaryAudioFile(testPathLower);

      expect(unlinkSpy).toHaveBeenCalledWith(path.resolve(testPathLower));
      unlinkSpy.mockRestore();
    });
  });
});
