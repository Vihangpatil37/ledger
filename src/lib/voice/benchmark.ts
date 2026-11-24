/**
 * Voice Pipeline Benchmark and Roundtrip Latency Tracker
 */

export interface LatencyMilestone {
  step: "mic_released" | "audio_buffered" | "transcribed" | "parsed" | "rendered";
  timestamp: number;
}

/**
 * Measure transcription roundtrip speed from microphone release to parsed proposal
 */
export class VoiceLatencyTracker {
  private milestones: LatencyMilestone[] = [];

  constructor() {
    this.mark("mic_released");
  }

  public mark(step: LatencyMilestone["step"]): void {
    this.milestones.push({ step, timestamp: Date.now() });
  }

  public getSummary(): {
    totalDurationMs: number;
    breakdown: Record<string, number>;
  } {
    if (this.milestones.length === 0) {
      return { totalDurationMs: 0, breakdown: {} };
    }

    const t0 = this.milestones[0].timestamp;
    const breakdown: Record<string, number> = {};
    for (let i = 1; i < this.milestones.length; i++) {
      const prev = this.milestones[i - 1];
      const curr = this.milestones[i];
      breakdown[`${prev.step}->${curr.step}`] = curr.timestamp - prev.timestamp;
    }

    const last = this.milestones[this.milestones.length - 1];
    return {
      totalDurationMs: last.timestamp - t0,
      breakdown,
    };
  }
}

export interface VoiceAuditLogEntry {
  transcriptLength: number;
  customerMatchConfidence: number;
  matchedCustomerName?: string;
  matchedAction?: string;
  amountPaise?: number;
  durationMs: number;
  engine: "BROWSER" | "AUDIO_RECORDING";
}

/**
 * Log transcription length and customer match confidence for audit quality
 */
export function logVoiceAuditEntry(entry: VoiceAuditLogEntry): void {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[Voice:Audit] engine=${entry.engine} chars=${entry.transcriptLength} ` +
        `confidence=${(entry.customerMatchConfidence * 100).toFixed(1)}% ` +
        `customer=${entry.matchedCustomerName || "none"} ` +
        `action=${entry.matchedAction || "unknown"} ` +
        `duration=${entry.durationMs}ms`
    );
  }
}

