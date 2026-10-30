import {
  castParagraphForFrames,
  characterReferenceUrls,
  FRAME_WARDROBE_BUILD,
  FRAME_WARDROBE_BUILD_CHECK,
  FRAME_WARDROBE_CHECK,
  FRAME_WARDROBE_FROM_REFERENCE,
  FRAME_WARDROBE_FROM_REFERENCE_CHECK,
  FRAME_WARDROBE_LOCK,
  frameCharacterLockLine,
  frameLockReferenceUrls,
  sceneImageReferenceUrls,
  soloCharacterParagraphForFrames,
} from "@/service/character/cast-prompt";
import { productLockParagraph, productReferenceUrls } from "@/service/product/blueprint-prompt";
import { instructionFollowsReferenceClothes } from "@/service/project/reference-images";
import { openingPhotoReference } from "@/service/project/start-image";
import {
  backgroundPlateForClip,
  backgroundPlateLockParagraph,
  objectSheetLockParagraph,
  objectSheetUrl,
} from "@/service/higgsfield/object-sheet";
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
  joinVoBeats,
} from "@/service/director/dual-beat";
import { isDiagramExplainerSkill } from "@/service/director/explainer-family";
import { shouldPlanVideoLocks } from "@/service/director/video-locks";
import { clipDrawsNoEndStill, usesSteadyStills } from "@/service/director/steady-stills";
import {
  cameraChangesAngle,
  endFrameCameraLine,
  endStillUsesOpeningStill,
  openingCameraDirective,
} from "@/service/director/camera-move";
import { frameEndMoment, frameStartMoment } from "@/service/director/keyframe-delta";
import {
  comparisonOnCanvasLines,
  listicleOnCanvasLines,
  resolveSceneText,
  sceneTextFrameLines,
  subtitleSitsBelowCenter,
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
  PAPER_CUTOUT_FULL_BLEED,
  VERTICAL_FRAME_SAFE_AREA,
  isComparisonCardSkill,
  isOutfitChangeSkill,
  isOutfitReelSkill,
  isSurpriseInterviewSkill,
  isWardrobeBuildSkill,
  skillBansNarration,
  skillForcesSceneText,
  storyShortCameraLock,
} from "@/service/director/skill-rules";
import {
  outfitChangeCameraDirective,
  OUTFIT_CHANGE_ENERGY,
  sanitizeOutfitChangeFrameScene,
} from "@/service/director/outfit-change";
import {
  rewriteOutfitSafetyText,
  sanitizeOutfitFrameScene,
  outfitAngleDirective,
  OUTFIT_ENERGY,
  OUTFIT_FRAME_GARMENT_LOCK,
  OUTFIT_IDENTITY_LOCK,
} from "@/service/director/outfit-reel";
import { isSilentSpokenLine, subtitleText } from "@/service/director/spoken-line";
import { toWrittenChinese } from "@/service/director/written-chinese";
import {
  sanitizeSurpriseFrameScene,
  surpriseHookCameraDirective,
  surpriseHookSkipsFrameAnchor,
  surpriseVarietyPlan,
} from "@/service/director/surprise-interview";
import { clipReferenceImageUrls } from "@/service/project/reference-images";
import { isTalkingHeadSkill, TALKING_HEAD_SKILL_SLUG } from "@/service/director/talking-head";
import { usesTalkingHeadSubtitleOverlay } from "@/service/director/subtitle-plate";
import { IDEOGRAM_PROMPT_MAX, imageRouteForSceneText } from "@/service/generation/image-backend";
import { referenceLimitForModel } from "@/service/higgsfield/reference-sheet";
import { frameRenderDetail, reconcileSightline, SIGHTLINE_RULE } from "@/service/director/scene-detail";
import { isRealisticStyle, isSelfShotCreatorSkill, styleForSelfShotSkill } from "@/service/style/realistic-light";
import { styleLinesForFrame, type Style } from "@/service/style";
import { resolveSubtitleLook } from "@/service/director/subtitle-look";
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
  // Talking-head end stills must not reframe. A new crop reads as a jump in the clip.
  tightLock = false,
  // End still: the attached start frame is the before picture. The camera follows the motion.
  followMotion = false,
  // Cinematic realistic whiteboard end still: same camera and lettering, only the action lands.
  steadyLock = false,
  // Talking-head end still: attached frame is this same clip's start frame, so keep its exact subtitle strips.
  keepAttachedSubtitle = false,
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
  if (steadyLock) {
    return [
      `COMPOSITION LOCK: ${source}.`,
      "Keep the same camera, shot size, angle, crop, set, lighting, character size, and screen position. No zoom, no reframe, no new angle.",
      "Only this clip's one action changes: the acting hands, the moved element, the pose, and the expression.",
      "The subtitle lettering stays identical: same words, same place, same size.",
    ];
  }
  // The narrator lock already states the action, side, and camera rules for this still.
  if (allowMove) {
    return [
      `COMPOSITION LOCK: ${source}.`,
      "Keep the same world, set, and lighting. Camera angle and pose MAY change to match the Scene. Do not invent a new room.",
    ];
  }
  if (tightLock) {
    return [
      `COMPOSITION LOCK: ${source}.`,
      "Keep the exact same camera distance, focal length, crop, head-and-body scale, set, lighting, and character identity.",
      "Do not zoom in, zoom out, or reframe the camera. No jump.",
      "Preserve the attached frame's exact room architecture, window and background layout, furniture/seat, floor/rug visibility, natural window lighting, shadow falloff, exposure, color tone, and skin texture (keep unfiltered matte-natural skin pores and dimensional shadow falloff; never smooth or airbrush the face) — never add or remove foreground plants/leaves/objects, never flip left/right, move furniture, or change the background.",
      keepAttachedSubtitle
        ? "ZERO-DISPLACEMENT CONTINUITY: Keep the background, camera crop, head size, seated torso and shoulder position, and resting hand position on the lap locked to the attached frame, adjusting only a subtle 1–2 degree natural head angle and facial expression to match the Scene above. Do NOT zoom in or crop closer. A handheld prop stays in the same hand."
        : "ZERO-DISPLACEMENT CONTINUITY: Keep the background, camera crop, character scale, seated torso and shoulder position, and resting hand position on the lap locked to the attached frame, adjusting only a subtle 1–2 degree natural head angle and facial expression to match the Scene above. Never lift hands into mid-air on the still, and do NOT add any new foreground plant or object in the corners. A handheld prop stays in the same hand.",
    ];
  }
  if (followMotion) {
    return [
      `COMPOSITION LOCK: ${source}.`,
      "Keep the same world, set, lighting, and who is on screen.",
      "Shot size, camera angle, and where subjects sit follow the camera motion's landing, not this attached frame.",
      "Do not invent a new room.",
    ];
  }
  return [
    `COMPOSITION LOCK: ${source}.`,
    "Keep the same camera, set, lighting, character size, and screen position.",
    "Apply only the Scene changes (pose, props, lettering). Do not invent a new room or camera.",
  ];
}

