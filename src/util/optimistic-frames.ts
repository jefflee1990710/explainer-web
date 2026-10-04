import type { ClipFrame, FramePosition, ProjectClip } from "@/model/project";
import type { PublicVideo } from "@/presentation/serialize";
import { mediaSrc } from "@/util/media-src";

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
  if (key === "all-scenes" || key === "all-clips") {
    const submittedAt = new Date().toISOString();
    return frames.map((frame) =>
      frame.status === "queued" || frame.status === "in_progress"
        ? frame
        : {
            ...frame,
            status: "queued",
            submittedAt,
            blobUrl: undefined,
            outputUrl: undefined,
            error: undefined,
          },
    );
  }
  const target = targetsForAction(key);
  if (!target) return frames;
  const submittedAt = new Date().toISOString();
  const next = frames.map((frame) =>
    isTarget(frame, target)
      ? {
          ...frame,
          status: "queued" as const,
          submittedAt,
          blobUrl: undefined,
          outputUrl: undefined,
          error: undefined,
        }
      : frame,
  );
  // First "畫這段畫格" has no rows yet; insert them so the button disables now.
  const positions: FramePosition[] = target.position ? [target.position] : ["start", "end"];
  const extras = positions
    .filter(
      (position) =>
        !next.some((frame) => frame.clipNumber === target.clipNumber && frame.position === position),
    )
    .map((position) => ({
      clipNumber: target.clipNumber,
      position,
      prompt: "",
      status: "queued" as const,
      submittedAt,
    }));
  if (extras.length === 0 && next.every((frame, index) => frame === frames[index])) {
    return frames;
  }
  return [...next, ...extras];
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
  // First click has no clip row yet; insert one so the button flips immediately.
  if (!clips.some((clip) => clip.clipNumber === clipNumber)) {
    return [
      ...clips,
      {
        clipNumber,
        durationSeconds: 0,
        prompt: "",
        status: "queued",
        submittedAt,
      },
    ];
  }
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
  let frames = clearFramesForAction(project.frames, key);
  // Generate-all has no per-clip key; add missing start/end so tiles flip now.
  if (key === "all-scenes" || key === "all-clips") {
    const submittedAt = new Date().toISOString();
    const extras = (project.phaseA?.clips ?? []).flatMap((clip) =>
      (["start", "end"] as const)
        .filter(
          (position) =>
            !frames.some(
              (frame) => frame.clipNumber === clip.clipNumber && frame.position === position,
            ),
        )
        .map((position) => ({
          clipNumber: clip.clipNumber,
          position,
          prompt: "",
          status: "queued" as const,
          submittedAt,
        })),
    );
    if (extras.length) frames = [...frames, ...extras];
  }
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
// local claim until the server timestamp catches up — including a finished file
// that already landed — so a stale refresh cannot put the old picture back.
export function mergePolledFrames(current: ClipFrame[], incoming: ClipFrame[]): ClipFrame[] {
  const merged = incoming.map((frame) => {
    const local = current.find(
      (item) => item.clipNumber === frame.clipNumber && item.position === frame.position,
    );
    return preferNewerClaim(local, frame);
  });
  // Keep a local first-draw claim until the server row exists.
  const extras = current.filter(
    (local) =>
      isWaitingStill(local) &&
      !incoming.some(
        (frame) => frame.clipNumber === local.clipNumber && frame.position === local.position,
      ),
  );
  return extras.length ? [...merged, ...extras] : merged;
}

export function mergePolledClips(current: ProjectClip[], incoming: ProjectClip[]): ProjectClip[] {
  const merged = incoming.map((clip) => {
    const local = current.find((item) => item.clipNumber === clip.clipNumber);
    return preferNewerClaim(local, clip);
  });
  // First "產這段影片" inserts a row the server has not written yet.
  const extras = current.filter(
    (local) =>
      isWaitingClip(local) && !incoming.some((clip) => clip.clipNumber === local.clipNumber),
  );
  return extras.length ? [...merged, ...extras] : merged;
}

// An older snapshot must not cover a redo. Same-or-newer claim wins, including
// the finished file, so a stale list refresh cannot put the previous picture back.
function preferNewerClaim<T extends { submittedAt?: string }>(local: T | undefined, incoming: T): T {
  if (!local?.submittedAt) return incoming;
  if (incoming.submittedAt && incoming.submittedAt >= local.submittedAt) return incoming;
  return local;
}

// Cover files are named with the job id. A later id is a later still.
function coverJobId(url?: string) {
  const id = url?.split("?")[0]?.split("/").pop() ?? "";
  return /^[a-f0-9]{24}$/i.test(id) ? id.toLowerCase() : "";
}

// A stale page refresh must not put the previous cover back, or clear
// "generating" before the finished file has been written.
function mergeCover(current: PublicVideo, incoming: PublicVideo): PublicVideo {
  const localId = coverJobId(current.coverUrl);
  const remoteId = coverJobId(incoming.coverUrl);
  const localGenerating = current.coverStatus === "generating";
  const remoteGenerating = incoming.coverStatus === "generating";

  if (remoteGenerating || (remoteId && localId && remoteId > localId)) return incoming;
  if (localId && remoteId && localId > remoteId) {
    return {
      ...incoming,
      coverUrl: current.coverUrl,
      coverStatus: current.coverStatus === "failed" ? "failed" : "idle",
      coverInset: current.coverInset,
    };
  }
  if (localGenerating && current.coverUrl === incoming.coverUrl && incoming.coverStatus !== "failed") {
    return { ...incoming, coverUrl: current.coverUrl, coverStatus: "generating" };
  }
  return incoming;
}

export function mergePolledProject(current: PublicVideo, incoming: PublicVideo): PublicVideo {
  if (current.id !== incoming.id) return incoming;
  const cover = mergeCover(current, incoming);
  return {
    ...cover,
    frames: mergePolledFrames(current.frames, incoming.frames),
    clips: mergePolledClips(current.clips, incoming.clips),
  };
}
