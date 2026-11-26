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
