export const ROOM_LEFT_WIDTH_KEY = "explainer.roomLeftWidth";
export const ROOM_RIGHT_WIDTH_KEY = "explainer.roomRightWidth";

// Match the old fixed columns: 16rem left, 18rem right.
export const ROOM_LEFT_WIDTH_DEFAULT = 256;
export const ROOM_RIGHT_WIDTH_DEFAULT = 288;
export const ROOM_COLUMN_MIN = 220;
export const ROOM_COLUMN_MAX = 560;

export function clampRoomColumnWidth(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(ROOM_COLUMN_MAX, Math.max(ROOM_COLUMN_MIN, Math.round(value)));
}

export function readRoomColumnWidth(raw: string | null, fallback: number) {
  if (!raw) return fallback;
  return clampRoomColumnWidth(Number(raw), fallback);
}
