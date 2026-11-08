function compactUrls(urls: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const clean = raw?.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

export type JutsuBlobCandidate = {
  rawStartFrameUrl?: string;
  rawEndFrameUrl?: string;
  preparedStartFrameUrl?: string;
  preparedEndFrameUrl?: string;
  mannequinVideoUrl?: string;
  checkMaskVideoUrl?: string;
  maskVideoUrl?: string;
  sectionAudioUrl?: string;
  outputVideoUrl?: string;
  outputGifUrl?: string;
  outputImageUrl?: string;
};

/**
 * Intermediate Blob URLs created during a Scro Swap job that are no longer needed
 * once the job reaches a terminal state (`completed` or `failed`).
 * Keeps `preparedStartFrameUrl` (or `rawStartFrameUrl` when equal, as on ComfyUI)
 * and `outputVideoUrl` / `outputGifUrl` for UI display.
 */
export function collectJutsuJobTransientBlobUrls(job: JutsuBlobCandidate): string[] {
  const keepRawStart =
    !job.preparedStartFrameUrl ||
    job.rawStartFrameUrl === job.preparedStartFrameUrl;
  return compactUrls([
    job.rawEndFrameUrl,
    job.preparedEndFrameUrl,
    job.mannequinVideoUrl,
    job.checkMaskVideoUrl,
    job.maskVideoUrl,
    job.sectionAudioUrl,
    keepRawStart ? undefined : job.rawStartFrameUrl,
  ]);
}

/**
 * All Blob URLs owned by a Scro Swap job (used when deleting the job or its parent video).
 * Never includes shared character reference photos (`referenceImageUrl` / `referenceImageUrls`).
 */
export function collectJutsuJobAllBlobUrls(job: JutsuBlobCandidate): string[] {
  return compactUrls([
    job.rawStartFrameUrl,
    job.rawEndFrameUrl,
    job.preparedStartFrameUrl,
    job.preparedEndFrameUrl,
    job.mannequinVideoUrl,
    job.checkMaskVideoUrl,
    job.maskVideoUrl,
    job.sectionAudioUrl,
    job.outputVideoUrl,
    job.outputGifUrl,
    job.outputImageUrl,
  ]);
}

export type TeleportBlobCandidate = {
  sceneImageUrl?: string;
  scenePlateGenerated?: boolean;
  rawStartFrameUrl?: string;
  rawEndFrameUrl?: string;
  identityFrameUrl?: string;
  mannequinVideoUrl?: string;
  sectionAudioUrl?: string;
  preparedStartFrameUrl?: string;
  preparedEndFrameUrl?: string;
  outputVideoUrl?: string;
};

/**
 * Intermediate Blob URLs created during a Teleport job that are no longer needed
 * once the job settles (`completed` or `failed`).
 * Keeps `preparedStartFrameUrl` (or `rawStartFrameUrl` when equal) and `outputVideoUrl`.
 */
export function collectTeleportJobTransientBlobUrls(
  job: TeleportBlobCandidate,
): string[] {
  const keepRawStart =
    !job.preparedStartFrameUrl ||
    job.rawStartFrameUrl === job.preparedStartFrameUrl;
  return compactUrls([
    job.rawEndFrameUrl,
    job.preparedEndFrameUrl,
    job.identityFrameUrl,
    job.mannequinVideoUrl,
    job.sectionAudioUrl,
    keepRawStart ? undefined : job.rawStartFrameUrl,
  ]);
}

/**
 * All Blob URLs owned by a Teleport job (used when deleting the job or its parent video).
 * Only deletes `sceneImageUrl` when `scenePlateGenerated === true`.
 */
export function collectTeleportJobAllBlobUrls(
  job: TeleportBlobCandidate,
): string[] {
  return compactUrls([
    job.scenePlateGenerated ? job.sceneImageUrl : undefined,
    job.rawStartFrameUrl,
    job.rawEndFrameUrl,
    job.identityFrameUrl,
    job.mannequinVideoUrl,
    job.sectionAudioUrl,
    job.preparedStartFrameUrl,
    job.preparedEndFrameUrl,
    job.outputVideoUrl,
  ]);
}

export type ExtendBlobCandidate = {
  tailFrameUrl?: string;
  posterFrameUrl?: string;
  outputVideoUrl?: string;
};

/** Intermediate Blob URLs created during an Extend Video job (`tailFrameUrl` / `posterFrameUrl`). */
export function collectExtendJobTransientBlobUrls(
  job: ExtendBlobCandidate,
): string[] {
  return compactUrls([job.tailFrameUrl, job.posterFrameUrl]);
}

/** All Blob URLs owned by an Extend Video job. */
export function collectExtendJobAllBlobUrls(job: ExtendBlobCandidate): string[] {
  return compactUrls([job.tailFrameUrl, job.posterFrameUrl, job.outputVideoUrl]);
}
