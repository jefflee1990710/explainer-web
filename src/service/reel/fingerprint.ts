import { mediaSrc } from "@/util/media-src";
import type { ReelStatus } from "@/model/project";

export type ReelClipSource = {
  phaseA?: { clips: Array<{ clipNumber: number }> };
  clips: Array<{
    clipNumber: number;
    blobUrl?: string;
    outputUrl?: string;
    submittedAt?: string;
  }>;
  subtitleOverlay?: boolean;
  subtitlePlates?: Array<{ clipNumber: number; blobUrl?: string }>;
};

export type ReelRecord = {
  reelUrl?: string;
  reelStatus?: ReelStatus;
  reelFingerprint?: string;
};

// Stable key of the current clip playlist. A redo changes URL or submittedAt
// and invalidates any previously composed reel. Overlay reels also key off the
// subtitle plate URL so a new plate forces a new compose.
export function clipReelFingerprint(project: ReelClipSource) {
  return (project.phaseA?.clips || [])
    .map((row) => {
      const clip = project.clips.find((item) => item.clipNumber === row.clipNumber);
      const url = mediaSrc(clip) || "";
      const identity = `${row.clipNumber}:${clip?.submittedAt || ""}:${url.slice(-48)}`;
      if (!project.subtitleOverlay) return identity;
      const plate = project.subtitlePlates?.find((item) => item.clipNumber === row.clipNumber);
      return `${identity}:plate:${(plate?.blobUrl || "").slice(-48)}`;
    })
    .join("|");
}

export function clipUrlsInOrder(project: ReelClipSource) {
  return (project.phaseA?.clips || []).map((row) => {
    const clip = project.clips.find((item) => item.clipNumber === row.clipNumber);
    const url = mediaSrc(clip);
    if (!url) throw new Error(`缺少第 ${row.clipNumber} 段影片`);
    return url;
  });
}

// Plate image URLs in storyboard order. A missing plate stops the reel instead of shipping bare.
export function plateUrlsInOrder(project: ReelClipSource) {
  return (project.phaseA?.clips || []).map((row) => {
    const plate = project.subtitlePlates?.find((item) => item.clipNumber === row.clipNumber);
    if (!plate?.blobUrl) throw new Error(`缺少第 ${row.clipNumber} 段字幕圖`);
    return plate.blobUrl;
  });
}

export function isReelBusy(reelStatus?: ReelStatus) {
  return reelStatus === "queued" || reelStatus === "in_progress";
}

export function isReelCurrent(project: ReelClipSource & ReelRecord) {
  return Boolean(
    project.reelUrl &&
      project.reelStatus === "completed" &&
      project.reelFingerprint === clipReelFingerprint(project),
  );
}
