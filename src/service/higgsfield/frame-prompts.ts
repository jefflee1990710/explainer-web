import {
  castParagraphForFrames,
  characterReferenceUrls,
  FRAME_WARDROBE_BUILD,
  FRAME_WARDROBE_BUILD_CHECK,
  FRAME_WARDROBE_CHECK,
  FRAME_WARDROBE_LOCK,
  frameCharacterLockLine,
  frameLockReferenceUrls,
  sceneImageReferenceUrls,
  soloCharacterParagraphForFrames,
} from "@/service/character/cast-prompt";
import { productLockParagraph, productReferenceUrls } from "@/service/product/blueprint-prompt";
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
  comparisonOnCanvasLines,
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
  cartoonClipAction,
  cartoonNarratorFrameLock,
  isBookendSkill,
  isComparisonCardSkill,
  isOutfitReelSkill,
  skillBansNarration,
  skillForcesSceneText,
  STORY_SHORT_SKILL_SLUG,
  storyShortCameraLock,
} from "@/service/director/skill-rules";
import { rewriteOutfitSafetyText, sanitizeOutfitFrameScene, OUTFIT_CLIP1_START_LOCK, OUTFIT_CLIP1_START_MOTION } from "@/service/director/outfit-reel";
import { isSilentSpokenLine, subtitleText } from "@/service/director/spoken-line";
import { clipReferenceImageUrls } from "@/service/project/reference-images";
import { imageRouteForSceneText } from "@/service/generation/image-backend";
import { referenceLimitForModel } from "@/service/higgsfield/reference-sheet";
import { FRAME_RENDER_DETAIL } from "@/service/director/scene-detail";
import {
  styleLetteringLine,
  styleLinesForFrame,
  type Style,
} from "@/service/style";
import { resolveStyleLettering } from "@/service/style/lettering";
import { isStyleId } from "@/model/style-id";
import { hydrateStyles, resolvedStyle } from "@/service/style/load-style";
import { loadRenderableStyle, type RenderableStyle } from "@/service/style/renderable-style";
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
  // Preloaded user or system style. Omit only for catalog ids.
  style?: RenderableStyle;
};

function compositionLockLines(
  anchor: { kind: FrameAnchorKind } | undefined,
  imageIndex: number,
  hasSceneRefs = false,
  // Whiteboard explainer with a cast: the end still may zoom and the character may have walked.
  allowMove = false,
) {
  if (!anchor) return [];
  const slot = `attached image ${imageIndex}`;
  // A clip with its own scene reference may move somewhere new; carry over only look and cast.
  if (anchor.kind === "prev-end" && hasSceneRefs) {
    return [
      `CONTINUITY REFERENCE: ${slot} is the previous clip's END frame.`,
      "Keep character identity, lighting mood, and art style from it.",
      "Location and layout come from the SCENE REFERENCE, not from this frame.",
    ];
  }
  // Next clip's opening uses the previous end as a place reference, not a copy.
  if (anchor.kind === "prev-end") {
    return [
      `ENVIRONMENT REFERENCE: ${slot} is the previous clip's END frame.`,
      "Stay in that same place: same location, set dressing, time of day, and character identity.",
      "Camera angle, shot size, and where people stand MAY change to match the Scene. Do not copy the previous framing.",
      "Do not invent a new room, a new background, or a different world.",
    ];
  }
  const source =
    anchor.kind === "clip-start"
      ? `${slot} is THIS CLIP'S START frame`
      : `${slot} is this clip's END frame`;
  // The narrator lock already states the action, side, and camera rules for this still.
  if (allowMove) {
    return [
      `COMPOSITION LOCK: ${source}.`,
      "Keep the same world, set, and lighting. Camera angle and pose MAY change to match the Scene. Do not invent a new room.",
    ];
  }
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
// Character and Camera never trim. Light may go; Set holds where a pushed or pulled
// element goes, so it only shortens and keeps every 「」 label it named.
function trimSceneParts(scene: string, mode: "light-short" | "light-drop" | "set-short") {
  const parts = scene.split(/(?=[1-9]\)\s)/);
  if (parts.length < 2) return scene;
  return parts
    .map((part) => {
      if (/^3\)\s/.test(part)) {
        if (mode === "light-short") return `${clipAt(firstSentence(part), 120)} `;
        return "";
      }
      if (mode !== "set-short" || !/^2\)\s/.test(part)) return part;
      const short = clipAt(firstSentence(part), 200);
      const lost = [...new Set(part.match(/「[^」]+」/g) || [])].filter((label) => !short.includes(label));
      return `${short}${lost.length ? ` Also labeled ${lost.join(" ")}.` : ""} `;
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
  renderDetail: string;
};

