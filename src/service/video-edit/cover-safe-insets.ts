import type { CoverSafeArea } from "@/model/project";

export type CoverInsets = { top: number; right: number; bottom: number; left: number };

// Fractions of the frame. The subject stays inside; the scene still fills the edges.
const COVER_SAFE_INSETS: Record<CoverSafeArea, CoverInsets> = {
  "ig-reel": { top: 0.14, right: 0.18, bottom: 0.25, left: 0.06 },
  tiktok: { top: 0.12, right: 0.16, bottom: 0.22, left: 0.06 },
  "youtube-shorts": { top: 0.12, right: 0.08, bottom: 0.2, left: 0.08 },
};

// Strictest inner box, so one still stays readable on every checked app.
export function strictestCoverInsets(areas: CoverSafeArea[] | undefined): CoverInsets | null {
  if (!areas?.length) return null;
  const known = areas.filter((id): id is CoverSafeArea => id in COVER_SAFE_INSETS);
  if (known.length === 0) return null;
  return known.reduce<CoverInsets>(
    (acc, id) => {
      const inset = COVER_SAFE_INSETS[id];
      return {
        top: Math.max(acc.top, inset.top),
        right: Math.max(acc.right, inset.right),
        bottom: Math.max(acc.bottom, inset.bottom),
        left: Math.max(acc.left, inset.left),
      };
    },
    { top: 0, right: 0, bottom: 0, left: 0 },
  );
}
