import {
  scroVideosFor,
  type ScroVideoSource,
} from "@/service/scro-video/view-model";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

/** Ordered seed rows for OpenCut from the current project storyboard. */
export function buildSeedClips(project: ScroVideoSource): ScroVideoSeedClip[] {
  return scroVideosFor(project).map((view) => ({
    clipNumber: view.clipNumber,
    durationSeconds: view.durationSeconds,
    stage: view.stage,
    posterUrl: view.posterUrl,
    videoUrl: view.videoUrl,
    name: `Clip ${view.clipNumber}`,
  }));
}

/** Clips whose poster/video/stage changed between two snapshots. */
export function diffScroSeedClips({
  previous,
  next,
}: {
  previous: ScroVideoSeedClip[];
  next: ScroVideoSeedClip[];
}): ScroVideoSeedClip[] {
  const prevByNumber = new Map(previous.map((clip) => [clip.clipNumber, clip]));
  const changed: ScroVideoSeedClip[] = [];
  for (const clip of next) {
    const before = prevByNumber.get(clip.clipNumber);
    if (
      !before ||
      before.stage !== clip.stage ||
      before.posterUrl !== clip.posterUrl ||
      before.videoUrl !== clip.videoUrl ||
      before.durationSeconds !== clip.durationSeconds
    ) {
      changed.push(clip);
    }
  }
  return changed;
}