// Cut the soft sections in priority order until the prompt fits the budget. The Scene
// is this image's content, so generic rules go first and the Scene only loses Light and
// the tail of Set. Subtitles, cast / wardrobe locks, composition lock and aspect ratio never trim.
// Anything still over is left for the send-time shorten step.
function fitFramePrompt(parts: FrameTrimmable, compose: (parts: FrameTrimmable) => string) {
  const steps: Array<(p: FrameTrimmable) => FrameTrimmable> = [
    (p) => ({ ...p, visualWorld: clipAt(firstSentence(p.visualWorld), 300) }),
    (p) => ({ ...p, motion: clipAt(firstSentence(p.motion), 160) }),
    (p) => ({ ...p, palette: clipAt(p.palette, 160) }),
    (p) => ({ ...p, remark: clipAt(p.remark, 300) }),
    (p) => ({ ...p, renderDetail: "" }),
    (p) => ({ ...p, scene: trimSceneParts(p.scene, "light-short") }),
    (p) => ({ ...p, visualWorld: "", motion: "" }),
    (p) => ({ ...p, palette: clipAt(p.palette, 80), remark: clipAt(p.remark, 200) }),
    (p) => ({ ...p, scene: trimSceneParts(p.scene, "light-drop") }),
    (p) => ({ ...p, scene: trimSceneParts(p.scene, "set-short") }),
  ];
  let current = parts;
  let prompt = compose(current);
  for (const step of steps) {
    if (prompt.length <= FRAME_PROMPT_BUDGET) return prompt;
    current = step(current);
    prompt = compose(current);
  }
  return prompt;
}

// Catalog styles only. A user id must be loaded and passed in; it must not become doodle.
export function systemStyle(project: Pick<Project, "styleId">): Style {
  const id = project.styleId;
  if (!id || isStyleId(id)) return resolvedStyle(id);
  throw new Error(`Style "${id}" must be loaded`);
}

export function videoStyle(project: Pick<Project, "styleId">): Style {
  return systemStyle(project);
}

// Opening / Ending stills attach the brand logo after the character references.
export function logoReferenceUrls(project: Pick<Project, "skillSlug" | "logoUrl">): string[] {
  return isBookendSkill(project.skillSlug) && project.logoUrl ? [project.logoUrl] : [];
}

// Brief reference images assigned to this clip, capped to the free slots of the
// edit model. Past its URL limit every ref is stacked into one sheet, which
// breaks the "attached image N" numbering and the composition lock.
export function frameSceneReferenceUrls(
  project: Project,
  clipNumber: number,
  otherRefCount: number,
) {
  const urls = clipReferenceImageUrls(project, clipNumber);
  const route = imageRouteForSceneText(resolveSceneText(project).language);
  const room = referenceLimitForModel(route.editModel) - otherRefCount;
  return urls.slice(0, Math.max(0, room));
}