// End still = the opening still after the camera motion. Kept short so it survives the prompt budget.
function endFrameMotionLine(startScene: string, motion: string) {
  const opening = clipAt(startScene.replace(/\s+/g, " ").trim(), 140);
  const camera = clipAt(motion.replace(/\s+/g, " ").trim(), 180);
  if (!opening && !camera) return "";
  return `Camera landing: this end still is the opening still after the camera motion. Opening: ${opening} Motion: ${camera} Keep the same place and light. Shot size, angle, and where subjects sit follow where the camera lands. If the motion locks the camera, keep that framing.`;
}

// Higgsfield Marketing Studio Flare rejects prompts over this many characters.
export const IMAGE_PROMPT_MAX_CHARS = 5000;
// Stills are trimmed to this, leaving headroom under the provider cap.
export const FRAME_PROMPT_BUDGET = 4800;

// End stills freeze the landing, so they keep only the last timed beat.
// Start stills send the whole motionCamera; see the start-frame label.
export function motionBeatForFrame(motion: string, position: FramePosition) {
  const beats = motion
    .split(/[；;]\s*/)
    .map((beat) => beat.trim())
    .filter(Boolean);
  if (beats.length < 2 || position === "start") return motion.trim();
  return beats[beats.length - 1];
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
function stripSceneSubtitleSentence(scene: string) {
  return scene
    .replace(/\s*(?:Subtitle\b|字幕[：:])[\s\S]*$/iu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function trimSceneParts(
  scene: string,
  mode: "light-short" | "light-drop" | "set-short",
  setBudget = 200,
) {
  const parts = scene.split(/(?=[1-9]\)\s)/);
  if (parts.length < 2) return scene;
  return parts
    .map((part) => {
      if (/^3\)\s/.test(part)) {
        if (mode === "light-short") return `${clipAt(firstSentence(part), 120)} `;
        if (mode === "light-drop") return "";
        return part;
      }
      if (mode !== "set-short" || !/^2\)\s/.test(part)) return part;
      const baseText = setBudget > 200 ? part.trim() : firstSentence(part);
      const short = clipAt(baseText, setBudget);
      const lost = [...new Set(part.match(/「[^」]+」/g) || [])].filter((label) => !short.includes(label));
      return `${short}${lost.length ? ` Also labeled ${lost.join(" ")}.` : ""} `;
    })
    .join("")
    .trim();
}

type FrameTrimmable = {
  styleBody: string;
  visualWorld: string;
  palette: string;
  scene: string;
  motion: string;
  remark: string;
  renderDetail: string;
  moment: string;
  castLines: string[];
  objectLockLine: string;
  backgroundLockLine: string;
  sightline: string;
  safeArea: string;
};

// Cut the soft sections in priority order until the prompt fits the budget. The Scene
// is this image's content, so generic rules go first and the Scene only loses Light and
// the tail of Set. Subtitles, cast / wardrobe locks, composition lock and aspect ratio never trim.
// Anything still over is left for the send-time shorten step.
function quotedSpellings(prompt: string) {
  const quotes = new Set<string>();
  for (const match of prompt.matchAll(/"([^"\n]+)"|「([^」\n]+)」/g)) {
    const text = (match[1] || match[2] || "").trim();
    if (text) quotes.add(text);
  }
  return [...quotes];
}

// Ideogram only accepts 2048 characters. Keep the exact lettering and the
// scene, and drop the long identity notes the blueprint image already shows.
export function compactSceneTextPrompt(prompt: string, aspectRatio: string) {
  const quotes = quotedSpellings(prompt);
  const scene = prompt.match(/^Scene: .+$/m)?.[0] ?? "Scene: the storyboard still.";
  const sceneLine = scene.length > 700 ? `${scene.slice(0, 699)}…` : scene;
  const labels = quotes.filter((quote) => prompt.includes(`「${quote}」`));
  const spoken = quotes.filter((quote) => !labels.includes(quote));
  const lines = [
    "On-canvas lettering ON — highest priority. Draw each character below exactly. Do not swap in a similar word.",
    ...spoken.map((quote) => `Marker line (spell exactly): "${quote}"`),
    ...(labels.length ? [`Also draw these labels exactly: ${labels.map((label) => `「${label}」`).join(" ")}`] : []),
    "Look: extra-bold condensed sans, white fill, thick black outline, sitting on a yellow dry-brush stroke.",
    sceneLine,
    SIGHTLINE_RULE,
    "Draw exactly one character matching attached image 1. Do not copy a turnaround sheet or draw the person twice.",
    "No extra words and no subtitle bar.",
    `Aspect ratio ${aspectRatio}.`,
  ];
  return lines.join("\n");
}

