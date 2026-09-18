import { castParagraphForFrames } from "@/lib/characters/cast-prompt";
import type {
  ClipFrame,
  FramePosition,
  FrameRevision,
  Project,
} from "@/types/project";

// The annotation editor draws every marking in this single colour; naming it
// lets the model separate the user's remarks from the artwork. Keep in sync
// with `ANNOTATION_COLOR` in `components/annotation-editor.tsx`.
export const ANNOTATION_COLOR_NAME = "bright red-orange (#ff4d2e)";

// Extra prompt lines for a redo driven by the user's remark and/or an
// annotated copy of the previous frame (attached as the first reference image).
export function revisionLines(revision: FrameRevision | undefined) {
  if (!revision) return [];
  const remark = revision.remark?.trim();
  const lines: string[] = [];
  if (revision.annotatedUrl) {
    lines.push(
      `REVISION: the FIRST attached reference image is the previous version of this exact frame with the USER'S REMARKS drawn on top in ${ANNOTATION_COLOR_NAME}: freehand strokes (circles, arrows, scribbles) and short bold text notes in that same colour.`,
      `Everything in ${ANNOTATION_COLOR_NAME} is a remark from the user about what to change — it is NOT part of the artwork. Treat the ${ANNOTATION_COLOR_NAME} text as written instructions and apply each one to the area it sits on or points to.`,
      "Redraw the frame keeping the same composition and characters, applying those changes.",
      `Do NOT reproduce any ${ANNOTATION_COLOR_NAME} strokes, arrows or notes in the output; the new frame must contain no annotations.`,
    );
  }
  if (remark) {
    lines.push(`User's typed remark for this redo (also an instruction, not on-canvas text): ${remark}`);
  }
  return lines;
}

// Deterministic image prompts derived from the approved Phase A storyboard.
// No extra LLM call: the storyboard rows already describe scene + motion.
export function buildFramePrompt(
  project: Project,
  clipNumber: number,
  position: FramePosition,
  revision?: FrameRevision,
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
    ...castParagraphForFrames(project.cast),
    `Scene: ${row.explainerScene}`,
    `Motion and camera across the clip: ${row.motionCamera}`,
    moment,
    ...revisionLines(revision),
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
