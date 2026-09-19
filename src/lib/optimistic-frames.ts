import type { ClipFrame, FramePosition } from "@/types/project";
import type { PublicVideo } from "@/lib/serialize";

// Paid keys that redraw stills: one frame, both frames, or save-text + redraw.
const ONE_FRAME = /^frame:(\d+):(start|end)$/;
const BOTH_FRAMES = /^(?:frames:(\d+)|clip:(\d+):regen)$/;

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

export function projectWithClearedFrames(project: PublicVideo, key: string): PublicVideo {
  const frames = clearFramesForAction(project.frames, key);
  if (frames === project.frames) return project;
  return {
    ...project,
    frames,
    status: project.status === "ready" ? "production" : project.status,
  };
}

// A poll or RSC refresh can still carry the previous completed still. Keep the
// optimistic queued frame until the server claim is newer.
export function mergePolledFrames(current: ClipFrame[], incoming: ClipFrame[]): ClipFrame[] {
  return incoming.map((frame) => {
    const local = current.find(
      (item) => item.clipNumber === frame.clipNumber && item.position === frame.position,
    );
    if (!local?.submittedAt) return frame;
    if (!frame.submittedAt || local.submittedAt > frame.submittedAt) return local;
    return frame;
  });
}

export function mergePolledProject(current: PublicVideo, incoming: PublicVideo): PublicVideo {
  if (current.id !== incoming.id) return incoming;
  return { ...incoming, frames: mergePolledFrames(current.frames, incoming.frames) };
}
