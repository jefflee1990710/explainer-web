import {
  castParagraphForFrames,
  characterReferenceUrls,
  frameCharacterLockLine,
  frameLockReferenceUrls,
  soloCharacterParagraphForFrames,
} from "@/service/character/cast-prompt";
import {
  clipEndScene,
  clipEndVo,
  clipStartScene,
  clipStartVo,
  isDualBeatSkill,
} from "@/service/director/dual-beat";
import { frameEndMoment, frameStartMoment } from "@/service/director/keyframe-delta";
import {
  listicleOnCanvasLines,
  resolveSceneText,
  sceneTextFrameLines,
  stripStoryboardWriting,
  stripVisualWorldTextPolicy,
} from "@/service/director/scene-text";
import { skillForcesSceneText } from "@/service/director/skill-rules";
import {
  resolveStyle,
  styleLetteringLine,
  styleLinesForFrame,
  type Style,
} from "@/service/style";
import type {
  ClipFrame,
  FramePosition,
  FrameRevision,
  Project,
} from "@/model/project";

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
};

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
  const listicle = skillForcesSceneText(project.skillSlug);
  const hasCast = Boolean(project.cast && project.cast.length > 0);
  const lockUrls = frameLockReferenceUrls(project);
  const characterUrls = characterReferenceUrls(project);
  const characterAttachmentStart =
    (options.revision?.annotatedUrl ? 1 : 0) + 1;
  const castLines = hasCast
    ? castParagraphForFrames(project.cast, {
        start: characterAttachmentStart,
        count: lockUrls.length,
      })
    : lockUrls.length
      ? soloCharacterParagraphForFrames(characterAttachmentStart)
      : [];

  const sceneForFrame =
    position === "start" ? clipStartScene(row) : clipEndScene(row);
  const voForFrame = dualBeat
    ? position === "start"
      ? clipStartVo(row)
      : clipEndVo(row)
    : row.englishVo;
  // In-world-label mode keeps the 「」 tag wording the director wrote into the scene;
  // every other mode strips it so the model does not paint invented labels.
  // Cartoon stills keep the prop tags the director wrote into the scene.
  const keepSceneLabels = !listicle && (sceneText.inWorldLabels || (dualBeat && sceneText.enabled));
  const sceneDescription = keepSceneLabels
    ? sceneForFrame.trim()
    : stripStoryboardWriting(sceneForFrame);
  const motionDescription = keepSceneLabels
    ? row.motionCamera.trim()
    : stripStoryboardWriting(row.motionCamera);
  const onCanvasTextBlock = listicle
    ? [
        styleLetteringLineForSceneText(style),
        ...listicleOnCanvasLines({
          clips: phaseA.clips,
          clipNumber,
          typography: typographyForSceneText(style.typography),
        }),
      ]
    : sceneText.enabled
      ? [
          styleLetteringLineForSceneText(style),
          ...sceneTextFrameLines(
            true,
            sceneText.language,
            voForFrame,
            typographyForSceneText(style.typography),
            dualBeat ? { markerSafeZone: true } : undefined,
          ),
        ]
      : keepSceneLabels
        ? // Catalog typography already says "never subtitles or captions" — exactly this mode.
          sceneTextFrameLines(false, sceneText.language, undefined, styleLetteringLine(style), {
            inWorldLabels: true,
          })
        : [];

  return [
    ...onCanvasTextBlock,
    ...styleLinesForFrame(style),
    `Visual world: ${stripVisualWorldTextPolicy(phaseA.visualWorld)}`,
    `Palette: ${phaseA.palette}`,
    // With a cast/still attached, never echo Phase A's invented look text.
    ...castLines,
    frameCharacterLockLine(
      project.cast,
      characterUrls.length > 0,
      phaseA.characterLock,
    ),
    ...(listicle || sceneText.enabled || keepSceneLabels
      ? []
      : sceneTextFrameLines(false, sceneText.language)),
    `Scene: ${sceneDescription}`,
    `Motion and camera across the clip: ${motionDescription}`,
    moment,
    ...revisionLines(options.revision),
    ...(listicle
      ? ["Final check: the numbered item list is visible and spelled exactly."]
      : sceneText.enabled
        ? dualBeat
          ? [
              "Final check: voiceover lettering is centered at 52%–60% of the frame height, max 2 lines, spelling matches the Marker line(s); no bottom subtitle band.",
            ]
          : [
              "Final check: bottom subtitle band only; spelling must match the Subtitle line(s) above.",
            ]
        : keepSceneLabels
          ? [
              "Final check: the only lettering is the short in-world label(s) named in the Scene; no subtitle band, no voiceover transcript.",
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
