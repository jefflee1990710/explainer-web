// Auto captions for the canvas: ElevenLabs Scribe word times become an editable SRT,
// and the burn node turns that SRT into ASS for FFmpeg libass.

import { mulUsd } from "@/service/billing/usd";
import { type SubtitleAssStyle, subtitleAssStyle } from "@/service/canvas/core/subtitle-look-styles";

export const SCRIBE_MODEL_ID = "scribe_v3";
// ElevenLabs batch Scribe list price, billed per second of audio.
export const SCRIBE_USD_PER_HOUR = 0.2;
export const CAPTION_LANGUAGES = ["auto", "yue", "zh", "en"] as const;
export type CaptionLanguage = (typeof CAPTION_LANGUAGES)[number];

export type CaptionCue = { start: number; end: number; text: string };

export type ScribeWord = {
  text?: string;
  start?: number;
  end?: number;
  type?: string;
};

const CJK = /[\u3400-\u9fff]/g;

export function autoCaptionsCostUsd(durationSeconds: number): number {
  const seconds = Math.max(0, durationSeconds);
  return mulUsd(SCRIBE_USD_PER_HOUR, seconds / 3600);
}

export function normalizeCaptionLanguage(value: unknown): CaptionLanguage {
  return CAPTION_LANGUAGES.includes(value as CaptionLanguage) ? (value as CaptionLanguage) : "yue";
}

export function durationFromProbe(stderr: string): number | null {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function probeHasAudio(stderr: string): boolean {
  return /Stream\s+#\d+:\d+.*Audio:/i.test(stderr);
}

export function cuesFromScribeWords(words: readonly ScribeWord[]): CaptionCue[] {
  const tokens: CaptionCue[] = [];
  for (const word of words) {
    if (word.type === "audio_event") continue;
    const text = word.text ?? "";
    if (!text) continue;
    if (word.type === "spacing") {
      const last = tokens[tokens.length - 1];
      if (last) last.text += text;
      continue;
    }
    const start = Number(word.start ?? 0);
    const end = Math.max(start, Number(word.end ?? start));
    tokens.push({ start, end, text });
  }

  const cues: CaptionCue[] = [];
  let buf = "";
  let start = 0;
  let end = 0;
  const flush = () => {
    const text = buf.trim();
    if (!text) return;
    cues.push({ start, end: Math.max(end, start + 0.2), text });
  };

  for (const token of tokens) {
    if (!buf) {
      buf = token.text;
      start = token.start;
      end = token.end;
    } else {
      const joined = buf + token.text;
      const cjk = (joined.match(CJK) ?? []).length;
      const tooLong = cjk > 0 ? cjk > 18 : joined.trim().length > 42;
      const tooTime = token.end - start > 4.5;
      if (tooLong || tooTime) {
        flush();
        buf = token.text;
        start = token.start;
        end = token.end;
      } else {
        buf = joined;
        end = token.end;
      }
    }
    if (/[。！？!?]$/.test(buf.trim()) && buf.trim().length >= 4) {
      flush();
      buf = "";
    }
  }
  if (buf.trim()) flush();
  return cues;
}

function srtStamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(milli).padStart(3, "0")}`;
}

export function cuesToSrt(cues: readonly CaptionCue[]): string {
  return cues
    .map((cue, index) => `${index + 1}\n${srtStamp(cue.start)} --> ${srtStamp(cue.end)}\n${cue.text}\n`)
    .join("\n");
}

function clockToSeconds(h: string, m: string, s: string, frac: string): number {
  const millis = Number(frac.padEnd(3, "0").slice(0, 3));
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + millis / 1000;
}

export function parseSrt(text: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timeLine = lines.find((line) => line.includes("-->"));
    if (!timeLine) continue;
    const match = timeLine.match(
      /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/,
    );
    if (!match) continue;
    const start = clockToSeconds(match[1], match[2], match[3], match[4]);
    const end = clockToSeconds(match[5], match[6], match[7], match[8]);
    const body = lines.slice(lines.indexOf(timeLine) + 1).join("\n").trim();
    if (body && end > start) cues.push({ start, end, text: body });
  }
  return cues;
}

// SRT from the captions node, or one full-length cue when the user pasted plain text.
export function cuesFromSubtitleText(text: string, durationSec: number): CaptionCue[] {
  const parsed = parseSrt(text);
  if (parsed.length > 0) return parsed;
  const plain = text.trim();
  if (!plain) throw new Error("沒有字幕內容");
  return [{ start: 0, end: Math.max(0.5, durationSec || 0.5), text: plain }];
}

function assStamp(seconds: number): string {
  const cs = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(cs / 360_000);
  const m = Math.floor((cs % 360_000) / 6_000);
  const s = Math.floor((cs % 6_000) / 100);
  const centi = cs % 100;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}.${pad(centi)}`;
}

function assText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\N").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

export function cuesToAss(
  cues: readonly CaptionCue[],
  width: number,
  height: number,
  fontFamily: string,
  options?: { style?: SubtitleAssStyle; alignment?: 2 | 5 | 8 },
): string {
  const style = options?.style ?? subtitleAssStyle("clean");
  const alignment = options?.alignment ?? 2;
  const fontSize = Math.max(28, Math.round((height / 18) * style.scale));
  const marginV = Math.max(24, Math.round(height * 0.08));
  const flag = (on: boolean | undefined) => (on ? -1 : 0);
  const events = cues
    .map(
      (cue) =>
        `Dialogue: 0,${assStamp(cue.start)},${assStamp(cue.end)},Default,,0,0,0,,${assText(cue.text)}`,
    )
    .join("\n");
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${Math.max(2, Math.round(width))}`,
    `PlayResY: ${Math.max(2, Math.round(height))}`,
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${fontFamily},${fontSize},${style.primary},&H000000FF,${style.outline},${style.back},${flag(style.bold)},${flag(style.italic)},0,0,100,100,${style.spacing ?? 0},0,${style.borderStyle},${style.outlineWidth},${style.shadow},${alignment},40,40,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    events,
    "",
  ].join("\n");
}

export function escapeFfmpegFilterPath(path: string): string {
  return path.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}