function fitFramePrompt(
  parts: FrameTrimmable,
  compose: (parts: FrameTrimmable) => string,
  budget = FRAME_PROMPT_BUDGET,
  options: { keepLight?: boolean; preserveSetDetail?: boolean } = {},
) {
  // Realistic stills keep the render rule and the Scene's Light part; light is what removes the plastic look.
  const keepLight = options.keepLight === true;
  // Concept explainers store their entire 4-element structured diagram inside `2) Set`, so preserve up to 900 chars.
  const setBudget = options.preserveSetDetail ? 900 : 200;
  const steps: Array<(p: FrameTrimmable) => FrameTrimmable> = [
    (p) => ({ ...p, visualWorld: clipAt(firstSentence(p.visualWorld), 300) }),
    (p) => ({ ...p, palette: clipAt(p.palette, 160) }),
    (p) => ({ ...p, remark: clipAt(p.remark, 300) }),
    ...(keepLight
      ? []
      : [
          (p: FrameTrimmable) => ({ ...p, renderDetail: "" }),
          (p: FrameTrimmable) => ({ ...p, scene: trimSceneParts(p.scene, "light-short") }),
        ]),
    (p) => ({ ...p, visualWorld: "" }),
    (p) => ({ ...p, palette: clipAt(p.palette, 80), remark: clipAt(p.remark, 200) }),
    ...(keepLight ? [] : [(p: FrameTrimmable) => ({ ...p, scene: trimSceneParts(p.scene, "light-drop") })]),
    (p) => ({ ...p, scene: trimSceneParts(p.scene, "set-short", setBudget) }),
    // Camera motion stays whole until the prompt is still over the cap.
    (p) => ({ ...p, motion: clipAt(p.motion, 160) }),
    (p) => ({ ...p, motion: "" }),
    // If preserving a 900-char diagram Set still pushes the prompt past budget, fall back to a 200-char Set with preserved 「」 labels before compacting realistic render rules.
    ...(setBudget > 200
      ? [(p: FrameTrimmable) => ({ ...p, scene: trimSceneParts(p.scene, "set-short", 200) })]
      : []),
    // Realistic catalog style lines repeat REALISTIC_FRAME_RENDER_RULE; trim them before touching locks.
    (p) => ({ ...p, styleBody: clipAt(p.styleBody, 360) }),
    // Compact verbose scene camera boilerplate and lock paragraphs BEFORE dropping realistic styleBody or renderDetail.
    (p) => ({
      ...p,
      scene: p.scene
        .replace(/\s*Same camera as the opening still:[^.]*\.\s*No zoom, no reframe, no jump\./, "")
        .replace(/\s*No pictures pasted on the frame,[^.]*\./, "")
        .replace(/\s*Do not stand up\.\s*No microphone\.\s*Do not shoot at arm's length\.\s*Do not send an arm out of the frame\.\s*Do not crop to a face-only close-up\./, "")
        .replace(
          /\s*Camera: (?:a phone fixed on a phone tripod, locked\. Lens is 24mm at f\/1\.8, the face sharp and the background a little soft\. Head and torso stay in frame\. Both hands stay inside the frame\.|handheld iPhone front-camera selfie at 30–40cm, 24mm f\/1\.8, cropped collarbone\/upper-chest up so the face fills 60–65% of vertical 9:16 \(subtle 10° high-angle; no waist, lap, thighs, or hands\)\.[^.]*\.)/,
          " Camera: intimate 30–40cm handheld iPhone selfie close-up cropped from collarbone/upper-chest up (the face fills 60–65% of the vertical 9:16 frame, top of hair touching/cropped by top edge, subtle 10-degree high-angle selfie perspective; NO waist, NO lap, NO thighs, NO hands in frame).",
        )
        .replace(
          /Character: (?:still )?the only person in the frame, (?:seated and centered, head and torso in frame|still seated),\s*/,
          "Character: intimate collarbone-up selfie close-up (face fills 60–65% of frame, no hands/lap visible), ",
        )
        .replace(
          /Set: the same (?:sofa at home in every clip, a bookshelf behind the head|lived-in bedroom corner in every clip, a soft bedhead or door frame and a side window softly blurred behind the head)\.\s*Light: (?:ordinary daylight from a window to one side, no studio light|directional soft window daylight from one side with natural 1\.4:1–1\.8:1 cheek-to-cheek shadow falloff, bright eye catchlights, and moist lip highlight — no flat beauty-ring fill, no studio light)\./,
          "Set: lived-in bedroom/window corner with soft bedhead or door frame depth behind the head. Light: directional soft window daylight from one side (1.4:1–1.8:1 cheek contrast, eye catchlights, moist lips; no flat beauty-ring fill).",
        )
        .replace(
          /Subtitle: one LARGE phone-readable subtitle, a little below the vertical center, clear of the face and the bottom edge, exactly /,
          "Subtitle: one LARGE subtitle below vertical center, clear of face and bottom, ",
        )
        .replace(/\s*鏡頭同開頭畫面一樣：[^。]*。(?:唔好|不要)變焦，(?:唔好|不要)跳鏡。/g, "")
        .replace(/\s*畫面上面(?:唔好|不要)貼圖、(?:唔好|不要)加字，(?:冇|沒有)新道具。/g, "")
        .replace(
          /\s*(?:唔好|不要)企起身，(?:冇|沒有)咪。(?:唔好|不要)用手臂距離，(?:唔好|不要)伸隻手出畫面，(?:唔好|不要)裁成淨係塊臉。/g,
          "",
        )
        .replace(
          /\s*鏡頭：手機固定(?:喺|在)手機腳架，鎖定(?:唔|不)郁。鏡頭係 24mm f\/1\.8，塊臉清楚、背景少少朦。頭同上身留(?:喺|在)畫面。兩隻手都留(?:喺|在)畫面入面。/g,
          " 鏡頭：鎖定 24mm f/1.8 腳架中景（頭、上身、雙手喺畫面）。",
        )
        .replace(
          /\s*場景：全程同一張屋企沙發，書架(?:喺|在)頭後面。\s*光：一邊窗(?:嘅|的)普通日光，(?:冇|沒有)影樓燈。/g,
          " 場景：屋企沙發，頭後書架。光：單邊窗自然日光。",
        )
        .trim(),
      moment: firstSentence(p.moment),
      palette: "",
    }),
    // When cast + prop sheet + background plate + logo + realistic light push the prompt past the
    // budget, compact the verbose lock boilerplate while keeping every lock header and rule intact.
    (p) => ({
      ...p,
      objectLockLine: p.objectLockLine
        ? p.objectLockLine.replace(
            /Copy only shape, materials, and colours[\s\S]*$/,
            "Copy only shape, materials, and colours of props the Scene names (aiming their working face at the user; draw blank back if facing away). Ignore the white background, grid, and unused tiles.",
          )
        : "",
      backgroundLockLine: p.backgroundLockLine
        ? p.backgroundLockLine.replace(
            /This image is a 3x3 of the empty set\.[\s\S]*$/,
            "Match the 3x3 cell whose angle fits this Scene's Camera line for location, architecture, sky, and light direction; do not paste the empty framing or grid.",
          )
        : "",
      sightline:
        "Sightline: show only what this camera can see. Keep faces, screens, pages, and labels aimed at whoever uses them; if facing away from the camera, draw the blank back.",
      safeArea: p.safeArea
        ? "9:16 IG Reel safe area: fill 100% of the 9:16 vertical frame edge-to-edge from top edge to bottom edge with the scene (NO top or bottom letterbox bars or padding bands); keep text and faces in the middle 60%."
        : "",
      castLines: p.castLines.map((line) =>
        line
          .replace(
            /^Identity notes \([^)]+\):/,
            "Identity notes (preserve portrait face & exact real-photo porous skin texture; relight from Scene):",
          )
          .replace(
            /^A character board shows the SAME person twice:[\s\S]*$/,
            "Character board = SAME person twice: copy face & exact real-photo porous skin texture from left close-up, body & outfit from right full-body; draw one figure only.",
          ),
      ),
    }),
    (p) => ({
      ...p,
      scene: p.scene
        .replace(
          /\s*(?:Realism:|真實感：)\s*[\s\S]*?(?=\s*(?:Subtitle:|字幕：)|$)/,
          (match) =>
            /60–65%/.test(match)
              ? " Realism: warm-toned (3400K–4200K golden-amber indoor warmth), soft, even, diffused ambient indoor light and warm sunlit window daylight with iPhone Smart HDR and a low, gradual tonal transition across the face (soft minimal shadows under the chin and around the eyes, warm creamy highlights, natural eye catchlights; no cold blue/grey cast, no harsh side-light contrast, no half-dark face, no flat beauty-ring glare, soft window below clipping); authentic 30–40cm handheld iPhone 16 Pro / Sony ZV-E1 selfie close-up cropped from collarbone/upper-chest up so the face fills 60–65% of the vertical 9:16 frame (top of hair near/cropped at top edge, subtle 10° high-angle selfie perspective, no waist, no lap, no thighs, no hands in frame, zero vertical elongation or horizontal compression) against a cozy warm-toned lived-in indoor room corner with soft bedhead/door/window depth; faithfully preserve the character portrait's raw unretouched non-reflective diffuse matte human skin with visible pores and warm healthy undertones across cheeks/nose/forehead (zero skin reflectivity, zero shiny hot spots, zero oily/waxy sheen), fine peach-fuzz, wispy bangs and loose flyaway hair strands, and real collar fabric weave."
              : " Realism: warm-toned (3400K–4200K golden-amber indoor warmth), soft, even, diffused ambient indoor light and warm sunlit window daylight with iPhone Smart HDR and a low, gradual tonal transition across the face (soft minimal shadows under the chin and around the eyes, warm creamy highlights; no cold blue/grey cast, no harsh side-light contrast, no half-dark face, no flat beauty-ring glare, soft window below clipping); natural shallow depth of field keeping the Scene's exact camera framing and cozy warm room setting with tack-sharp face and soft warm optical background bokeh; faithfully preserve the character portrait's raw unretouched non-reflective diffuse matte human skin with visible pores and warm healthy undertones across cheeks/nose/forehead (zero skin reflectivity, zero shiny hot spots, zero oily/waxy sheen), fine peach-fuzz, wispy bangs and loose flyaway hair strands, and real fabric weave.",
        )
        .trim(),
    }),
    (p) => ({
      ...p,
      renderDetail: p.renderDetail.replace(/^Render detail:[\s\S]*?(?=(?:Realistic light & camera|Real human camera capture):)/, "").trim(),
    }),
    (p) => ({
      ...p,
      renderDetail: p.renderDetail
        ? p.renderDetail.startsWith("Real human camera capture:")
          ? "Real human camera capture: shot on modern creator camera equipment (iPhone 16 Pro 24mm f/1.8 / Sony ZV-E1 / DJI Osmo Pocket 3 CMOS sensor; no heavy 35mm film grain or retro LUT) in an inviting 3400K–4200K warm golden-amber indoor colour temperature. Light faces with warm, soft, even, diffused ambient indoor light and a low, gradual tonal transition (soft minimal shadows under the chin and around the eyes, no cold blue/grey cast, no harsh side-light contrast, below pure-white clipping) and faithfully preserve the character portrait's raw unretouched non-reflective diffuse matte-natural skin pores, peach-fuzz, warm healthy skin undertones, and under-eye micro-texture (zero skin reflectivity, zero shiny hot spots, zero oily, waxy, or plastic sheen) with soft warm background bokeh."
          : "Realistic light & camera: keep daytime and indoor scenes brightly well-exposed with clear midtones (never dim or underexposed unless explicitly night); light faces and surfaces with soft diffused ambient room light or gentle window daylight and a low, gradual tonal transition across the face (no harsh side-light contrast, no half-dark face) and concrete light/shadow colour contrast (soft neutral daylight with gently cooler shadows, no amber vintage cast; neutral or cool by default unless a warm practical lamp, fire, or sunset is visible; in dark scenes keep 90% of shadows neutral; lift black point in underwater/fog/smoke). Match real camera optics from the Scene (24mm / 35mm / 50mm / 85mm portrait lens; deep focus f/11 for environment or f/4 to f/1.4 creamy bokeh background) with clean digital colour and no film grain, non-reflective diffuse matte-natural skin pores (zero skin reflectivity, zero oily sheen), keep shadow blacks clean and neutral, and keep glowing objects below pure-white clipping."
        : "",
    }),
    ...(keepLight
      ? [
          (p: FrameTrimmable) => ({
            ...p,
            styleBody: "Never: waxy airbrushed plastic skin, beauty-filter smoothing, porcelain doll skin, oily specular forehead sheen, flat front beauty-ring light, sterile CGI surfaces.",
          }),
        ]
      : []),
    (p) => (/(?:\bRealism:|真實感：)/.test(p.scene) ? { ...p, renderDetail: "" } : p),
    (p) => ({ ...p, styleBody: "" }),
  ];
  let current = parts;
  let prompt = compose(current);
  for (const step of steps) {
    if (prompt.length <= budget) return prompt;
    current = step(current);
    prompt = compose(current);
  }
  return prompt;
}

