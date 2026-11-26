// Reads a node's toolParams (or a legacy top-level snapshot field) for the FFmpeg builders.

function raw(snapshot: Record<string, unknown>, key: string): unknown {
  const toolParams = snapshot.toolParams as Record<string, unknown> | undefined;
  return toolParams?.[key] ?? snapshot[key];
}

export function numParam(snapshot: Record<string, unknown>, key: string, fallback: number): number {
  const value = raw(snapshot, key);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function strParam(snapshot: Record<string, unknown>, key: string, fallback: string): string {
  const value = raw(snapshot, key);
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function boolParam(snapshot: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = raw(snapshot, key);
  return typeof value === "boolean" ? value : fallback;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function even(value: number): number {
  return Math.max(2, Math.floor(value / 2) * 2);
}

function setFlag(args: string[], flag: string, value: string, insertAt: number): void {
  const at = args.indexOf(flag);
  if (at >= 0) args[at + 1] = value;
  else args.splice(insertAt, 0, flag, value);
}

// A fused step whose file only feeds the next step: x264 CRF 12 / NVENC CQ 12, so the
// chain loses detail only in its last encode. Stream copies and other codecs are unchanged.
export function intermediateQualityArgs(args: readonly string[]): string[] {
  const out = [...args];
  const x264 = out.findIndex((a, i) => a === "libx264" && out[i - 1] === "-c:v");
  if (x264 >= 0) {
    setFlag(out, "-crf", "12", x264 + 1);
    setFlag(out, "-preset", "veryfast", x264 + 1);
  }
  const nvenc = out.findIndex((a, i) => a === "h264_nvenc" && out[i - 1] === "-c:v");
  if (nvenc >= 0) setFlag(out, "-cq", "12", nvenc + 1);
  return out;
}

// atempo takes 0.5..2 per stage, so slower or faster speeds chain stages.
export function atempoChain(speed: number): string {
  const stages: number[] = [];
  let left = speed;
  while (left < 0.5) {
    stages.push(0.5);
    left /= 0.5;
  }
  while (left > 2) {
    stages.push(2);
    left /= 2;
  }
  stages.push(left);
  return stages.map((s) => `atempo=${Number(s.toFixed(4))}`).join(",");
}
