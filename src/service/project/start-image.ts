import { TALKING_HEAD_SKILL_SLUG } from "@/service/director/talking-head";

export type StartImageParse =
  | { ok: true; url?: string }
  | { ok: false; error: string };

// Talking-head read may keep one opening photo. The visual style does not decide this.
export function talkingHeadOpeningPhotoAllowed(input: { skillSlug: string }) {
  return input.skillSlug === TALKING_HEAD_SKILL_SLUG;
}

// One optional image. Blank clears it. Anything else must be this user's upload.
export function parseStartImageUrl(
  raw: string,
  isAllowedUrl: (url: string) => boolean,
): StartImageParse {
  const url = raw.trim();
  if (!url) return { ok: true };
  if (!isAllowedUrl(url)) return { ok: false, error: "開場參考圖來源無效，請重新上傳" };
  return { ok: true, url };
}

// Clip 1's start still is drawn from this photo. Later starts copy the previous end.
export function openingPhotoReference(
  project: { skillSlug?: string; startImageUrl?: string },
  clipNumber: number,
  position: "start" | "end",
): string | undefined {
  if (project.skillSlug !== TALKING_HEAD_SKILL_SLUG) return undefined;
  const url = project.startImageUrl?.trim();
  if (!url || clipNumber !== 1 || position !== "start") return undefined;
  return url;
}
