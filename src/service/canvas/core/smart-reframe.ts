// Pure: crop window and its path for subject-following reframes (for example 16:9 → 9:16).
// Subject centers come in as 0..1 fractions of the frame; missing samples borrow a neighbor.

export const REFRAME_ASPECTS = ["9:16", "1:1", "4:5", "16:9"] as const;
export type ReframeAspect = (typeof REFRAME_ASPECTS)[number];

export type SubjectSample = { t: number; x: number | null; y: number | null };
export type CropKey = { t: number; x: number; y: number };

// Frames sampled per clip: about one a second, capped so one vision call stays small.
export const REFRAME_MAX_SAMPLES = 16;

export function reframeSampleTimes(durationSec: number): number[] {
  const n = Math.min(REFRAME_MAX_SAMPLES, Math.max(2, Math.ceil(durationSec)));
  return Array.from({ length: n }, (_, i) => Number((((i + 0.5) * durationSec) / n).toFixed(3)));
}

function aspectRatio(aspect: ReframeAspect): number {
  const [w, h] = aspect.split(":").map(Number);
  return w! / h!;
}

const even = (v: number) => Math.max(2, Math.floor(v / 2) * 2);

// Largest window of the target shape that fits inside the source.
export function reframeCropSize(srcW: number, srcH: number, aspect: ReframeAspect): { w: number; h: number } {
  const ratio = aspectRatio(aspect);
  if (srcW / srcH > ratio) return { w: even(srcH * ratio), h: even(srcH) };
  return { w: even(srcW), h: even(srcW / ratio) };
}

export function reframeOutputSize(aspect: ReframeAspect, resolution: "720p" | "1080p"): { w: number; h: number } {
  const short = resolution === "720p" ? 720 : 1080;
  const ratio = aspectRatio(aspect);
  return ratio < 1 ? { w: short, h: even(short / ratio) } : { w: even(short * ratio), h: short };
}

function fill(values: (number | null)[]): number[] {
  const known = values.map((v, i) => (v === null || !Number.isFinite(v) ? -1 : i)).filter((i) => i >= 0);
  if (known.length === 0) return values.map(() => 0.5);
  return values.map((v, i) => {
    if (v !== null && Number.isFinite(v)) return Math.min(1, Math.max(0, v));
    const near = known.reduce((best, k) => (Math.abs(k - i) < Math.abs(best - i) ? k : best), known[0]!);
    return Math.min(1, Math.max(0, values[near]!));
  });
}

// "steady" holds one framing when the subject barely moves, else follows it gently;
// "follow" always tracks. Both ignore jitter under the dead zone.
export function smoothSubjectTrack(samples: readonly SubjectSample[], mode: "steady" | "follow"): { t: number; x: number; y: number }[] {
  const xs = fill(samples.map((s) => s.x));
  const ys = fill(samples.map((s) => s.y));
  const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
  if (mode === "steady" && spread(xs) < 0.12 && spread(ys) < 0.12) {
    const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;
    const x = median(xs);
    const y = median(ys);
    return samples.map((s) => ({ t: s.t, x, y }));
  }
  const radius = mode === "steady" ? 2 : 1;
  const avg = (v: number[], i: number) => {
    const win = v.slice(Math.max(0, i - radius), i + radius + 1);
    return win.reduce((a, b) => a + b, 0) / win.length;
  };
  const deadZone = 0.03;
  const out: { t: number; x: number; y: number }[] = [];
  samples.forEach((s, i) => {
    const prev = out.at(-1);
    let x = avg(xs, i);
    let y = avg(ys, i);
    if (prev && Math.abs(x - prev.x) < deadZone) x = prev.x;
    if (prev && Math.abs(y - prev.y) < deadZone) y = prev.y;
    out.push({ t: s.t, x, y });
  });
  return out;
}

// Crop offsets in source pixels, clamped so the window never leaves the frame.
export function cropKeys(
  track: readonly { t: number; x: number; y: number }[],
  srcW: number,
  srcH: number,
  crop: { w: number; h: number },
): CropKey[] {
  const clampTo = (v: number, max: number) => Math.round(Math.min(max, Math.max(0, v)));
  return track.map((p) => ({
    t: p.t,
    x: clampTo(p.x * srcW - crop.w / 2, srcW - crop.w),
    y: clampTo(p.y * srcH - crop.h / 2, srcH - crop.h),
  }));
}

// Piecewise-linear FFmpeg expression in t through the keys; holds before the first and after the last.
export function piecewiseExpr(keys: readonly { t: number; v: number }[]): string {
  if (keys.length === 0) return "0";
  if (keys.every((k) => k.v === keys[0]!.v)) return String(keys[0]!.v);
  let expr = String(keys.at(-1)!.v);
  for (let i = keys.length - 2; i >= 0; i -= 1) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    const span = Math.max(0.001, b.t - a.t);
    const seg = a.v === b.v ? String(a.v) : `${a.v}+(${b.v - a.v})*(t-${a.t})/${span.toFixed(3)}`;
    expr = `if(lt(t,${b.t}),${seg},${expr})`;
  }
  return `if(lt(t,${keys[0]!.t}),${keys[0]!.v},${expr})`;
}

// The -vf chain: moving crop, then scale to the output size. Commas are escaped for the filtergraph.
export function reframeFilter(keys: readonly CropKey[], crop: { w: number; h: number }, out: { w: number; h: number }): string {
  const esc = (e: string) => e.replace(/,/g, "\\,");
  const x = esc(piecewiseExpr(keys.map((k) => ({ t: k.t, v: k.x }))));
  const y = esc(piecewiseExpr(keys.map((k) => ({ t: k.t, v: k.y }))));
  return `crop=${crop.w}:${crop.h}:${x}:${y},scale=${out.w}:${out.h},setsar=1`;
}
