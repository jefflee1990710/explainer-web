import { COVER_SAFE_AREA_IDS, type CoverSafeArea } from "@/model/project";
import { strictestCoverInsets } from "@/service/video-edit/cover-safe-insets";

// What each app covers. The picture stays full-bleed; only the subject moves.
const SAFE_AREA_LINE: Record<CoverSafeArea, string> = {
  "ig-reel":
    "Instagram Reels covers the top bar, the bottom caption, and the right-side buttons. Those bands are background only.",
  tiktok:
    "TikTok covers the bottom caption and the right-side buttons. Those bands are background only.",
  "youtube-shorts":
    "YouTube Shorts covers the edges and the bottom title. Those bands are background only.",
};

function percent(fraction: number) {
  return `${Math.round(fraction * 100)}%`;
}

export function parseCoverSafeAreas(
  raw: unknown,
): { ok: true; areas: CoverSafeArea[] } | { ok: false; error: string } {
  if (raw == null) return { ok: true, areas: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "封面安全區無效" };
  const picked = new Set<CoverSafeArea>();
  for (const item of raw) {
    if (typeof item !== "string" || !COVER_SAFE_AREA_IDS.includes(item as CoverSafeArea)) {
      return { ok: false, error: "封面安全區無效" };
    }
    picked.add(item as CoverSafeArea);
  }
  return { ok: true, areas: COVER_SAFE_AREA_IDS.filter((id) => picked.has(id)) };
}

// Full-bleed cover. Only the character and title sit in the safe rectangle.
export function coverSafeAreaPrompt(areas: CoverSafeArea[] | undefined) {
  const parsed = parseCoverSafeAreas(areas ?? []);
  if (!parsed.ok || parsed.areas.length === 0) return "";
  const box = strictestCoverInsets(parsed.areas);
  if (!box) return "";
  const lines = [
    "Full-screen cover. Background fills the frame edge to edge. No white border, letterbox, or empty margin.",
    `Place the character and the on-screen text inside the safe rectangle: ${percent(box.top)} from the top, ${percent(box.bottom)} from the bottom, ${percent(box.left)} from the left, ${percent(box.right)} from the right. Hair, shoes, and every word stay inside it.`,
    ...parsed.areas.map((id) => SAFE_AREA_LINE[id]),
  ];
  if (parsed.areas.length > 1) {
    lines.push("Use the strictest inner rectangle so one cover fits every selected app.");
  }
  return lines.join("\n");
}
