import type { ClipFrame, FramePosition, Project } from "@/types/project";

// Deterministic image prompts derived from the approved Phase A storyboard.
// No extra LLM call: the storyboard rows already describe scene + motion.
export function buildFramePrompt(
  project: Project,
  clipNumber: number,
  position: FramePosition,
) {
  const phaseA = project.phaseA;
  if (!phaseA) throw new Error("尚未有分鏡");
  const row = phaseA.clips.find((clip) => clip.clipNumber === clipNumber);
  if (!row) throw new Error(`找不到 clip ${clipNumber}`);
  const next = phaseA.clips.find((clip) => clip.clipNumber === clipNumber + 1);

  const moment =
    position === "start"
      ? `This is the FIRST frame (t=0s) of clip ${clipNumber}: show the opening state before any motion happens.`
      : `This is the LAST frame of clip ${clipNumber}: show the resting state after all described motion has completed.${
          next
            ? ` It must visually hand off to the next clip, which opens with: ${next.explainerScene}`
            : phaseA.loopMode === "infinite"
              ? ` It must match the very first frame of clip 1 so the video loops seamlessly.`
              : ""
        }`;

  return [
    "Single storyboard still for a whiteboard-doodle cartoon explainer video.",
    "Clean solid white canvas, bold irregular black marker outlines, flat marker fills, hand-drawn feel, no photorealism, no chalkboard, no watermark.",
    `Visual world: ${phaseA.visualWorld}`,
    `Palette: ${phaseA.palette}`,
    `Locked character (must look identical in every frame): ${phaseA.characterLock}`,
    `Scene: ${row.explainerScene}`,
    `Motion and camera across the clip: ${row.motionCamera}`,
    moment,
    "Any on-canvas text must be spelled exactly as written in the scene description.",
    `Aspect ratio ${project.aspectRatio}.`,
  ].join("\n");
}

// Initial queued frame list (start + end for every clip) before any job exists.
export function initialFrames(project: Project): ClipFrame[] {
  const clips = project.phaseA?.clips || [];
  return clips.flatMap((row) =>
    (["start", "end"] as FramePosition[]).map((position) => ({
      clipNumber: row.clipNumber,
      position,
      prompt: buildFramePrompt(project, row.clipNumber, position),
      status: "queued" as const,
    })),
  );
}

export function frameKey(clipNumber: number, position: FramePosition) {
  return `${clipNumber}:${position}`;
}
