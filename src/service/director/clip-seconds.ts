import type { SpeechPace } from "@/model/project";
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

// One clip. timeRange is this clip only; the storyboard pass assigns the timeline.
export function withSpokenClipDuration<T extends TimedClip>(clip: T, pace?: SpeechPace): T {
  const seconds = spokenClipSeconds(clipSpokenText(clip), pace);
  return { ...clip, durationSeconds: seconds, timeRange: `0–${seconds}s` };
}

// Whole storyboard. Duration follows the line; ranges run in order.
export function withSpokenClipDurations<T extends TimedClip>(clips: T[], pace?: SpeechPace): T[] {
  let cursor = 0;
  return clips.map((clip) => {
    const seconds = spokenClipSeconds(clipSpokenText(clip), pace);
    const start = cursor;
    cursor += seconds;
    return { ...clip, durationSeconds: seconds, timeRange: `${start}–${cursor}s` };
  });
}
