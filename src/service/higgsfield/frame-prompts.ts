import {
  castParagraphForFrames,
  characterReferenceUrls,
  FRAME_WARDROBE_CHECK,
  FRAME_WARDROBE_LOCK,
  frameCharacterLockLine,
  frameLockReferenceUrls,
  sceneImageReferenceUrls,
  soloCharacterParagraphForFrames,
} from "@/service/character/cast-prompt";
import {
  clipFrameAnchor,
  type FrameAnchorKind,
} from "@/service/higgsfield/clip-keyframes";
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
  stripSceneVoiceoverRecap,
  stripStoryboardWriting,
  stripVisualWorldStyleEcho,
  stripVisualWorldTextPolicy,
} from "@/service/director/scene-text";
import {
  bookendLogoFrameLines,
  cartoonNarratorFrameLock,
  isBookendSkill,
  skillBansNarration,
  skillForcesSceneText,
  STORY_SHORT_SKILL_SLUG,
  storyShortCameraLock,
} from "@/service/director/skill-rules";
import { subtitleText } from "@/service/director/spoken-line";
import { FRAME_RENDER_DETAIL } from "@/service/director/scene-detail";
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
  // Completed sibling still attached so the model continues that composition.
  anchor?: { kind: FrameAnchorKind };
};

function compositionLockLines(anchor: { kind: FrameAnchorKind } | undefined, imageIndex: number) {
  if (!anchor) return [];
  const slot = `attached image ${imageIndex}`;
  const source =
    anchor.kind === "clip-start"
      ? `${slot} is THIS CLIP'S START frame`
      : anchor.kind === "prev-end"
        ? `${slot} is the previous clip's END frame`
        : `${slot} is this clip's END frame`;
  return [
    `COMPOSITION LOCK: ${source}.`,
    "Keep the same camera, set, lighting, character size, and screen position.",
    "Apply only the Scene changes (pose, props, lettering). Do not invent a new room or camera.",
  ];
}

// Higgsfield Marketing Studio Flare rejects prompts over this many characters.
export const IMAGE_PROMPT_MAX_CHARS = 5000;
// Stills are trimmed to this, leaving headroom under the provider cap.
export const FRAME_PROMPT_BUDGET = 4800;

// A still freezes one instant, so it only needs the motion beat at that instant:
// start = first timed beat, end = last timed beat.
export function motionBeatForFrame(motion: string, position: FramePosition) {
  const beats = motion
    .split(/[；;]\s*/)
    .map((beat) => beat.trim())
    .filter(Boolean);
  if (beats.length < 2) return motion.trim();
  return position === "start" ? beats[0] : beats[beats.length - 1];
}

// First sentence of a paragraph (a "." only ends a sentence before space/end).
function firstSentence(text: string) {
  const match = text.match(/^[\s\S]*?(?:[。！？]|[.!?](?=\s|$))/);
  return (match ? match[0] : text).trim();
}

// Shorten to `max` chars, preferring to cut at a clause boundary.
function clipAt(text: string, max: number) {
  if (text.length <= max) return text;
  if (max <= 1) return "";
  const head = text.slice(0, max - 1);
  const cut = Math.max(...["，", ",", "、", "；", ";", "。", ". ", " "].map((s) => head.lastIndexOf(s)));
  return `${cut > max / 2 ? head.slice(0, cut) : head}…`;
}

// Scene rows follow "1) Character … 2) Set … 3) Light … 4) Camera …".
// Shrink Set + Light first (or drop them) so Character and Camera survive.
function trimSceneParts(scene: string, mode: "shorten" | "drop") {
  const parts = scene.split(/(?=[1-9]\)\s)/);
  if (parts.length < 2) return scene;
  return parts
    .map((part) => {
      if (!/^[23]\)\s/.test(part)) return part;
      return mode === "drop" ? "" : `${clipAt(firstSentence(part), 120)} `;
    })
    .join("")
    .trim();
}

type FrameTrimmable = {
  visualWorld: string;
  palette: string;
  scene: string;
  motion: string;
  remark: string;
};

