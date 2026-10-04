import { COVER_SAFE_AREA_IDS, type CoverSafeArea } from "@/model/project";

// Padding that keeps the subject inside each app's crop. Percentages of the frame.
const SAFE_AREA_LINE: Record<CoverSafeArea, string> = {
  "ig-reel":
    "Instagram Reels safe area: keep the entire subject, face, title, and logo inside the center so the whole picture still reads after cropping. Leave plain background padding of about 14% at the top, 25% at the bottom, 6% on the left, and 18% on the right. The profile grid crops a 9:16 cover down to the center 3:4, and the Reels list covers the top bar, the bottom caption, and the buttons on the right. Do not place the face, title, or logo in those margins.",
  tiktok:
    "TikTok safe area: keep the entire subject, face, title, and logo inside the center. Leave plain background padding of about 12% at the top, 22% at the bottom, 6% on the left, and 16% on the right. The profile grid crops toward the center, and the For You page covers the bottom caption and the buttons on the right. Do not place the face, title, or logo in those margins.",
  "youtube-shorts":
    "YouTube Shorts safe area: keep the entire subject, face, title, and logo inside the center. Leave plain background padding of about 12% at the top, 20% at the bottom, and 8% on each side. The Shorts shelf and player crop the edges and cover the bottom title. Do not place the face, title, or logo in those margins.",
};

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

// One paragraph per checked app, plus a line to satisfy all of them together.
export function coverSafeAreaPrompt(areas: CoverSafeArea[] | undefined) {
  const parsed = parseCoverSafeAreas(areas ?? []);
  if (!parsed.ok || parsed.areas.length === 0) return "";
  const lines = parsed.areas.map((id) => SAFE_AREA_LINE[id]);
  if (parsed.areas.length > 1) {
    lines.push(
      "Satisfy every selected safe area at once: use the largest padding on each edge so one cover stays fully readable on all of them.",
    );
  }
  return lines.join("\n");
}
