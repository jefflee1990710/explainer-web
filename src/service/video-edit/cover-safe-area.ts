import { COVER_SAFE_AREA_IDS, type CoverSafeArea } from "@/model/project";
import { strictestCoverInsets } from "@/service/video-edit/cover-safe-insets";

// What each app covers. The picture stays full-bleed; only the subject moves.
const SAFE_AREA_LINE: Record<CoverSafeArea, string> = {
  "ig-reel":
    "Instagram Reels: the profile grid crops a 9:16 cover down to the center 3:4, and the Reels list covers the top bar, the bottom caption, and the buttons on the right. Those bands may show the scene background only.",
  tiktok:
    "TikTok: the profile grid crops toward the center, and the For You page covers the bottom caption and the buttons on the right. Those bands may show the scene background only.",
  "youtube-shorts":
    "YouTube Shorts: the Shorts shelf and player crop the edges and cover the bottom title. Those bands may show the scene background only.",
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
    "Generate this like a normal full-screen cover. Background, setting, and graphic elements fill the frame edge to edge. Do not add a white border, letterbox, matte, or empty padding, and do not shrink the picture onto a blank field.",
    `Only the character and the title text move. Center them together inside the safe rectangle: ${percent(box.top)} down from the top, ${percent(box.bottom)} up from the bottom, ${percent(box.left)} in from the left, and ${percent(box.right)} in from the right. The face, body, and every word of the title stay inside that rectangle. Background art continues through the outer bands.`,
    ...parsed.areas.map((id) => SAFE_AREA_LINE[id]),
  ];
  if (parsed.areas.length > 1) {
    lines.push(
      "Satisfy every selected safe area at once: center the character and title inside the strictest inner rectangle. The background still fills the frame.",
    );
  }
  return lines.join("\n");
}
