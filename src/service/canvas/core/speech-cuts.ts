// Pure: turns Scribe word timings into cuts for fillers, restarted phrases, and long pauses.
// The kept ranges feed the same trim/concat filter as ffmpeg:keep-ranges.

import type { ScribeWord } from "@/service/canvas/core/captions";
import { mergeRanges, type TimeRange } from "@/service/canvas/core/edit-ranges";

export type SpeechCutReason = "filler" | "repeat" | "pause";

export type SpeechCut = TimeRange & { reason: SpeechCutReason; text: string };

export type SpeechCutOptions = {
  fillers: boolean;
  repeats: boolean;
  // Pauses longer than this shrink to PAUSE_KEEP_SEC; 0 keeps every pause.
  maxPauseSec: number;
};

export const DEFAULT_SPEECH_CUT_OPTIONS: SpeechCutOptions = { fillers: true, repeats: true, maxPauseSec: 0.8 };

// Breath left on each side of a shortened pause.
const PAUSE_KEEP_SEC = 0.2;
// Kept pieces shorter than this are dropped, so the render never holds a stray frame.
const MIN_KEEP_SEC = 0.08;
const MAX_REPEAT_TOKENS = 8;

const FILLERS = new Set(["um", "umm", "uh", "uhh", "uhm", "erm", "er", "ah", "hmm", "mm", "嗯", "呃", "額", "唔", "誒", "欸", "嗯嗯"]);

const CJK = /[\u3400-\u9fff]/;

type Token = { norm: string; text: string; start: number; end: number };

function tokens(words: readonly ScribeWord[]): Token[] {
  const out: Token[] = [];
  for (const w of words) {
    if (w.type && w.type !== "word") continue;
    const text = (w.text ?? "").trim();
    if (!text || typeof w.start !== "number" || typeof w.end !== "number" || w.end < w.start) continue;
    const norm = text.toLowerCase().replace(/[\p{P}\p{S}]/gu, "");
    if (!norm) continue;
    out.push({ norm, text, start: w.start, end: w.end });
  }
  return out;
}

function isFiller(t: Token): boolean {
  return FILLERS.has(t.norm);
}

// A phrase said twice in a row ("I think I think", 「我哋我哋」): the first take is cut.
// One repeated word is kept, since "very very" or 「謝謝」 are usually meant.
function repeatAt(list: readonly Token[], i: number): number {
  for (let n = Math.min(MAX_REPEAT_TOKENS, Math.floor((list.length - i) / 2)); n >= 1; n -= 1) {
    let same = true;
    for (let k = 0; k < n && same; k += 1) same = list[i + k]!.norm === list[i + n + k]!.norm;
    if (!same) continue;
    const chars = list.slice(i, i + n).map((t) => t.norm).join("");
    const long = CJK.test(chars) ? [...chars].length >= 2 : n >= 2;
    if (long) return n;
  }
  return 0;
}

export function planSpeechCuts(
  words: readonly ScribeWord[],
  durationSec: number,
  options: SpeechCutOptions = DEFAULT_SPEECH_CUT_OPTIONS,
): { cuts: SpeechCut[]; keep: TimeRange[] } {
  const all = tokens(words);
  const cuts: SpeechCut[] = [];
  const spoken: Token[] = [];

  for (const t of all) {
    if (options.fillers && isFiller(t)) cuts.push({ start: t.start, end: t.end, reason: "filler", text: t.text });
    else spoken.push(t);
  }

  if (options.repeats) {
    for (let i = 0; i < spoken.length; ) {
      const n = repeatAt(spoken, i);
      if (n === 0) {
        i += 1;
        continue;
      }
      const first = spoken.slice(i, i + n);
      // Up to where the second take starts, so the gap before it goes too.
      cuts.push({
        start: first[0]!.start,
        end: spoken[i + n]!.start,
        reason: "repeat",
        text: first.map((t) => t.text).join(CJK.test(first[0]!.text) ? "" : " "),
      });
      i += n;
    }
  }

  if (options.maxPauseSec > 0 && spoken.length > 0) {
    const edges = [
      { from: 0, to: spoken[0]!.start },
      ...spoken.slice(1).map((t, k) => ({ from: spoken[k]!.end, to: t.start })),
      { from: spoken.at(-1)!.end, to: durationSec },
    ];
    for (const gap of edges) {
      if (gap.to - gap.from <= options.maxPauseSec) continue;
      cuts.push({ start: gap.from + PAUSE_KEEP_SEC, end: gap.to - PAUSE_KEEP_SEC, reason: "pause", text: "" });
    }
  }

  const removed = mergeRanges(
    cuts
      .map((c) => ({ start: Math.max(0, c.start), end: Math.min(durationSec, c.end) }))
      .filter((r) => r.end > r.start),
  );
  const keep: TimeRange[] = [];
  let at = 0;
  for (const r of removed) {
    if (r.start - at >= MIN_KEEP_SEC) keep.push({ start: round(at), end: round(r.start) });
    at = Math.max(at, r.end);
  }
  if (durationSec - at >= MIN_KEEP_SEC) keep.push({ start: round(at), end: round(durationSec) });
  return { cuts: cuts.sort((a, b) => a.start - b.start), keep };
}

function round(sec: number): number {
  return Math.round(sec * 1000) / 1000;
}

export function keepRangesText(keep: readonly TimeRange[]): string {
  return keep.map((r) => `${r.start.toFixed(2)}-${r.end.toFixed(2)}`).join(", ");
}

// Human-readable report stored on the node: what was cut and how much time it saved.
export function speechCutReport(cuts: readonly SpeechCut[], keep: readonly TimeRange[], durationSec: number): string {
  const kept = keep.reduce((sum, r) => sum + (r.end - r.start), 0);
  const label: Record<SpeechCutReason, string> = { filler: "語氣詞 filler", repeat: "重複 repeat", pause: "停頓 pause" };
  const lines = cuts.map(
    (c) => `${c.start.toFixed(2)}–${c.end.toFixed(2)}s ${label[c.reason]}${c.text ? `：${c.text}` : ""}`,
  );
  return [
    `${durationSec.toFixed(1)}s → ${kept.toFixed(1)}s（剪走 ${cuts.length} 處 / ${cuts.length} cuts）`,
    ...lines,
    `保留 keep: ${keepRangesText(keep)}`,
  ].join("\n");
}