// Cut the soft sections in priority order until the prompt fits the budget.
// Subtitles, cast / wardrobe locks, composition lock and aspect ratio never trim.
function fitFramePrompt(parts: FrameTrimmable, compose: (parts: FrameTrimmable) => string) {
  const steps: Array<(p: FrameTrimmable) => FrameTrimmable> = [
    (p) => ({ ...p, visualWorld: clipAt(firstSentence(p.visualWorld), 300) }),
    (p) => ({ ...p, motion: clipAt(firstSentence(p.motion), 160) }),
    (p) => ({ ...p, palette: clipAt(p.palette, 160) }),
    (p) => ({ ...p, remark: clipAt(p.remark, 300) }),
    (p) => ({ ...p, scene: trimSceneParts(p.scene, "shorten") }),
    (p) => ({ ...p, scene: trimSceneParts(p.scene, "drop") }),
    (p) => ({ ...p, visualWorld: "", motion: "" }),
    (p) => ({ ...p, palette: clipAt(p.palette, 80), remark: clipAt(p.remark, 200) }),
  ];
  let current = parts;
  let prompt = compose(current);
  for (const step of steps) {
    if (prompt.length <= FRAME_PROMPT_BUDGET) return prompt;
    current = step(current);
    prompt = compose(current);
  }
  // Last resort: the scene absorbs whatever is still over.
  const over = prompt.length - FRAME_PROMPT_BUDGET;
  if (over <= 0) return prompt;
  return compose({ ...current, scene: clipAt(current.scene, current.scene.length - over) });
}

export function videoStyle(project: Pick<Project, "styleId">): Style {
  return resolveStyle(project.styleId);
}

