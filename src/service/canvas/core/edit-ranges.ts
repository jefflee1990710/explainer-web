// Pure: time-range text for the keep / cut edit nodes ("0-3, 8-12" or "0:08-0:12").

export type TimeRange = { start: number; end: number };

function clockToken(token: string): number {
  const bits = token.split(":").map(Number);
  if (bits.some((n) => !Number.isFinite(n))) throw new Error("時間格式不正確");
  if (bits.length === 1) return bits[0]!;
  if (bits.length === 2) return bits[0]! * 60 + bits[1]!;
  return bits[0]! * 3600 + bits[1]! * 60 + bits[2]!;
}

// Ranges past the end of the clip are clipped; a range fully outside it is an error.
export function parseKeepRanges(raw: string, durationSec: number): TimeRange[] {
  const text = raw.trim();
  if (!text) throw new Error("請填保留區間，例如 0-3, 8-12");
  const ranges: TimeRange[] = [];
  for (const part of text.split(/[,，]/).map((item) => item.trim()).filter(Boolean)) {
    const match = part.match(/^(\d+(?::\d+){0,2}(?:\.\d+)?)\s*[-–~]\s*(\d+(?::\d+){0,2}(?:\.\d+)?)$/);
    if (!match) throw new Error(`無法讀取區間「${part}」，請用 0-3 或 0:08-0:12`);
    const start = Math.max(0, clockToken(match[1]!));
    const end = Math.min(Math.max(durationSec, 0), clockToken(match[2]!));
    if (!(end > start + 0.04)) throw new Error(`區間「${part}」沒有落在影片長度內`);
    ranges.push({ start: Math.round(start * 1000) / 1000, end: Math.round(end * 1000) / 1000 });
  }
  if (ranges.length === 0) throw new Error("請填至少一段保留區間");
  return ranges;
}

// Sorted, merged ranges so overlapping input never repeats a moment.
export function mergeRanges(ranges: readonly TimeRange[]): TimeRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: TimeRange[] = [];
  for (const range of sorted) {
    const last = out.at(-1);
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else out.push({ ...range });
  }
  return out;
}

export function totalRangeSec(ranges: readonly TimeRange[]): number {
  return ranges.reduce((sum, r) => sum + (r.end - r.start), 0);
}

// The parts of 0..duration not covered by the ranges (cut-out mode keeps these).
export function complementRanges(ranges: readonly TimeRange[], durationSec: number): TimeRange[] {
  const out: TimeRange[] = [];
  let cursor = 0;
  for (const range of mergeRanges(ranges)) {
    if (range.start > cursor + 0.04) out.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (durationSec > cursor + 0.04) out.push({ start: cursor, end: durationSec });
  return out.map((r) => ({ start: Math.round(r.start * 1000) / 1000, end: Math.round(r.end * 1000) / 1000 }));
}
