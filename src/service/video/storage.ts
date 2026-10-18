import type { ClipFrame, FramePosition, Project } from "@/model/project";

type JobBlob = { blobUrl?: string };
type OpencutMediaBlob = { sourceUrl?: string };

// Every persisted media URL on a video, its generation jobs, and its OpenCut edit.
// Cast blueprints stay on the character documents and are not collected.
export function collectVideoBlobUrls(
  video: Project,
  jobs: JobBlob[] = [],
  opencutMedia: OpencutMediaBlob[] = [],
): string[] {
  const urls = new Set<string>();
  const add = (url?: string) => {
    if (url) urls.add(url);
  };

  add(video.characterImageUrl);
  add(video.characterStillUrl);
  add(video.reelUrl);
  add(video.finalUrl);
  add(video.objectSheetUrl);
  for (const plate of video.backgroundPlates || []) {
    add(plate.url);
  }
  for (const frame of video.frames || []) {
    add(frame.blobUrl);
    add(frame.mergedUrl);
    add(frame.revision?.annotatedUrl);
  }
  for (const plate of video.subtitlePlates || []) {
    add(plate.blobUrl);
  }
  for (const lettering of video.subtitleLetterings || []) {
    add(lettering.url);
  }
  for (const clip of video.clips || []) {
    add(clip.blobUrl);
  }
  for (const job of jobs) {
    add(job.blobUrl);
  }
  for (const item of opencutMedia) {
    add(item.sourceUrl);
  }
  return [...urls];
}

// Collect old frame image URLs (raw, merged, revision annotated) and job blobs
// for frames being regenerated, excluding URLs still referenced by untouched frames or keepUrls.
export function collectFrameBlobUrls(
  frames: ClipFrame[] | undefined,
  targets: ReadonlyArray<{ clipNumber: number; position?: FramePosition }>,
  jobs: JobBlob[] = [],
  keepUrls: Iterable<string> = [],
): string[] {
  const keep = new Set<string>(keepUrls);
  const matchesTarget = (frame: ClipFrame) =>
    targets.some(
      (target) =>
        target.clipNumber === frame.clipNumber &&
        (target.position === undefined || target.position === frame.position),
    );

  for (const frame of frames || []) {
    if (matchesTarget(frame)) continue;
    if (frame.blobUrl) keep.add(frame.blobUrl);
    if (frame.mergedUrl) keep.add(frame.mergedUrl);
    if (frame.revision?.annotatedUrl) keep.add(frame.revision.annotatedUrl);
  }

  const urls = new Set<string>();
  const add = (url?: string) => {
    if (url && !keep.has(url)) urls.add(url);
  };

  for (const frame of frames || []) {
    if (!matchesTarget(frame)) continue;
    add(frame.blobUrl);
    add(frame.mergedUrl);
    add(frame.revision?.annotatedUrl);
  }
  for (const job of jobs) {
    add(job.blobUrl);
  }
  return [...urls];
}

// Collect old clip video URLs, video job blobs, and stale reel/final exports
// when one or more clips are regenerated or invalidated.
export function collectClipVideoBlobUrls(
  video: Pick<Project, "clips" | "reelUrl" | "finalUrl">,
  clipNumbers: Iterable<number>,
  jobs: JobBlob[] = [],
): string[] {
  const targetSet = new Set<number>(clipNumbers);
  if (targetSet.size === 0) return [];

  const keep = new Set<string>();
  for (const clip of video.clips || []) {
    if (targetSet.has(clip.clipNumber)) continue;
    if (clip.blobUrl) keep.add(clip.blobUrl);
  }

  const urls = new Set<string>();
  const add = (url?: string) => {
    if (url && !keep.has(url)) urls.add(url);
  };

  for (const clip of video.clips || []) {
    if (!targetSet.has(clip.clipNumber)) continue;
    add(clip.blobUrl);
  }
  for (const job of jobs) {
    add(job.blobUrl);
  }
  add(video.reelUrl);
  add(video.finalUrl);
  return [...urls];
}

// Collect old subtitle plate URLs, job blobs, and merged frame URLs for target clips.
export function collectSubtitlePlateBlobUrls(
  video: Pick<Project, "subtitlePlates" | "frames">,
  clipNumbers: Iterable<number>,
  jobs: JobBlob[] = [],
): string[] {
  const targetSet = new Set<number>(clipNumbers);
  if (targetSet.size === 0) return [];

  const urls = new Set<string>();
  const add = (url?: string) => {
    if (url) urls.add(url);
  };

  for (const plate of video.subtitlePlates || []) {
    if (!targetSet.has(plate.clipNumber)) continue;
    add(plate.blobUrl);
  }
  for (const frame of video.frames || []) {
    if (!targetSet.has(frame.clipNumber)) continue;
    add(frame.mergedUrl);
  }
  for (const job of jobs) {
    add(job.blobUrl);
  }
  return [...urls];
}
