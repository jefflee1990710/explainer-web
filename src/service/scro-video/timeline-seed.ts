import { mediaSrc } from "@/util/media-src";
import { clipStateFor } from "@/service/clip-stage";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import {
  scroVideosFor,
  type ScroVideoSource,
} from "@/service/scro-video/view-model";
import type { ScroVideoSeedClip } from "@/opencut/embed/scro-video-types";

type StoryboardSeedRow = {
  clipNumber: number;
  durationSeconds?: number;
  timeRange?: string;
  englishVo?: string;
  startVo?: string;
  endVo?: string;
  explainerScene?: string;
  motionCamera?: string;
};

type SeedSource = ScroVideoSource & {
  skillSlug?: string;
  phaseA?: { clips: StoryboardSeedRow[] };
};

/** Ordered seed rows for OpenCut from the current project storyboard. */
export function buildSeedClips(project: SeedSource): ScroVideoSeedClip[] {
  const dualBeat = isDualBeatSkill(project.skillSlug);
  const storyRows = (project.phaseA?.clips ?? []) as StoryboardSeedRow[];
  const rowsByNumber = new Map(storyRows.map((row) => [row.clipNumber, row]));
  return scroVideosFor(project).map((view) => {
    const row = rowsByNumber.get(view.clipNumber);
    const state = clipStateFor(project, view.clipNumber);
    const start = project.frames?.find(
      (frame) => frame.clipNumber === view.clipNumber && frame.position === "start",
    );
    const end = project.frames?.find(
      (frame) => frame.clipNumber === view.clipNumber && frame.position === "end",
    );
    return {
      clipNumber: view.clipNumber,
      durationSeconds: view.durationSeconds,
      stage: view.stage,
      posterUrl: view.posterUrl,
      endPosterUrl: end?.status === "completed" ? mediaSrc(end) : undefined,
      videoUrl: view.videoUrl,
      name: `Clip ${view.clipNumber}`,
      timeRange: row?.timeRange,
      englishVo: view.englishVo ?? row?.englishVo,
      startVo: view.startVo ?? row?.startVo,
      endVo: view.endVo ?? row?.endVo,
      explainerScene: view.explainerScene ?? row?.explainerScene,
      motionCamera: view.motionCamera ?? row?.motionCamera,
      error: view.error,
      hasStartFrame: Boolean(start && start.status === "completed"),
      hasEndFrame: Boolean(end && end.status === "completed"),
      dualBeat,
      frameCost: state.frameCost,
      videoCost: state.videoCost,
      videoUnsent: state.videoUnsent,
      staleFrames: state.stale.frames,
      staleVideo: state.stale.video,
      wait: state.wait,
    };
  });
}

/**
 * Create and recreate lay the timeline out from the storyboard.
 * An empty storyboard clears the old cut. The first non-empty storyboard places clips.
 * Later frame and video updates keep the user's arrangement.
 */
export function storyboardLayoutAction({
  synced,
  previousCount,
  nextCount,
}: {
  synced: boolean;
  previousCount: number;
  nextCount: number;
}): "keep" | "clear" | "place" {
  if (!synced) return "keep";
  if (previousCount > 0 && nextCount === 0) return "clear";
  if (previousCount === 0 && nextCount > 0) return "place";
  return "keep";
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
      before.endPosterUrl !== clip.endPosterUrl ||
      before.videoUrl !== clip.videoUrl ||
      before.durationSeconds !== clip.durationSeconds ||
      before.error !== clip.error ||
      before.englishVo !== clip.englishVo ||
      before.explainerScene !== clip.explainerScene ||
      before.staleFrames !== clip.staleFrames ||
      before.staleVideo !== clip.staleVideo ||
      before.videoUnsent !== clip.videoUnsent ||
      before.wait !== clip.wait
    ) {
      changed.push(clip);
    }
  }
  return changed;
}
