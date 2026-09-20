import type { Project } from "@/types/project";

type JobBlob = { blobUrl?: string };

// Every persisted media URL on a video and its generation jobs.
// Cast blueprints stay on the character documents and are not collected.
export function collectVideoBlobUrls(
  video: Project,
  jobs: JobBlob[] = [],
): string[] {
  const urls = new Set<string>();
  const add = (url?: string) => {
    if (url) urls.add(url);
  };

  add(video.characterImageUrl);
  add(video.characterStillUrl);
  add(video.reelUrl);
  for (const frame of video.frames || []) {
    add(frame.blobUrl);
    add(frame.revision?.annotatedUrl);
  }
  for (const clip of video.clips || []) {
    add(clip.blobUrl);
  }
  for (const job of jobs) {
    add(job.blobUrl);
  }
  return [...urls];
}
