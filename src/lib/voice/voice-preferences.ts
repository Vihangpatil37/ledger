/**
 * Voice engine and modality preferences stored in browser local storage
 */
export const VOICE_ENGINE_STORAGE_KEY = "chai-ledger:voice-engine";
export type VoiceEngineMode = "BROWSER" | "AUDIO_RECORDING";

/**
 * Save the shopkeeper's chosen voice engine inside local storage
 */
export function saveVoiceEnginePreference(mode: VoiceEngineMode): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(VOICE_ENGINE_STORAGE_KEY, mode);
  } catch {
    // Ignore quota errors in private browsing
  }
}
