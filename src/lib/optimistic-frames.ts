import type { ClipFrame, FramePosition, ProjectClip } from "@/types/project";
import type { PublicVideo } from "@/lib/serialize";
import { mediaSrc } from "@/lib/media-src";

// Paid keys that redraw stills: one frame, both frames, or save-text + redraw.
const ONE_FRAME = /^frame:(\d+):(start|end)$/;
const BOTH_FRAMES = /^(?:frames:(\d+)|clip:(\d+):regen)$/;
const ONE_VIDEO = /^video:(\d+)$/;

function targetsForAction(key: string): { clipNumber: number; position?: FramePosition } | null {
  const one = ONE_FRAME.exec(key);
  if (one) {
    return { clipNumber: Number(one[1]), position: one[2] as FramePosition };
  }
  const both = BOTH_FRAMES.exec(key);
  if (both) {
    return { clipNumber: Number(both[1] ?? both[2]) };
  }
  return null;
}

function isTarget(frame: ClipFrame, target: { clipNumber: number; position?: FramePosition }) {
  if (frame.clipNumber !== target.clipNumber) return false;
  return !target.position || frame.position === target.position;
}

function isWaitingStill(frame: ClipFrame) {
  if (mediaSrc(frame)) return false;
  return (
    frame.status === "queued" ||
    frame.status === "in_progress" ||
    // Optimistic clear can leave status "completed" with URLs stripped.
    frame.status === "completed"
  );
}

// Drop the previous still the instant the user clicks redo, so the tile can
// show a skeleton before the server action returns.
export function clearFramesForAction(frames: ClipFrame[], key: string): ClipFrame[] {
  const target = targetsForAction(key);
  if (!target) return frames;
  const submittedAt = new Date().toISOString();
  return frames.map((frame) =>
    isTarget(frame, target)
      ? {
          ...frame,
          status: "queued",
          submittedAt,
          blobUrl: undefined,
          outputUrl: undefined,
          error: undefined,
        }
      : frame,
  );
}

function isWaitingClip(clip: ProjectClip) {
  if (mediaSrc(clip)) return false;
  return (
    clip.status === "queued" ||
    clip.status === "in_progress" ||
    // Optimistic clear can leave status "completed" with URLs stripped.
    clip.status === "completed"
  );
}

// Drop the previous video the instant the user clicks redo.
export function clearClipsForAction(clips: ProjectClip[], key: string): ProjectClip[] {
  const match = ONE_VIDEO.exec(key);
  if (!match) return clips;
  const clipNumber = Number(match[1]);
  const submittedAt = new Date().toISOString();
  return clips.map((clip) =>
    clip.clipNumber === clipNumber
      ? {
          ...clip,
          status: "queued",
          submittedAt,
          blobUrl: undefined,
          outputUrl: undefined,
          error: undefined,
        }
      : clip,
  );
}

export function projectWithClearedFrames(project: PublicVideo, key: string): PublicVideo {
  const frames = clearFramesForAction(project.frames, key);
  const clips = clearClipsForAction(project.clips, key);
  if (frames === project.frames && clips === project.clips) return project;
  return {
    ...project,
    frames,
    clips,
    status: project.status === "ready" ? "production" : project.status,
  };
}

// A poll or RSC refresh can still carry the previous completed still. Keep the
// optimistic waiting frame until the server claim catches up — but never block a
// finished (or failed) result for that same-or-newer claim, or the UI stays on
// a skeleton after webhook/poll completes.
export function mergePolledFrames(current: ClipFrame[], incoming: ClipFrame[]): ClipFrame[] {
  return incoming.map((frame) => {
    const local = current.find(
      (item) => item.clipNumber === frame.clipNumber && item.position === frame.position,
    );
    if (!local?.submittedAt) return frame;

    const incomingClaim = frame.submittedAt;
    // Server claim caught up → trust incoming (completed file, failure, progress).
    if (incomingClaim && incomingClaim >= local.submittedAt) return frame;

    // Incoming payload is older than the local redo claim.
    const settledIncoming =
      frame.status === "failed" || (frame.status === "completed" && Boolean(mediaSrc(frame)));
    if (isWaitingStill(local) && settledIncoming) {
      // Stale completed/failed still from before the redo — keep the skeleton.
      return local;
    }
    return frame;
  });
}

export function mergePolledClips(current: ProjectClip[], incoming: ProjectClip[]): ProjectClip[] {
  return incoming.map((clip) => {
    const local = current.find((item) => item.clipNumber === clip.clipNumber);
    if (!local?.submittedAt) return clip;

    const incomingClaim = clip.submittedAt;
    if (incomingClaim && incomingClaim >= local.submittedAt) return clip;

    const settledIncoming =
      clip.status === "failed" || (clip.status === "completed" && Boolean(mediaSrc(clip)));
    if (isWaitingClip(local) && settledIncoming) {
      return local;
    }
    return clip;
  });
}

export function mergePolledProject(current: PublicVideo, incoming: PublicVideo): PublicVideo {
  if (current.id !== incoming.id) return incoming;
  return {
    ...incoming,
    frames: mergePolledFrames(current.frames, incoming.frames),
    clips: mergePolledClips(current.clips, incoming.clips),
  };
}