// Opening / Ending stills attach the brand logo after the character references.
export function logoReferenceUrls(project: Pick<Project, "skillSlug" | "logoUrl">): string[] {
  return isBookendSkill(project.skillSlug) && project.logoUrl ? [project.logoUrl] : [];
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
  const annotatedCount = options.revision?.annotatedUrl ? 1 : 0;
  const anchorCount = options.anchor ? 1 : 0;
  const characterAttachmentStart = annotatedCount + anchorCount + 1;
  const castLines = hasCast
    ? castParagraphForFrames(project.cast, {
        start: characterAttachmentStart,
        count: lockUrls.length,
      })
    : lockUrls.length
      ? soloCharacterParagraphForFrames(characterAttachmentStart)
      : [];
  const logoLines = logoReferenceUrls(project).length
    ? bookendLogoFrameLines(characterAttachmentStart + lockUrls.length)
    : [];

  const sceneForFrame =
    position === "start" ? clipStartScene(row) : clipEndScene(row);
  const spokenForFrame = dualBeat
    ? position === "start"
      ? clipStartVo(row)
      : clipEndVo(row)
    : row.englishVo;
  // Dialogue skills write NAME: "line"; the subtitle shows only the words.
  const voForFrame = skillBansNarration(project.skillSlug)
    ? subtitleText(spokenForFrame)
    : spokenForFrame;
  // In-world-label mode keeps the 「」 tag wording the director wrote into the scene;
  // every other mode strips it so the model does not paint invented labels.
  // Cartoon stills keep the prop tags the director wrote into the scene.
  const keepSceneLabels = !listicle && (sceneText.inWorldLabels || (dualBeat && sceneText.enabled));
  const sceneRaw = keepSceneLabels
    ? sceneForFrame.trim()
    : stripStoryboardWriting(sceneForFrame);
  const motionRaw = keepSceneLabels
    ? row.motionCamera.trim()
    : stripStoryboardWriting(row.motionCamera);
  // Marker / subtitle lines already spell the voiceover; do not repeat it in Scene.
  const sceneDescription = sceneText.enabled
    ? stripSceneVoiceoverRecap(sceneRaw)
    : sceneRaw;
  const motionDescription = sceneText.enabled
    ? stripSceneVoiceoverRecap(motionRaw)
    : motionRaw;
  // 9:16 story shorts: subtitles sit above the reel chrome, not in the bottom band.
  const reelSafeZone =
    project.skillSlug === STORY_SHORT_SKILL_SLUG && project.aspectRatio === "9:16";
  const onCanvasTextBlock = listicle
    ? [
        styleLetteringLineForSceneText(style),
        ...listicleOnCanvasLines({
          clips: phaseA.clips,
          clipNumber,
        }),
      ]
    : sceneText.enabled
      ? [
          styleLetteringLineForSceneText(style),
          // Typography already sits on the Lettering line above.
          ...sceneTextFrameLines(
            true,
            sceneText.language,
            voForFrame,
            undefined,
            dualBeat ? { markerSafeZone: true } : reelSafeZone ? { reelSafeZone: true } : undefined,
          ),
        ]
      : keepSceneLabels
        ? // Catalog typography already says "never subtitles or captions" — exactly this mode.
          sceneTextFrameLines(false, sceneText.language, undefined, styleLetteringLine(style), {
            inWorldLabels: true,
          })
        : [];

  const visualWorld = stripVisualWorldStyleEcho(
    stripVisualWorldTextPolicy(phaseA.visualWorld),
  );

  // With a cast/still attached, never echo Phase A's invented look text.
  const characterLockLine = frameCharacterLockLine(
    project.cast,
    characterUrls.length > 0,
    phaseA.characterLock,
  );
  const motionLabel =
    position === "start" ? "Motion beginning at this frame" : "Motion just completed at this frame";

  const compose = (parts: FrameTrimmable) => [
    ...onCanvasTextBlock,
    ...styleLinesForFrame(style),
    ...(parts.visualWorld ? [`Visual world: ${parts.visualWorld}`] : []),
    `Palette: ${parts.palette}`,
    ...castLines,
    ...logoLines,
    ...(characterLockLine ? [characterLockLine] : []),
    ...(listicle || sceneText.enabled || keepSceneLabels
      ? []
      : sceneTextFrameLines(false, sceneText.language)),
    `Scene: ${parts.scene}`,
    ...(parts.motion ? [`${motionLabel}: ${parts.motion}`] : []),
    ...(storyShortCameraLock(project.skillSlug) ? [storyShortCameraLock(project.skillSlug)] : []),
    ...(cartoonNarratorFrameLock(project.skillSlug) ? [cartoonNarratorFrameLock(project.skillSlug)] : []),
    ...(lockUrls.length ? [FRAME_WARDROBE_LOCK] : []),
    FRAME_RENDER_DETAIL,
    moment,
    ...compositionLockLines(options.anchor, annotatedCount + 1),
    ...revisionLines(options.revision && { ...options.revision, remark: parts.remark }),
    ...(listicle
      ? ["Final check: the numbered item list is visible and spelled exactly."]
      : sceneText.enabled
        ? dualBeat
          ? [
              "Final check: voiceover lettering is centered at 52%–60% of the frame height, max 2 lines, spelling matches the Marker line(s); no bottom subtitle band.",
            ]
          : reelSafeZone
            ? [
                "Final check: subtitle sits in the reel safe zone (64%–78% of frame height, 14% side margins), spelling matches the Subtitle line(s); not in the top 14% or bottom 20%.",
              ]
            : [
                "Final check: bottom subtitle band only; spelling must match the Subtitle line(s) above.",
              ]
        : keepSceneLabels
          ? [
              "Final check: the only lettering is the short in-world label(s) named in the Scene; no subtitle band, no voiceover transcript.",
            ]
          : []),
    ...(lockUrls.length ? [FRAME_WARDROBE_CHECK] : []),
    `Aspect ratio ${project.aspectRatio}.`,
  ].join("\n");

  return fitFramePrompt(
    {
      visualWorld,
      palette: phaseA.palette,
      scene: sceneDescription,
      motion: motionBeatForFrame(motionDescription, position),
      remark: options.revision?.remark?.trim() || "",
    },
    compose,
  );
}

// Prompt + reference URLs for one still submit. End waits until start exists
// so the start file can lock composition.
export function frameSubmitPlan(
  project: Project,
  clipNumber: number,
  position: FramePosition,
  revision?: FrameRevision,
) {
  const anchor = clipFrameAnchor(project.frames, clipNumber, position);
  return {
    prompt: buildFramePrompt(project, clipNumber, position, {
      revision,
      anchor: anchor ? { kind: anchor.kind } : undefined,
    }),
    refs: sceneImageReferenceUrls({
      annotatedUrl: revision?.annotatedUrl,
      anchorUrl: anchor?.url,
      lockUrls: [...frameLockReferenceUrls(project), ...logoReferenceUrls(project)],
    }),
    anchor,
  };
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

// Rebuild queued start+end rows for many clips in one pass.
export function framesWithClips(project: Project, clipNumbers: number[]): ClipFrame[] {
  return clipNumbers.reduce(
    (frames, clipNumber) => framesWithClip({ ...project, frames }, clipNumber),
    project.frames || [],
  );
}

export function frameKey(clipNumber: number, position: FramePosition) {
  return `${clipNumber}:${position}`;
}