// A saved user style is a 24-hex id. An invented label such as "cinematic-realistic" is not.
const USER_STYLE_ID = /^[a-f0-9]{24}$/i;

function chosenStyleId(id: string | undefined): id is string {
  return Boolean(id && (isStyleId(id) || USER_STYLE_ID.test(id)));
}

export function resolveClipStyleId(
  project: Pick<Project, "styleId" | "styleIds" | "phaseA">,
  clipNumber: number,
): string | undefined {
  const row = project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber);
  // Only a real catalog or user style may override the project. An invented id
  // would otherwise collapse to doodle and leave the character blueprint.
  if (chosenStyleId(row?.styleId)) return row.styleId;
  if (project.styleIds && project.styleIds.length > 0) {
    return project.styleIds[(clipNumber - 1) % project.styleIds.length];
  }
  return project.styleId;
}

// Catalog styles only. A user id must be loaded and passed in; it must not become doodle.
export function systemStyle(project: Pick<Project, "styleId" | "styleIds" | "phaseA">, clipNumber?: number): Style {
  const id = clipNumber != null ? resolveClipStyleId(project, clipNumber) : project.styleId;
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

// Prop sheet then empty-set plate for this clip. Sit after the character so faces win.
// Only skills in VIDEO_LOCKS_SKILL_SLUGS attach prop sheets and background plates.
// Talking-head stills anchored to Clip 1's start already lock the room and props to attached image 1;
// attaching the 3x3 empty-set plate alongside it causes the model to pick a different cell per clip.
export function videoLockReferenceUrls(
  project: Project,
  clipNumber: number,
  options?: { anchor?: { kind: FrameAnchorKind } },
): string[] {
  if (!shouldPlanVideoLocks(project.skillSlug)) {
    return [];
  }
  if (isTalkingHeadSkill(project.skillSlug) && options?.anchor?.kind === "clip-start") {
    return [];
  }
  const urls: string[] = [];
  const sheet = objectSheetUrl(project);
  if (sheet) urls.push(sheet);
  const plate = backgroundPlateForClip(project, clipNumber);
  if (plate?.url) urls.push(plate.url);
  return urls;
}

// Brief reference images assigned to this clip, capped to the free slots of the
// edit model. Past its URL limit every ref is stacked into one sheet, which
// breaks the "attached image N" numbering and the composition lock.
export function frameSceneReferenceUrls(
  project: Project,
  clipNumber: number,
  otherRefCount: number,
) {
  // Talking-head room photos replace the bookshelf and any clip-assigned refs.
  const backgrounds =
    project.skillSlug === TALKING_HEAD_SKILL_SLUG ? project.backgroundImageUrls || [] : [];
  const urls = backgrounds.length ? backgrounds : clipReferenceImageUrls(project, clipNumber);
  const route = imageRouteForSceneText(resolveSceneText(project).language);
  const room = referenceLimitForModel(route.editModel) - otherRefCount;
  return urls.slice(0, Math.max(0, room));
}

// Brief reference images the director assigned to this clip; they guide place and product, not the person.
// With a COMPOSITION LOCK (end frame / redo) the lock wins; otherwise the reference sets the place.
export function sceneReferenceFrameLine(
  start: number,
  count: number,
  locked = false,
  clothingOnly = false,
  clothingFromInstruction = false,
  background = false,
) {
  const which =
    count === 1 ? `attached image ${start} shows` : `attached images ${start}–${start + count - 1} show`;
  if (background) {
    return `BACKGROUND REFERENCE: ${which} the room behind the character. Use that background instead of a bookshelf, a bed, or any other set. Do not copy the person, face, hair, or clothes in that photo. The character stays the selected blueprint.`;
  }
  // A clothing photo is the garment, not a person or a set to copy.
  if (clothingOnly) {
    return `CLOTHING REFERENCE: ${which} the clothes to copy exactly. Copy every garment's style, cut, colour, pattern, and details. Do not redesign, recolor, drop, or add pieces. Do not copy the person, face, hair, pose, tattoos, or background. Face, hair, and body stay on the character blueprint. Only the character changes.`;
  }
  const follow = locked
    ? "keep the COMPOSITION LOCK framing and use them only for product and set details"
    : "follow their composition, location, and setting";
  const clothes = clothingFromInstruction
    ? "The instruction says the clothes follow this image: copy only the garments."
    : "Do not redress the character from this image.";
  return `SCENE REFERENCE: ${which} the place, product, props, and layout for this scene — ${follow}. Do not copy the person, face, or hairstyle in that image. Face and hair stay on the selected character. ${clothes}`;
}

// Talking-head stills show the selected person once. A second blueprint, or a
// person inside a room photo, otherwise gets drawn as someone else.
const TALKING_HEAD_SOLO =
  "SOLO: exactly one person in the frame — the selected character. No second person, crowd, interviewer, reflection of another face, or a second copy of the same person.";

function talkingHeadFrameProject(project: Project): Project {
  if (!isTalkingHeadSkill(project.skillSlug) || !project.cast || project.cast.length <= 1) return project;
  return { ...project, cast: project.cast.slice(0, 1) };
}

// Deterministic image prompts derived from the approved Phase A storyboard.
// No extra LLM call: the storyboard rows already describe scene + motion.
export function buildFramePrompt(
  project: Project,
  clipNumber: number,
  position: FramePosition,
  options: FramePromptOptions = {},
) {
  project = talkingHeadFrameProject(project);
  const solo = isTalkingHeadSkill(project.skillSlug);
  const selfShot = isSelfShotCreatorSkill(project.skillSlug);
  const rawStyle = options.style ?? systemStyle(project, clipNumber);
  const style = selfShot ? styleForSelfShotSkill(rawStyle) : rawStyle;
  const realistic = isRealisticStyle(style);
  // Cinematic realistic whiteboard: both stills share the camera and the whole subtitle.
  const steady = usesSteadyStills(project.skillSlug, style);
  const subtitleLook = resolveSubtitleLook(project.subtitleLook);
  const phaseA = project.phaseA;
  if (!phaseA) throw new Error("尚未有分鏡");
  // Spoken lines stay colloquial for the voice. The still spells 書面語.
  const canvasClips =
    project.language === "yue"
      ? phaseA.clips.map((clip) => ({
          ...clip,
          englishVo: toWrittenChinese(clip.englishVo),
          narrativeJob: toWrittenChinese(clip.narrativeJob),
          explainerScene: toWrittenChinese(clip.explainerScene),
          motionCamera: toWrittenChinese(clip.motionCamera),
          ...(clip.startScene ? { startScene: toWrittenChinese(clip.startScene) } : {}),
          ...(clip.endScene ? { endScene: toWrittenChinese(clip.endScene) } : {}),
          ...(clip.startVo ? { startVo: toWrittenChinese(clip.startVo) } : {}),
          ...(clip.endVo ? { endVo: toWrittenChinese(clip.endVo) } : {}),
        }))
      : phaseA.clips;
  const row = canvasClips.find((clip) => clip.clipNumber === clipNumber);
  if (!row) throw new Error(`找不到 clip ${clipNumber}`);
  const next = canvasClips.find((clip) => clip.clipNumber === clipNumber + 1);
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
  // An anchor in front shifts the numbering of the refs after it.
  const anchorCount = options.anchor ? 1 : 0;
  const logoUrls = logoReferenceUrls(project);
  const productUrls = productReferenceUrls(project.products);
  const skipVideoLocks =
    !shouldPlanVideoLocks(project.skillSlug) ||
    (solo && options.anchor?.kind === "clip-start");
  const videoLockUrls = videoLockReferenceUrls(project, clipNumber, { anchor: options.anchor });
  const sheetUrl = skipVideoLocks ? undefined : objectSheetUrl(project);
  const plate = skipVideoLocks ? undefined : backgroundPlateForClip(project, clipNumber);
  const outfitReel = isOutfitReelSkill(project.skillSlug);
  const outfitChange = isOutfitChangeSkill(project.skillSlug);
  const wardrobeBuild = isWardrobeBuildSkill(project.skillSlug);
  const surprise = isSurpriseInterviewSkill(project.skillSlug);
  const clothingFromInstruction =
    !wardrobeBuild &&
    instructionFollowsReferenceClothes([
      project.source,
      ...(project.referenceImages || []).map((image) => image.description),
    ]);
  // Every still needs the clothing photo so style and colour stay exact.
  // Overlay stills burn the subtitle later, so they must not reserve a lettering-sample slot.
  const overlay = usesTalkingHeadSubtitleOverlay({
    skillSlug: project.skillSlug,
    styleId: project.styleId,
  });
  // Subtitles are never generated into scene images; talking-head stills are always text-free.
  const talkingHeadSkipsLettering = solo;
  // User's opening photo sits in front of the character so that face is the person who talks.
  const openingPhotoUrl = openingPhotoReference(project, clipNumber, position);
  const openingCount = openingPhotoUrl ? 1 : 0;
  const sceneRefUrls = frameSceneReferenceUrls(
    project,
    clipNumber,
    annotatedCount +
      anchorCount +
      openingCount +
      lockUrls.length +
      videoLockUrls.length +
      logoUrls.length +
      productUrls.length,
  );
  const sampleLookLine = undefined;
  // The character blueprint comes before any scene photo so that photo's face does not win.
  const characterFirst = lockUrls.length > 0;
  const copyClothes = clothingFromInstruction && sceneRefUrls.length > 0;
  const characterAttachmentStart = characterFirst
    ? annotatedCount + anchorCount + openingCount + 1
    : annotatedCount + anchorCount + openingCount + 1 + sceneRefUrls.length;
  const videoLockStart = characterAttachmentStart + lockUrls.length;
  const sceneRefStart = characterFirst
    ? videoLockStart + videoLockUrls.length
    : annotatedCount + anchorCount + openingCount + 1;
  const openingPhotoLine = openingPhotoUrl
    ? `OPENING PHOTO: attached image ${annotatedCount + anchorCount + 1} is the user's own starting photo. Draw this starting still from that photo: same face, hair, clothes, body, pose, and setting. Do not replace them with the character blueprint.`
    : "";
  const compositionLocked = Boolean(options.anchor && options.anchor.kind !== "prev-end");
  const backgroundRefs =
    project.skillSlug === TALKING_HEAD_SKILL_SLUG && (project.backgroundImageUrls?.length || 0) > 0;
  const sceneRefLines = sceneRefUrls.length
    ? [
        sceneReferenceFrameLine(
          sceneRefStart,
          sceneRefUrls.length,
          compositionLocked,
          wardrobeBuild,
          copyClothes,
          backgroundRefs,
        ),
      ]
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
  let videoLockCursor = videoLockStart;
  const objectLockLine = sheetUrl
    ? objectSheetLockParagraph(videoLockCursor++, project.objectSheetItems || [])
    : "";
  const backgroundLockLine = plate?.url
    ? backgroundPlateLockParagraph(videoLockCursor++, plate)
    : "";
  const productStart = characterFirst
    ? sceneRefStart + sceneRefUrls.length
    : characterAttachmentStart + lockUrls.length + videoLockUrls.length;
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
  // Steady stills paint the whole line on both frames so the video never rewrites the lettering.
  const spokenForFrame = dualBeat
    ? steady
      ? joinVoBeats(clipStartVo(row), clipEndVo(row))
      : position === "start"
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
  // The director writes the subtitle into the scene. Do not strip it or replace it.
  const directorWritesLettering = sceneText.enabled && !listicle && !comparison;
  const sceneRaw = directorWritesLettering || keepSceneLabels
    ? sceneForFrame.trim()
    : stripStoryboardWriting(sceneForFrame);
  const motionRaw = directorWritesLettering || keepSceneLabels
    ? row.motionCamera.trim()
    : stripStoryboardWriting(row.motionCamera);
  let sceneDescription = directorWritesLettering
    ? sceneRaw
    : sceneText.enabled
      ? stripSceneVoiceoverRecap(sceneRaw)
      : sceneRaw;
  let motionDescription = sceneText.enabled
    ? stripSceneVoiceoverRecap(motionRaw)
    : motionRaw;
  if (outfitReel) {
    sceneDescription = sanitizeOutfitFrameScene({
      scene: sceneDescription,
      clipNumber,
      position,
      name: project.cast?.[0]?.name,
    });
    motionDescription = rewriteOutfitSafetyText(motionDescription);
  }
  if (outfitChange) {
    sceneDescription = sanitizeOutfitChangeFrameScene({
      scene: sceneDescription,
      clipNumber,
      position,
      name: project.cast?.[0]?.name,
    });
    motionDescription = rewriteOutfitSafetyText(motionDescription);
  }
  const surprisePlan = surprise ? surpriseVarietyPlan(phaseA) : [];
  const surpriseClip = surprisePlan.find((item) => item.clipNumber === clipNumber);
  if (surprise) {
    sceneDescription = sanitizeSurpriseFrameScene({
      scene: sceneDescription,
      clipNumber,
      position,
      name: project.cast?.[0]?.name || phaseA.characterLock.split(/[：:]/)[0]?.trim(),
      place: surpriseClip?.place,
    });
  }
  // The Scene line is what the image model follows. A later rule cannot undo a contradiction inside it.
  sceneDescription = reconcileSightline(sceneDescription);
  sceneDescription = sceneDescription.replace(
    /Light source: the key light from the Light line comes from one side with negative fill on the far cheek so it falls off into soft shadow, and a faint rim light separates the hair and shoulders from the background\./g,
    "Light source: the key light and faint rim light come strictly from the visible window side in the Light line (never from the dark interior side opposite the window, and never copy the blueprint's flat reference light direction), lighting the window-facing cheek with a 1.4:1 to 1.8:1 cheek-to-cheek contrast ratio while the far cheek away from the window falls into deep negative-fill shadow with a clear nose-bridge shadow (grazing contrast, no front fill, no unmotivated warm orange backlight, overcast window daylight kept soft below pure-white clipping).",
  );
  // Always strip spoken Subtitle sentences from scene descriptions; subtitles are never painted into scene stills.
  sceneDescription = stripSceneSubtitleSentence(sceneDescription).replace(
    /\bcanvas\s+in\s+(?:the\s+)?middle\s+60%\s+safe\s+(?:zone|area)\b/gi,
    "full-bleed canvas (keep foreground subjects in the middle 60% safe zone)",
  );
  const openingRaw = directorWritesLettering || keepSceneLabels
    ? clipStartScene(row).trim()
    : stripStoryboardWriting(clipStartScene(row));
  const openingForLanding = stripSceneSubtitleSentence(
    directorWritesLettering
      ? openingRaw
      : sceneText.enabled
        ? stripSceneVoiceoverRecap(openingRaw)
        : openingRaw,
  );
  // Outfit, surprise, and talking-head already write their own end camera. Everyone else lands the motion.
  const cameraLanding =
    position === "end" && !wardrobeBuild && !surprise && !steady && !isTalkingHeadSkill(project.skillSlug)
      ? endFrameMotionLine(openingForLanding, motionDescription)
      : "";
  // An attached opening still makes the edit model repaint that angle, so this line is text only.
  // Steady stills never change angle, so neither camera-change line is written.
  const angleText = !wardrobeBuild && !surprise && !steady && !isTalkingHeadSkill(project.skillSlug);
  const landedCamera =
    position === "end" && angleText ? endFrameCameraLine(motionDescription, row.endUsesStartStill) : "";
  const openingCamera = position === "start" && angleText ? openingCameraDirective(motionDescription) : "";
  const subtitleBelowCenter = subtitleSitsBelowCenter(project.aspectRatio);
  const paintSurpriseType = false;
  const onCanvasTextBlock = !sceneText.enabled || talkingHeadSkipsLettering
    ? sceneTextFrameLines(false, sceneText.language)
    : overlay
    ? []
    : listicle
    ? [
        ...listicleOnCanvasLines({
          clips: canvasClips,
          clipNumber,
          subtitle: voForFrame,
          subtitlePlace: subtitleBelowCenter ? "below-center" : "bottom",
        }),
      ]
    : comparison
      ? [
          ...comparisonOnCanvasLines({
            narrativeJob: row.narrativeJob,
            aspectRatio: project.aspectRatio,
          }),
        ]
    : keepSceneLabels && !sceneText.enabled
      ? sceneTextFrameLines(false, sceneText.language, undefined, undefined, {
          inWorldLabels: true,
          look: subtitleLook,
          lookLine: sampleLookLine,
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
  // Start stills need the whole move so the opening pose and framing leave room for it.
  const motionLabel =
    position === "start"
      ? "Full camera motion (consider the whole move; this still is only the opening)"
      : "Motion just completed at this frame";
  const narratorLock = cartoonNarratorFrameLock(project.skillSlug, {
    hasCharacter: performance,
    action: cartoonClipAction(row.motionCamera),
    position,
    clipNumber,
    steadyStills: steady,
    realistic,
  });

  const [styleHeader, styleBody = ""] = styleLinesForFrame(style);
  const compose = (parts: FrameTrimmable) => [
    ...onCanvasTextBlock,
    styleHeader,
    ...(parts.styleBody ? [parts.styleBody] : []),
    ...(parts.visualWorld ? [`Visual world: ${parts.visualWorld}`] : []),
    ...(parts.palette ? [`Palette: ${parts.palette}`] : []),
    ...(wardrobeBuild ? [OUTFIT_IDENTITY_LOCK] : []),
    ...(outfitReel ? [OUTFIT_ENERGY] : []),
    ...(outfitChange ? [OUTFIT_CHANGE_ENERGY] : []),
    ...(characterFirst ? parts.castLines : []),
    ...(characterFirst && parts.objectLockLine ? [parts.objectLockLine] : []),
    ...(characterFirst && parts.backgroundLockLine ? [parts.backgroundLockLine] : []),
    ...sceneRefLines,
    ...(openingPhotoLine ? [openingPhotoLine] : []),
    ...(characterFirst ? [] : parts.castLines),
    ...(!characterFirst && parts.objectLockLine ? [parts.objectLockLine] : []),
    ...(!characterFirst && parts.backgroundLockLine ? [parts.backgroundLockLine] : []),
    ...(solo ? [TALKING_HEAD_SOLO] : []),
    ...(productLine ? [productLine] : []),
    ...logoLines,
    ...(characterLockLine ? [characterLockLine] : []),
    ...(listicle || sceneText.enabled || keepSceneLabels || paintSurpriseType || !sceneText.enabled
      ? []
      : sceneTextFrameLines(false, sceneText.language)),
    `Scene: ${parts.scene}`,
    // Stays after the Scene when generic lines such as Render detail are trimmed away.
    ...(parts.sightline ? [parts.sightline] : []),
    ...(parts.motion ? [`${motionLabel}: ${parts.motion}`] : []),
    ...(storyShortCameraLock(project.skillSlug) ? [storyShortCameraLock(project.skillSlug)] : []),
    ...(narratorLock ? [narratorLock] : []),
    ...(lockUrls.length
      ? [
          wardrobeBuild
            ? FRAME_WARDROBE_BUILD
            : copyClothes
              ? FRAME_WARDROBE_FROM_REFERENCE
              : FRAME_WARDROBE_LOCK,
        ]
      : []),
    ...(outfitReel ? [outfitAngleDirective(clipNumber, position, sceneDescription)] : []),
    ...(outfitChange ? [outfitChangeCameraDirective(clipNumber, position, sceneDescription)] : []),
    ...(surprise && clipNumber === 1 ? [surpriseHookCameraDirective(position)] : []),
    ...(parts.renderDetail ? [parts.renderDetail] : []),
    ...(cameraLanding ? [cameraLanding] : []),
    ...(landedCamera ? [landedCamera] : []),
    ...(openingCamera ? [openingCamera] : []),
    parts.moment,
    ...compositionLockLines(
          options.anchor,
          annotatedCount + 1,
          sceneRefUrls.length > 0,
          performance && !steady,
          (solo || (surprise && clipNumber > 1)) && options.anchor?.kind === "clip-start",
          position === "end" && !solo && !wardrobeBuild && !surprise && !steady,
          steady && position === "end",
          solo && position === "end",
        ),
    ...revisionLines(options.revision && { ...options.revision, remark: parts.remark }),
    ...(!sceneText.enabled || talkingHeadSkipsLettering
      ? ["Final check: no letters, no subtitle, no caption, no numbers, no sign, no watermark."]
      : overlay
      ? ["Final check: no letters, no subtitle, no caption bar, no watermark."]
      : listicle
      ? ["Final check: the numbered item list is visible and spelled exactly."]
      : sceneText.enabled && silentClip
        ? ["Final check: no subtitle band and no letters in the frame."]
        : keepSceneLabels && !sceneText.enabled
          ? [
              "Final check: the only lettering is the short in-world label(s) named in the Scene; no subtitle band, no voiceover transcript.",
            ]
          : []),
    ...(lockUrls.length
      ? [
          wardrobeBuild
            ? `${FRAME_WARDROBE_BUILD_CHECK} ${OUTFIT_FRAME_GARMENT_LOCK}`
            : copyClothes
              ? FRAME_WARDROBE_FROM_REFERENCE_CHECK
              : FRAME_WARDROBE_CHECK,
        ]
      : []),
    ...(parts.safeArea ? [parts.safeArea] : []),
    ...(style.id === "paper-cutout" ||
    ("baseStyleId" in style && style.baseStyleId === "paper-cutout")
      ? [PAPER_CUTOUT_FULL_BLEED]
      : []),
    `Aspect ratio ${project.aspectRatio}.`,
  ].join("\n");

  // Ideogram rejects anything over 2048 characters. Soft sections trim first;
  // the spelled subtitle line is outside those sections and stays whole.
  const routeModel = imageRouteForSceneText(sceneText.language).model;
  const ideogram = routeModel.startsWith("ideogram/");
  const budget = ideogram ? IDEOGRAM_PROMPT_MAX : FRAME_PROMPT_BUDGET;
  const prompt = fitFramePrompt(
    {
      styleBody,
      visualWorld,
      palette: phaseA.palette,
      scene: sceneDescription,
      motion: motionBeatForFrame(motionDescription, position),
      remark: options.revision?.remark?.trim() || "",
      renderDetail: frameRenderDetail({ realistic, selfShot }),
      moment,
      castLines,
      objectLockLine,
      backgroundLockLine,
      sightline: SIGHTLINE_RULE,
      safeArea: project.aspectRatio === "9:16" ? VERTICAL_FRAME_SAFE_AREA : "",
    },
    compose,
    budget,
    {
      keepLight: realistic,
      preserveSetDetail: isDiagramExplainerSkill(project.skillSlug),
    },
  );
  // Grok spells the quoted line when that line leads a short prompt. A long
  // storyboard prompt, or the previous still, makes it copy a similar character.
  if (routeModel.startsWith("xai/grok-imagine")) {
    return compactSceneTextPrompt(prompt, project.aspectRatio);
  }
  if (!ideogram || prompt.length <= IDEOGRAM_PROMPT_MAX) return prompt;
  return compactSceneTextPrompt(prompt, project.aspectRatio);
}

// Prompt + reference URLs for one still submit. A push or a locked camera
// waits for the start file. An angle change does not attach that still.
export function frameSubmitPlan(
  project: Project,
  clipNumber: number,
  position: FramePosition,
  revision?: FrameRevision,
  style?: RenderableStyle,
) {
  project = talkingHeadFrameProject(project);
  const wardrobeBuild = isWardrobeBuildSkill(project.skillSlug);
  const surpriseHook =
    isSurpriseInterviewSkill(project.skillSlug) &&
    surpriseHookSkipsFrameAnchor(clipNumber, position);
  const clipRow = project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber);
  const motion = clipRow?.motionCamera;
  const foundAnchor = clipFrameAnchor(project.frames, clipNumber, position, {
    anchorToFirstClip: isTalkingHeadSkill(project.skillSlug),
  });
  // Talking-head, outfit, and surprise keep their own still rules. The director's boolean is ignored.
  const directorChooses =
    !isTalkingHeadSkill(project.skillSlug) && !isSurpriseInterviewSkill(project.skillSlug);
  // Cinematic realistic whiteboard never changes angle inside a clip, so the start still always rides along.
  const steady = usesSteadyStills(project.skillSlug, style ?? systemStyle(project, clipNumber));
  // Another still glued on makes the image model copy its camera, so a new angle is drawn without it.
  const dropEndStill =
    position === "end" && directorChooses && !steady && !endStillUsesOpeningStill(clipRow);
  const dropOpeningStill =
    position === "start" && directorChooses && !steady && cameraChangesAngle(motion);
  const anchor = wardrobeBuild || surpriseHook || dropEndStill || dropOpeningStill ? undefined : foundAnchor;
  const castUrls = frameLockReferenceUrls(project);
  const logoUrls = logoReferenceUrls(project);
  const productUrls = productReferenceUrls(project.products);
  const videoLockUrls = videoLockReferenceUrls(project, clipNumber, {
    anchor: anchor ? { kind: anchor.kind } : undefined,
  });
  // Subtitles are never generated into scene images, so no lettering-sample slot is reserved.
  const textStyleUrls: string[] = [];
  const openingPhotoUrl = openingPhotoReference(project, clipNumber, position);
  const sceneRefUrls = frameSceneReferenceUrls(
    project,
    clipNumber,
    (revision?.annotatedUrl ? 1 : 0) +
      (anchor ? 1 : 0) +
      (openingPhotoUrl ? 1 : 0) +
      castUrls.length +
      videoLockUrls.length +
      logoUrls.length +
      productUrls.length +
      textStyleUrls.length,
  );
  const openingUrls = openingPhotoUrl ? [openingPhotoUrl] : [];
  const orderedLocks =
    castUrls.length > 0
      ? [...openingUrls, ...castUrls, ...videoLockUrls, ...sceneRefUrls, ...productUrls, ...logoUrls, ...textStyleUrls]
      : [...openingUrls, ...sceneRefUrls, ...castUrls, ...videoLockUrls, ...productUrls, ...logoUrls, ...textStyleUrls];
  return {
    prompt: buildFramePrompt(project, clipNumber, position, {
      revision,
      anchor: anchor ? { kind: anchor.kind } : undefined,
      style,
    }),
    refs: sceneImageReferenceUrls({
      annotatedUrl: revision?.annotatedUrl,
      anchorUrl: anchor?.url,
      lockUrls: orderedLocks,
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
  // Only the last talking-head clip draws an end still; earlier clips land on the next start.
  const positions: FramePosition[] = clipDrawsNoEndStill(project, clipNumber)
    ? ["start"]
    : ["start", "end"];
  const own = positions.map((position) => ({
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
  const uniqueStyleIds = Array.from(
    new Set(
      clipNumbers
        .map((clipNumber) => resolveClipStyleId(project, clipNumber) || project.styleId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (uniqueStyleIds.length <= 1) {
    const style = await loadRenderableStyle({
      styleId: uniqueStyleIds[0] ?? project.styleId,
      ownerClerkUserId: project.clerkUserId,
    });
    return framesWithClips(project, clipNumbers, style);
  }
  const styleById = new Map<string, RenderableStyle>();
  await Promise.all(
    uniqueStyleIds.map(async (id) => {
      const loaded = await loadRenderableStyle({
        styleId: id,
        ownerClerkUserId: project.clerkUserId,
      });
      styleById.set(id, loaded);
    }),
  );
  return clipNumbers.reduce((frames, clipNumber) => {
    const cid = resolveClipStyleId(project, clipNumber) || project.styleId;
    const clipStyle = cid ? styleById.get(cid) : undefined;
    return framesWithClip({ ...project, frames }, clipNumber, clipStyle);
  }, project.frames || []);
}

export function frameKey(clipNumber: number, position: FramePosition) {
  return `${clipNumber}:${position}`;
}
