export const VIDEO_SHARE_IDS = [
  "instagram_reel",
  "instagram_post",
  "facebook",
  "tiktok",
  "youtube",
  "x",
] as const;

export type VideoShareId = (typeof VIDEO_SHARE_IDS)[number];

export function isVideoShareId(value: string): value is VideoShareId {
  return (VIDEO_SHARE_IDS as readonly string[]).includes(value);
}
