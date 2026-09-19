import { castParagraphForFrames } from "@/lib/characters/cast-prompt";
import type { FrameAnchorKind } from "@/lib/higgsfield/clip-keyframes";
import {
  resolveStyle,
  styleLetteringLine,
  styleLinesForFrame,
  type Style,
} from "@/lib/styles";
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

export type FramePromptOptions = {
  revision?: FrameRevision;
  // Completed still this frame must continue from (start, prev-end, or sibling).
  styleRefUrl?: string;
  anchorKind?: FrameAnchorKind;
};

function anchorLines(options: FramePromptOptions) {
  if (!options.styleRefUrl) return [];
  if (options.anchorKind === "clip-start") {
    return [
      "Also attached (after any annotated previous version): THIS CLIP'S START frame. Keep the same camera, character size and screen position. Only apply the described motion as a modest continuation — props and labels may slide or morph. Do not teleport the character or invent a new composition.",
    ];
  }
  if (options.anchorKind === "prev-end") {
    return [
      "Also attached (after any annotated previous version): the previous clip's END frame. Inherit that environment and character placement; this opening is the next beat of the same world, not a new shot.",
    ];
  }
  return [
    "Also attached (after any annotated previous version): the completed sibling frame from the other end of this clip. Match its line weight, character proportions, colouring and lettering exactly; do not copy its composition.",
  ];
}

export function videoStyle(project: Pick<Project, "styleId">): Style {
  return resolveStyle(project.styleId);
}

// Deterministic image prompts derived from the approved Phase A storyboard.
// No extra LLM call: the storyboard rows already describe scene + motion.
export function buildFramePrompt(
  project: Project,
  clipNumber: number,
  position: FramePosition,
  options: FramePromptOptions = {},
) {
  const style = videoStyle(project);
  const phaseA = project.phaseA;
  if (!phaseA) throw new Error("尚未有分鏡");
  const row = phaseA.clips.find((clip) => clip.clipNumber === clipNumber);
  if (!row) throw new Error(`找不到 clip ${clipNumber}`);
  const next = phaseA.clips.find((clip) => clip.clipNumber === clipNumber + 1);

  const moment =
    position === "start"
      ? `This is the FIRST frame (t=0s) of clip ${clipNumber}: show the opening state before any motion happens. Keep this a single locked camera setup that the end frame will continue.`
      : `This is the LAST frame of clip ${clipNumber}: the SAME SHOT as the start frame after a modest continuation of the described motion. Keep the same camera, character size, and screen position. Props and labels may slide or morph in or out; do not teleport the character or cut to a new composition.${
          next
            ? ` It must visually hand off to the next clip, which opens with: ${next.explainerScene}`
            : phaseA.loopMode === "infinite"
              ? ` It must match the very first frame of clip 1 so the video loops seamlessly.`
              : ""
        }`;

  const hasCast = Boolean(project.cast && project.cast.length > 0);

  return [
    ...styleLinesForFrame(style),
    `Visual world: ${phaseA.visualWorld}`,
    `Palette: ${phaseA.palette}`,
    // With a cast, the sheet rule comes first and the text lock is demoted to
    // a staging hint; without one, the text lock is the only identity anchor.
    ...castParagraphForFrames(project.cast),
    hasCast
      ? `Locked character (names and staging hint; appearance comes from the attached sheets): ${phaseA.characterLock}`
      : `Locked character (must look identical in every frame): ${phaseA.characterLock}`,
    `Scene: ${row.explainerScene}`,
    `Motion and camera across the clip: ${row.motionCamera}`,
    moment,
    ...revisionLines(options.revision),
    // Sibling line goes after the revision lines: the annotated previous
    // version is always the FIRST attachment (see pipeline.ts ordering), so
    // this reference is described position-agnostically.
    ...anchorLines(options),
    styleLetteringLine(style),
    "Any on-canvas text must be spelled exactly as written in the scene description.",
    `Aspect ratio ${project.aspectRatio}.`,
  ].join("\n");
}

// Frames array with a fresh queued start + end entry for one clip (prompt
// rebuilt from the current storyboard, old sketch revision dropped). Other
// clips' entries are untouched.
export function framesWithClip(project: Project, clipNumber: number): ClipFrame[] {
  const others = (project.frames || []).filter((frame) => frame.clipNumber !== clipNumber);
  const submittedAt = new Date().toISOString();
  const own = (["start", "end"] as FramePosition[]).map((position) => ({
    clipNumber,
    position,
    prompt: buildFramePrompt(project, clipNumber, position),
    status: "queued" as const,
    submittedAt,
  }));
  return [...others, ...own].sort(
    (a, b) => a.clipNumber - b.clipNumber || (a.position === "start" ? -1 : 1),
  );
}

export function frameKey(clipNumber: number, position: FramePosition) {
  return `${clipNumber}:${position}`;
}
