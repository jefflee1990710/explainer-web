export const FILMSTRIP_HEIGHT_KEY = "explainer.filmstripHeight";
export const FILMSTRIP_HEIGHT_DEFAULT = 300;
export const FILMSTRIP_HEIGHT_MIN = 72;
export const FILMSTRIP_HEIGHT_MAX = 480;

export function clampFilmstripHeight(value: number) {
  if (!Number.isFinite(value)) return FILMSTRIP_HEIGHT_DEFAULT;
  return Math.min(FILMSTRIP_HEIGHT_MAX, Math.max(FILMSTRIP_HEIGHT_MIN, Math.round(value)));
}

export function readFilmstripHeight(raw: string | null) {
  if (!raw) return FILMSTRIP_HEIGHT_DEFAULT;
  return clampFilmstripHeight(Number(raw));
}
