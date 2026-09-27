import { isReelCurrent } from "@/service/reel/fingerprint";
import { isFinalCurrent } from "@/service/video-edit/edit-state";
import { isPublicHttpUrl } from "@/util/app-url";
import type { VideoShareId } from "@/service/video-share/platforms";
import type { PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";

export { VIDEO_SHARE_IDS, isVideoShareId } from "@/service/video-share/platforms";
export type { VideoShareId };

export const VIDEO_SHARE_TARGETS: Array<{
  id: VideoShareId;
  label: string;
  // Open the site's upload or share page after we have a file / URL.
  kind: "url" | "upload";
}> = [
  { id: "instagram_reel", label: "Instagram Reel", kind: "upload" },
  { id: "instagram_post", label: "Instagram Post", kind: "upload" },
  { id: "facebook", label: "Facebook", kind: "url" },
  { id: "tiktok", label: "TikTok", kind: "upload" },
  { id: "youtube", label: "YouTube", kind: "upload" },
  { id: "x", label: "X", kind: "url" },
];

export function videoFileName(project: PublicVideo) {
  const raw = project.phaseA?.localizedTitle || project.phaseA?.englishTitle || "video";
  return `${raw.replace(/[\\/:*?"<>|]+/g, " ").trim() || "video"}.mp4`;
}

// Branded export if it is current; otherwise the composed reel.
export function shareableVideoUrl(project: PublicVideo, edit: VideoEdit) {
  const withEdit = { ...project, edit };
  if (project.finalUrl && isFinalCurrent(withEdit)) return project.finalUrl;
  if (project.reelUrl && isReelCurrent(project)) return project.reelUrl;
  return project.finalUrl || project.reelUrl;
}

export function videoShareHref(id: VideoShareId, videoUrl: string, caption?: string) {
  const encoded = encodeURIComponent(videoUrl);
  if (id === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
  }
  if (id === "x") {
    const params = new URLSearchParams({ url: videoUrl });
    const text = caption?.trim();
    if (text) params.set("text", text);
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  }
  if (id === "instagram_reel") return "https://www.instagram.com/reels/create";
  if (id === "instagram_post") return "https://www.instagram.com/";
  if (id === "tiktok") return "https://www.tiktok.com/tiktokstudio/upload";
  return "https://www.youtube.com/upload";
}

export function canPostVideoUrl(url: string) {
  return isPublicHttpUrl(url);
}