// Brief reference images the director assigned to this clip; they guide layout, not cast looks.
// With a COMPOSITION LOCK (end frame / redo) the lock wins; otherwise the reference sets the place.
export function sceneReferenceFrameLine(
  start: number,
  count: number,
  locked = false,
  clothingOnly = false,
) {
  const which =
    count === 1 ? `attached image ${start} shows` : `attached images ${start}–${start + count - 1} show`;
  // A clothing photo is the garment, not a person or a set to copy.
  if (clothingOnly) {
    return `CLOTHING REFERENCE: ${which} the clothes to copy. Copy only the garment this still names (cut, colour, details). Do not copy the person, face, hair, pose, tattoos, or background. Face and hair stay on the character blueprint.`;
  }
  const follow = locked
    ? "keep the COMPOSITION LOCK framing and use them only for subject and set details"
    : "follow their composition, location, and setting";
  return `SCENE REFERENCE: ${which} the intended layout, subject, and setting for this scene — ${follow}; keep cast identity from the character references.`;
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

function styleLetteringLineForSceneText(style: Pick<Style, "typography">) {
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
  const style = options.style ?? systemStyle(project);
  const lettering = resolveStyleLettering(style);
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

  const hasCast = Boolean(project.cast && project.cast.length > 0);
  const performance = isDualBeatSkill(project.skillSlug) && hasCast;
  const moment =
    position === "start"
      ? frameStartMoment(clipNumber, row.durationSeconds, performance)
      : frameEndMoment(clipNumber, row.durationSeconds, nextOpening, performance);

  const sceneText = resolveSceneText(project);
  const listicle = skillForcesSceneText(project.skillSlug);
  const comparison = isComparisonCardSkill(project.skillSlug);
  const lockUrls = frameLockReferenceUrls(project);
  const characterUrls = characterReferenceUrls(project);
  const annotatedCount = options.revision?.annotatedUrl ? 1 : 0;
  const anchorCount = options.anchor ? 1 : 0;
  const logoUrls = logoReferenceUrls(project);
  const productUrls = productReferenceUrls(project.products);
  const wardrobeBuild = isOutfitReelSkill(project.skillSlug);
  // Clothing photos on the blank start still look like undressing to safety filters.
  const sceneRefUrls =
    wardrobeBuild && position === "start"
      ? []
      : frameSceneReferenceUrls(
          project,
          clipNumber,
          annotatedCount + anchorCount + lockUrls.length + logoUrls.length + productUrls.length,
        );
  const sceneRefStart = annotatedCount + anchorCount + 1;
  const characterAttachmentStart = sceneRefStart + sceneRefUrls.length;
  const compositionLocked = Boolean(options.anchor && options.anchor.kind !== "prev-end");
  const sceneRefLines = sceneRefUrls.length
    ? [sceneReferenceFrameLine(sceneRefStart, sceneRefUrls.length, compositionLocked, wardrobeBuild)]
    : [];
  const castLines = hasCast
    ? castParagraphForFrames(
        project.cast,
        {
          start: characterAttachmentStart,
          count: lockUrls.length,
        },
        { wardrobeBuild },
      )
    : lockUrls.length
      ? soloCharacterParagraphForFrames(characterAttachmentStart, { wardrobeBuild })
      : [];
  const productStart = characterAttachmentStart + lockUrls.length;
  const productLine = productLockParagraph(
    (project.products ?? []).map((item) => item.name),
    productStart,
    productUrls.length,
  );
  const logoLines = logoUrls.length
    ? bookendLogoFrameLines(productStart + productUrls.length)
    : [];

  const sceneForFrame =
    position === "start" ? clipStartScene(row) : clipEndScene(row);
  const spokenForFrame = dualBeat
    ? position === "start"
      ? clipStartVo(row)
      : clipEndVo(row)
    : row.englishVo;
  // Dialogue skills write NAME: "line"; the subtitle shows only the words.
  // "(no dialogue)" must not be painted as a caption.
  const silentClip = isSilentSpokenLine(spokenForFrame);
  const voForFrame = silentClip
    ? ""
    : skillBansNarration(project.skillSlug)
      ? subtitleText(spokenForFrame)
      : spokenForFrame;
  // In-world-label mode keeps the 「」 tag wording the director wrote into the scene;
  // every other mode strips it so the model does not paint invented labels.
  // Cartoon stills keep the prop tags the director wrote into the scene.
  const keepSceneLabels =
    !listicle && !comparison && (sceneText.inWorldLabels || (dualBeat && sceneText.enabled));
  const sceneRaw = keepSceneLabels
    ? sceneForFrame.trim()
    : stripStoryboardWriting(sceneForFrame);
  const motionRaw = keepSceneLabels
    ? row.motionCamera.trim()
    : stripStoryboardWriting(row.motionCamera);
  // Marker / subtitle lines already spell the voiceover; do not repeat it in Scene.
  let sceneDescription = sceneText.enabled
    ? stripSceneVoiceoverRecap(sceneRaw)
    : sceneRaw;
  let motionDescription = sceneText.enabled
    ? stripSceneVoiceoverRecap(motionRaw)
    : motionRaw;
  if (wardrobeBuild) {
    sceneDescription = sanitizeOutfitFrameScene({
      scene: sceneDescription,
      clipNumber,
      position,
      name: project.cast?.[0]?.name,
    });
    motionDescription = rewriteOutfitSafetyText(motionDescription);
    if (clipNumber === 1 && position === "start") {
      motionDescription = OUTFIT_CLIP1_START_MOTION;
    }
  }
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
    : comparison
      ? [
          styleLetteringLineForSceneText(style),
          ...comparisonOnCanvasLines({
            narrativeJob: row.narrativeJob,
            aspectRatio: project.aspectRatio,
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
            dualBeat
              ? { markerSafeZone: true, lettering, silentClip }
              : reelSafeZone
                ? { reelSafeZone: true, lettering, silentClip }
                : { lettering, silentClip },
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
  const narratorLock = cartoonNarratorFrameLock(project.skillSlug, {
    hasCharacter: performance,
    action: cartoonClipAction(row.motionCamera),
    position,
  });

  const compose = (parts: FrameTrimmable) => [
    ...onCanvasTextBlock,
    ...styleLinesForFrame(style),
    ...(parts.visualWorld ? [`Visual world: ${parts.visualWorld}`] : []),
    `Palette: ${parts.palette}`,
    ...sceneRefLines,
    ...castLines,
    ...(productLine ? [productLine] : []),
    ...logoLines,
    ...(characterLockLine ? [characterLockLine] : []),
    ...(listicle || sceneText.enabled || keepSceneLabels
      ? []
      : sceneTextFrameLines(false, sceneText.language)),
    `Scene: ${parts.scene}`,
    ...(parts.motion ? [`${motionLabel}: ${parts.motion}`] : []),
    ...(storyShortCameraLock(project.skillSlug) ? [storyShortCameraLock(project.skillSlug)] : []),
    ...(narratorLock ? [narratorLock] : []),
    ...(lockUrls.length ? [wardrobeBuild ? FRAME_WARDROBE_BUILD : FRAME_WARDROBE_LOCK] : []),
    ...(wardrobeBuild && clipNumber === 1 && position === "start" ? [OUTFIT_CLIP1_START_LOCK] : []),
    ...(parts.renderDetail ? [parts.renderDetail] : []),
    moment,
    ...compositionLockLines(options.anchor, annotatedCount + 1, sceneRefUrls.length > 0, performance),
    ...revisionLines(options.revision && { ...options.revision, remark: parts.remark }),
    ...(listicle
      ? ["Final check: the numbered item list is visible and spelled exactly."]
      : sceneText.enabled
        ? silentClip
          ? ["Final check: no subtitle band and no letters in the frame."]
          : dualBeat
          ? [
              `Final check: spelling matches the Marker line(s); no bottom subtitle band.${lettering.letteringLayout ? " Voiceover lettering sits where the Layout line says." : ""}`,
            ]
          : reelSafeZone
            ? [
                `Final check: spelling matches the Subtitle line(s).${lettering.reelLayout ? " Subtitle sits where the layout line above says." : ""}`,
              ]
            : [
                "Final check: bottom subtitle band only; spelling must match the Subtitle line(s) above.",
              ]
        : keepSceneLabels
          ? [
              "Final check: the only lettering is the short in-world label(s) named in the Scene; no subtitle band, no voiceover transcript.",
            ]
          : []),
    ...(lockUrls.length
      ? [
          wardrobeBuild
            ? clipNumber === 1 && position === "start"
              ? "Final check: only the white tank and knee-length athletic shorts; face and hair match the blueprint."
              : FRAME_WARDROBE_BUILD_CHECK
            : FRAME_WARDROBE_CHECK,
        ]
      : []),
    `Aspect ratio ${project.aspectRatio}.`,
  ].join("\n");

  return fitFramePrompt(
    {
      visualWorld,
      palette: phaseA.palette,
      scene: sceneDescription,
      motion: motionBeatForFrame(motionDescription, position),
      remark: options.revision?.remark?.trim() || "",
      renderDetail: FRAME_RENDER_DETAIL,
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
  style?: RenderableStyle,
) {
  const anchor = clipFrameAnchor(project.frames, clipNumber, position);
  const castUrls = frameLockReferenceUrls(project);
  const logoUrls = logoReferenceUrls(project);
  const productUrls = productReferenceUrls(project.products);
  const wardrobeBuild = isOutfitReelSkill(project.skillSlug);
  // Same cap as buildFramePrompt so the URL order matches the prompt's numbering.
  const sceneRefUrls =
    wardrobeBuild && position === "start"
      ? []
      : frameSceneReferenceUrls(
          project,
          clipNumber,
          (revision?.annotatedUrl ? 1 : 0) +
            (anchor ? 1 : 0) +
            castUrls.length +
            logoUrls.length +
            productUrls.length,
        );
  return {
    prompt: buildFramePrompt(project, clipNumber, position, {
      revision,
      anchor: anchor ? { kind: anchor.kind } : undefined,
      style,
    }),
    refs: sceneImageReferenceUrls({
      annotatedUrl: revision?.annotatedUrl,
      anchorUrl: anchor?.url,
      lockUrls: [...sceneRefUrls, ...castUrls, ...productUrls, ...logoUrls],
    }),
    anchor,
  };
}

// Frames array with a fresh queued start + end entry for one clip (prompt
// rebuilt from the current storyboard, old sketch revision dropped). Other
// clips' entries are untouched.
export function framesWithClip(
  project: Project,
  clipNumber: number,
  style?: RenderableStyle,
): ClipFrame[] {
  const others = (project.frames || []).filter((frame) => frame.clipNumber !== clipNumber);
  const submittedAt = new Date().toISOString();
  const own = (["start", "end"] as FramePosition[]).map((position) => ({
    clipNumber,
    position,
    prompt: buildFramePrompt(project, clipNumber, position, { style }),
    status: "queued" as const,
    submittedAt,
  }));
  return [...others, ...own].sort(
    (a, b) => a.clipNumber - b.clipNumber || (a.position === "start" ? -1 : 1),
  );
}

// Rebuild queued start+end rows for many clips in one pass.
export function framesWithClips(
  project: Project,
  clipNumbers: number[],
  style?: RenderableStyle,
): ClipFrame[] {
  return clipNumbers.reduce(
    (frames, clipNumber) => framesWithClip({ ...project, frames }, clipNumber, style),
    project.frames || [],
  );
}

// Draw-frames click path: load the resolved style before queueing prompts.
export async function framesWithClipsReady(
  project: Project,
  clipNumbers: number[],
  hydrate: () => Promise<void> = hydrateStyles,
) {
  await hydrate();
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  return framesWithClips(project, clipNumbers, style);
}

export function frameKey(clipNumber: number, position: FramePosition) {
  return `${clipNumber}:${position}`;
}
