export const INSPECTOR_WIDTH_KEY = "explainer.inspectorWidth";
export const SCENE_CHAT_WIDTH_KEY = "explainer.sceneChatWidth";

export const INSPECTOR_WIDTH_DEFAULT = 460;
export const SCENE_CHAT_WIDTH_DEFAULT = 380;
export const PANE_WIDTH_MIN = 280;
export const PANE_WIDTH_MAX = 720;

export function clampPaneWidth(value: number, fallback = INSPECTOR_WIDTH_DEFAULT) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(PANE_WIDTH_MAX, Math.max(PANE_WIDTH_MIN, Math.round(value)));
}

export function readPaneWidth(raw: string | null, fallback: number) {
  if (!raw) return fallback;
  return clampPaneWidth(Number(raw), fallback);
}
