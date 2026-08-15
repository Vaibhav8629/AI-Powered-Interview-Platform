/**
 * Interviewer helpers
 * -------------------
 * Centralised helpers for selecting the correct interviewer video and TTS voice
 * based on the chosen interviewer gender ("male" | "female").
 *
 * VOICE MAPPING
 * -------------
 * Browser speech-synthesis voice names are not standardised across platforms,
 * so gender cannot be reliably detected from voice metadata alone.
 * The VOICE_MAP below lets you explicitly name the preferred voice for each gender.
 *
 * How to find the right voice name:
 *   1. Open your browser's DevTools console on the interview page.
 *   2. Run: window.speechSynthesis.getVoices().map(v => v.name)
 *   3. Pick a male and female name you like and paste them below.
 *
 * If the configured name is not available in the browser the helpers fall back
 * to keyword-based heuristics, then to any English voice.
 */

// ─── Configurable voice mapping ──────────────────────────────────────────────
// Set these to exact voice names visible in your browser.
// Leave as "" to rely solely on keyword-based auto-detection.
export const VOICE_MAP = {
  male: "",   // e.g. "Google UK English Male", "Microsoft David Desktop"
  female: "", // e.g. "Google UK English Female", "Microsoft Zira Desktop"
};

// Keyword lists used for heuristic fallback
const MALE_KEYWORDS = [
  "male", "man", "david", "john", "alex", "daniel",
  "matt", "michael", "mark", "robert", "james", "guy",
];
const FEMALE_KEYWORDS = [
  "female", "woman", "zira", "susan", "emily", "linda",
  "kathy", "amy", "kate", "sara", "sarah", "samantha",
  "victoria", "karen", "moira", "fiona",
];

// ─── getInterviewerVideo ─────────────────────────────────────────────────────
/**
 * Returns the public-folder video path for the given interviewer gender.
 * @param {"male"|"female"} gender
 * @returns {string} e.g. "/male-ai.mp4"
 */
export function getInterviewerVideo(gender) {
  return gender === "female" ? "/female-ai.mp4" : "/male-ai.mp4";
}

// ─── getInterviewerVoice ─────────────────────────────────────────────────────
/**
 * Selects the best available SpeechSynthesisVoice for the given gender.
 *
 * Resolution order:
 *  1. Exact match from VOICE_MAP (if configured)
 *  2. Keyword heuristic against English voices
 *  3. Any English voice
 *  4. First available voice
 *  5. null (let the browser pick its default)
 *
 * @param {"male"|"female"} gender
 * @param {SpeechSynthesisVoice[]} voices  – from window.speechSynthesis.getVoices()
 * @returns {SpeechSynthesisVoice|null}
 */
export function getInterviewerVoice(gender, voices) {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  const englishVoices = voices.filter((v) => /^en([_-]|$)/i.test(v.lang || ""));
  const pool = englishVoices.length > 0 ? englishVoices : voices;

  // 1. Explicit mapping
  const configured = VOICE_MAP[gender];
  if (configured) {
    const exact = voices.find(
      (v) => v.name.toLowerCase() === configured.toLowerCase()
    );
    if (exact) return exact;

    // Partial match (in case the name has extra platform suffixes)
    const partial = voices.find((v) =>
      v.name.toLowerCase().includes(configured.toLowerCase())
    );
    if (partial) return partial;
  }

  // 2. Keyword heuristic
  const keywords = gender === "female" ? FEMALE_KEYWORDS : MALE_KEYWORDS;
  for (const kw of keywords) {
    const match = pool.find(
      (v) =>
        (v.name || "").toLowerCase().includes(kw) ||
        (v.voiceURI || "").toLowerCase().includes(kw)
    );
    if (match) return match;
  }

  // 3. Opposite-keyword exclusion: prefer a voice that does NOT look like the
  //    opposite gender (avoids picking a known female voice for male, etc.)
  const oppositeKeywords = gender === "female" ? MALE_KEYWORDS : FEMALE_KEYWORDS;
  const neutral = pool.find(
    (v) =>
      !oppositeKeywords.some(
        (kw) =>
          (v.name || "").toLowerCase().includes(kw) ||
          (v.voiceURI || "").toLowerCase().includes(kw)
      )
  );
  if (neutral) return neutral;

  // 4. Any English voice
  if (englishVoices.length > 0) return englishVoices[0];

  // 5. First available voice
  return voices[0] ?? null;
}
