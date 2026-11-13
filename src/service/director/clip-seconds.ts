import type { DurationPreset, PhaseAProposal, SpeechPace } from "@/model/project";
import { ONE_TAKE_MAX_SECONDS } from "@/model/director";
import { spokenUnits } from "@/service/director/talking-head";
import { resolveSpeechPace } from "@/service/director/speech-pace";

// Every director's storyboard clip. Providers also refuse anything under 5s.
export const CLIP_MIN_SECONDS = 5;
export const CLIP_MAX_SECONDS = 12;

// Medium pace. Same rates as the talking-head planner.
const ENGLISH_WORDS_PER_SECOND = 2.4;
const CJK_CHARS_PER_SECOND = 4;

function paceDivisor(pace?: SpeechPace) {
  const speed = resolveSpeechPace(pace);
  if (speed === "slow") return 0.8;
  if (speed === "fast") return 1.2;
  return 1;
}

// Drop the silent placeholder so it does not count as speech.
function spokenBody(text: string) {
  return text.replace(/\(no dialogue\)/gi, " ").replace(/\s+/g, " ").trim();
}

// Seconds the line takes at this pace, clamped to 5–12. No speech stays at 5.
export function spokenClipSeconds(text: string, pace?: SpeechPace) {
  const { cjk, words } = spokenUnits(spokenBody(text));
  if (cjk + words === 0) return CLIP_MIN_SECONDS;
  const raw = (cjk / CJK_CHARS_PER_SECOND + words / ENGLISH_WORDS_PER_SECOND) / paceDivisor(pace);
  return Math.min(CLIP_MAX_SECONDS, Math.max(CLIP_MIN_SECONDS, Math.round(raw)));
}

type SpokenClip = {
  englishVo?: string;
  startVo?: string;
  endVo?: string;
};

// Dual-beat clips speak startVo then endVo. A single-beat clip speaks englishVo.
export function clipSpokenText(clip: SpokenClip) {
  const start = clip.startVo?.trim() ?? "";
  const end = clip.endVo?.trim() ?? "";
  if (start || end) return [start, end].filter(Boolean).join(" ");
  return clip.englishVo?.trim() ?? "";
}

type TimedClip = SpokenClip & {
  durationSeconds: number;
  timeRange: string;
};

function resolvedSeconds<T extends TimedClip>(
  clip: T,
  pace?: SpeechPace,
  options?: { preservePlannedDuration?: boolean; maxSeconds?: number },
) {
  const cap = options?.maxSeconds ?? CLIP_MAX_SECONDS;
  const spoken = spokenClipSeconds(clipSpokenText(clip), pace);
  if (!options?.preservePlannedDuration) return spoken;
  const planned = Math.min(
    cap,
    Math.max(CLIP_MIN_SECONDS, Math.round(clip.durationSeconds || CLIP_MIN_SECONDS)),
  );
  return Math.min(cap, Math.max(planned, spoken));
}

// One clip. timeRange is this clip only; the storyboard pass assigns the timeline.
export function withSpokenClipDuration<T extends TimedClip>(
  clip: T,
  pace?: SpeechPace,
  options?: { preservePlannedDuration?: boolean; maxSeconds?: number },
): T {
  const seconds = resolvedSeconds(clip, pace, options);
  return { ...clip, durationSeconds: seconds, timeRange: `0–${seconds}s` };
}

// Whole storyboard. Duration follows the line; ranges run in order.
export function withSpokenClipDurations<T extends TimedClip>(
  clips: T[],
  pace?: SpeechPace,
  options?: { preservePlannedDuration?: boolean; maxSeconds?: number },
): T[] {
  let cursor = 0;
  return clips.map((clip) => {
    const seconds = resolvedSeconds(clip, pace, options);
    const start = cursor;
    cursor += seconds;
    return { ...clip, durationSeconds: seconds, timeRange: `${start}–${cursor}s` };
  });
}

function parseExplicitSecondsFromSource(source?: string): number | null {
  if (!source?.trim()) return null;
  const minMatch = source.match(/\b1\s*(?:min(?:ute)?|分鐘|分钟)\b/i);
  if (minMatch) return 60;
  const secMatch = source.match(/\b(\d{1,2})\s*(?:s|sec|seconds?|秒)\b/i);
  if (secMatch?.[1]) {
    const parsed = Number(secMatch[1]);
    if (Number.isFinite(parsed) && parsed >= 5 && parsed <= 60) {
      return parsed;
    }
  }
  return null;
}

function presetOneTakeSeconds(preset?: DurationPreset): number {
  if (preset === "micro") return 6;
  if (preset === "short") return 18;
  if (preset === "punchy") return 36;
  if (preset === "full") return 60;
  return 18;
}

export function resolveOneTakeDurationSeconds(input: {
  plannedSeconds?: number;
  durationPreset?: DurationPreset;
  source?: string;
}): number {
  const explicit = parseExplicitSecondsFromSource(input.source);
  if (explicit) return explicit;
  // A dock length (6 / 18 / 36 / 60) is the clip. A written length in the source still wins above.
  if (input.durationPreset && input.durationPreset !== "auto") {
    return presetOneTakeSeconds(input.durationPreset);
  }
  const planned = Math.round(input.plannedSeconds || 0);
  if (planned > CLIP_MIN_SECONDS) {
    return Math.min(ONE_TAKE_MAX_SECONDS, Math.max(CLIP_MIN_SECONDS, planned));
  }
  return presetOneTakeSeconds(input.durationPreset);
}

export function normalizeOneTakePhaseA(
  proposal: PhaseAProposal,
  options?: { durationPreset?: DurationPreset; source?: string },
): PhaseAProposal {
  const rows = proposal.clips || [];
  const first = rows[0];
  if (!first) return proposal;
  const plannedSum = rows.reduce((sum, r) => sum + (Number(r.durationSeconds) || 0), 0);
  const durationSeconds = resolveOneTakeDurationSeconds({
    plannedSeconds: rows.length > 1 ? plannedSum : first.durationSeconds,
    durationPreset: options?.durationPreset,
    source: options?.source,
  });

  const mergedMotion =
    rows.length > 1
      ? rows
          .map((row, idx) => {
            const winStart = Math.round((idx * durationSeconds) / rows.length);
            const winEnd = Math.round(((idx + 1) * durationSeconds) / rows.length);
            const clean = row.motionCamera
              .replace(/^\s*\d+\s*[–-]\s*\d+s\s*:?\s*/i, "")
              .trim();
            return `${winStart}–${winEnd}s ${clean}`;
          })
          .join("; ")
      : first.motionCamera;

  const singleClip = {
    ...first,
    clipNumber: 1,
    durationSeconds,
    timeRange: `0–${durationSeconds}s`,
    motionCamera: mergedMotion,
    englishVo: "(no dialogue)",
    ...(first.startVo !== undefined ? { startVo: "" } : {}),
    ...(first.endVo !== undefined ? { endVo: "" } : {}),
  };

  return {
    ...proposal,
    clipCount: 1,
    targetDuration: `${durationSeconds}s`,
    narrator: "No narrator — pure continuous motion and ambient sound.",
    englishWordCount: 1,
    clips: [singleClip],
  };
}
