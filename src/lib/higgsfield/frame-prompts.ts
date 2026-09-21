import {
  castParagraphForFrames,
  characterReferenceUrls,
  frameCharacterLockLine,
  soloCharacterParagraphForFrames,
} from "@/lib/characters/cast-prompt";
import {
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
  isDualBeatSkill,
} from "@/lib/director/dual-beat";
import { frameEndMoment, frameStartMoment } from "@/lib/director/keyframe-delta";
import type { FrameAnchorKind } from "@/lib/higgsfield/clip-keyframes";
import {
  resolveSceneText,
  sceneTextFrameLines,
  stripStoryboardWriting,
} from "@/lib/director/scene-text";
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
      "Also attached (after any annotated previous version): THIS CLIP'S START frame. Keep the same camera, character size and screen position. Apply the full duration-scaled motion from the storyboard so the end is a later moment, not a near-copy. Do not teleport the character or invent a new composition.",
      "Character face, hair, outfit and accessories MUST match the attached character blueprint exactly. Do not copy drifted clothing from the start frame if it conflicts with the blueprint.",
    ];
  }
  if (options.anchorKind === "prev-end") {
    return [
      "Also attached (after any annotated previous version): the previous clip's END frame. Inherit that environment and character placement; this opening is the next beat of the same world, not a new shot.",
      "Character appearance MUST still match the attached character blueprint exactly.",
    ];
  }
  return [
    "Also attached (after any annotated previous version): the completed sibling frame from the other end of this clip. Match its camera language and lettering; do not copy its composition.",
    "Character face, hair, outfit and accessories MUST match the attached character blueprint exactly.",
  ];
}

export function videoStyle(project: Pick<Project, "styleId">): Style {
  return resolveStyle(project.styleId);
}

// Catalog typography often bans "subtitles"; scene-text mode needs integrated captions.
function typographyForSceneText(typography: string) {
  return typography
    .replace(/;\s*never subtitles or captions\.?/gi, "")
    .replace(/,?\s*never subtitles or captions\.?/gi, "")
    .replace(/;\s*never bold blocky text\.?/gi, "")
    .replace(/,?\s*never bold blocky text\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/;\s*;/g, ";")
    .replace(/,\s*,/g, ",")
    .trim();
}

function styleLetteringLineForSceneText(style: Style) {
  const typography = typographyForSceneText(style.typography);
  return `Lettering: ${typography}. Integrated on-canvas voiceover lettering is required (not a separate TV subtitle bar).`;
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
  const dualBeat = isDualBeatSkill(project.skillSlug);
  const nextOpening = next
    ? dualBeat
      ? clipStartScene(next)
      : next.explainerScene
    : undefined;

  const moment =
    position === "start"
      ? frameStartMoment(clipNumber, row.durationSeconds)
      : frameEndMoment(clipNumber, row.durationSeconds, nextOpening);

  const sceneText = resolveSceneText(project);
  const hasCast = Boolean(project.cast && project.cast.length > 0);
  const characterUrls = characterReferenceUrls(project);
  // Same order as pipeline.ts: annotated redo, then start/sibling, then cast.
  const characterAttachmentStart =
    (options.revision?.annotatedUrl ? 1 : 0) + (options.styleRefUrl ? 1 : 0) + 1;

  const sceneForFrame =
    position === "start" ? clipStartScene(row) : clipEndScene(row);
  const voForFrame = dualBeat
    ? position === "start"
      ? clipStartVo(row)
      : clipEndVo(row)
    : row.englishVo;
  const sceneDescription = stripStoryboardWriting(sceneForFrame);
  const motionDescription = stripStoryboardWriting(row.motionCamera);
  const onCanvasTextBlock = sceneText.enabled
    ? [
        styleLetteringLineForSceneText(style),
        ...sceneTextFrameLines(
          true,
          sceneText.language,
          voForFrame,
          typographyForSceneText(style.typography),
        ),
      ]
    : [];

  return [
    ...onCanvasTextBlock,
    ...styleLinesForFrame(style),
    `Visual world: ${phaseA.visualWorld}`,
    `Palette: ${phaseA.palette}`,
    // With a cast/still attached, never echo Phase A's invented look text —
    // only names + the blueprint/guideline attachment rule.
    ...(hasCast
      ? castParagraphForFrames(project.cast, {
          start: characterAttachmentStart,
          count: characterUrls.length,
        })
      : characterUrls.length
        ? soloCharacterParagraphForFrames(characterAttachmentStart)
        : []),
    frameCharacterLockLine(project.cast, characterUrls.length > 0, phaseA.characterLock),
    ...(sceneText.enabled ? [] : sceneTextFrameLines(false, sceneText.language)),
    `Scene: ${sceneDescription}`,
    `Motion and camera across the clip: ${motionDescription}`,
    moment,
    ...revisionLines(options.revision),
    // Sibling line goes after the revision lines: the annotated previous
    // version is always the FIRST attachment (see pipeline.ts ordering), so
    // this reference is described position-agnostically.
    ...anchorLines(options),
    ...(sceneText.enabled
      ? [
          "Final check: bottom subtitle band only; spelling must match the Subtitle line(s) above.",
        ]
      : []),
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
