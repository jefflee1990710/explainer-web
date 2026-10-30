import type { AspectRatio, DurationPreset, SpeechPace } from "@/model/project";
import { getDirectorBySlug } from "@/service/director/catalog";
import { DURATION_PRESETS } from "@/service/director/duration-presets";
import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import {
  explainerCanvasKind,
  isDiagramExplainerSkill,
  PAPER_CUTOUT_CANVAS_LOCK,
  WHITEBOARD_CANVAS_LOCK,
  type ExplainerCanvasKind,
} from "@/service/director/explainer-family";
import {
  FOLLOW_SHOT_SKILL_SLUG,
  isFollowShotSkill,
  isOutfitChangeSkill,
  isOutfitReelSkill,
  isSilentOutfitSkill,
  isStreetLookbookSkill,
  isSurpriseInterviewSkill,
  isWardrobeBuildSkill,
  OUTFIT_CHANGE_SKILL_SLUG,
  OUTFIT_REEL_SKILL_SLUG,
  STREET_LOOKBOOK_SKILL_SLUG,
  SURPRISE_INTERVIEW_SKILL_SLUG,
} from "@/service/director/clip-continuity";
import { talkingHeadDurationHint, isTalkingHeadSkill } from "@/service/director/talking-head";

export const STORY_SHORT_SKILL_SLUG = "story-short-director";
export const DIALOGUE_QA_SKILL_SLUG = "dialogue-qa-director";
export const LISTICLE_SKILL_SLUG = "listicle-director";
export const OPENING_SKILL_SLUG = "opening-director";
export const ENDING_SKILL_SLUG = "ending-director";
export const COMPARISON_CARD_SKILL_SLUG = "comparison-card-director";
export const TALKING_BROLL_SKILL_SLUG = "talking-broll-director";
export const EDITORIAL_INTERVIEW_SKILL_SLUG = "editorial-interview-director";
export const WORKFLOW_PROMO_SKILL_SLUG = "workflow-promo-director";
export const STYLE_SWITCH_SKILL_SLUG = "style-switch-director";
export {
  FOLLOW_SHOT_SKILL_SLUG,
  OUTFIT_CHANGE_SKILL_SLUG,
  OUTFIT_REEL_SKILL_SLUG,
  STREET_LOOKBOOK_SKILL_SLUG,
  SURPRISE_INTERVIEW_SKILL_SLUG,
  isFollowShotSkill,
  isOutfitChangeSkill,
  isOutfitReelSkill,
  isSilentOutfitSkill,
  isStreetLookbookSkill,
  isSurpriseInterviewSkill,
  isWardrobeBuildSkill,
};

// Opening / Ending bookends. Auto keeps the skill's 1×5–12s sting; a chosen length does not.
const BOOKEND_SKILLS = new Set([OPENING_SKILL_SLUG, ENDING_SKILL_SLUG]);
export const BOOKEND_MIN_SECONDS = 5;
export const BOOKEND_MAX_SECONDS = 12;

export function isBookendSkill(skillSlug?: string) {
  const director = getDirectorBySlug(skillSlug);
  if (director) return Boolean(director.behavior.bookendRole);
  return Boolean(skillSlug && BOOKEND_SKILLS.has(skillSlug));
}

// IG Reel stills (9:16). Top 20% and bottom 20% stay free of text/UI overlays for every director,
// while the character/subject and background fill 100% of the vertical frame edge-to-edge.
// Paper-cutout stills. A dark mat or torn outer sheet is padding, not the collage.
export const PAPER_CUTOUT_FULL_BLEED =
  "Full-bleed collage: the scene paper reaches every edge of the frame. No dark mat, no outer torn-paper border, no floating sheet, no padding. White scissor borders stay on each cutout, not around the picture.";

export const VERTICAL_FRAME_SAFE_AREA =
  "9:16 IG Reel safe area: the photograph or scene must fill 100% of the 9:16 vertical frame edge-to-edge from the very top edge to the very bottom edge (strictly NO top or bottom letterbox bars, NO solid white/grey padding bands, and NO square/4:5 inner frame). Keep text, characters, or the main subject focal points in the middle 60% vertical safe zone so Reel UI overlays at the top 20% and the bottom 20% do not cover them.";

// Director plan for every skill. Empty unless the video is a vertical reel.
export function verticalSafeAreaDirectorLine(aspectRatio?: string) {
  if (aspectRatio !== "9:16") return "";
  return "This video is a full-bleed vertical 9:16 IG Reel. The background canvas or environment fills 100% of the 9:16 frame edge-to-edge (never add top/bottom letterbox bars or frame a horizontal or square box inside the vertical canvas). In every still, reserve the top 20% and the bottom 20% for UI safe margins: keep text, characters, or the main subject focal points in the middle 60%.";
}

// Auto on a bookend still follows that director's own short-sting plan.
export function bookendLocksLength(skillSlug: string | undefined, durationPreset: DurationPreset) {
  return isBookendSkill(skillSlug) && durationPreset === "auto";
}

// Phase A length line: Auto has no fixed budget, except a bookend's own sting plan.
export function phaseADurationHint(input: {
  skillSlug: string;
  durationPreset: DurationPreset;
  speechPace?: SpeechPace;
}) {
  if (isTalkingHeadSkill(input.skillSlug)) return talkingHeadDurationHint(input.speechPace, input.skillSlug);
  if (bookendLocksLength(input.skillSlug, input.durationPreset)) {
    return bookendDurationHint(input.skillSlug);
  }
  return DURATION_PRESETS[input.durationPreset].skillHint;
}

// Duration line sent to Phase A when a bookend stays on Auto.
export function bookendDurationHint(skillSlug: string) {
  const role = skillSlug === OPENING_SKILL_SLUG ? "opening (intro sting)" : "ending (outro sting)";
  return `Bookend ${role}: EXACTLY 1 clip, clipCount 1, durationSeconds ${BOOKEND_MIN_SECONDS}–${BOOKEND_MAX_SECONDS}. At most one short spoken line (≤ 6 English words / ≤ 10 Chinese characters), or "(no dialogue)".`;
}

// Clamp a bookend storyboard to one clip inside 5–12s. Speech sets the number later.
export function normalizeBookendClips<
  T extends { clipNumber: number; durationSeconds: number; timeRange: string },
>(clips: T[]): T[] {
  const first = clips[0];
  if (!first) return [];
  const seconds = Math.min(
    BOOKEND_MAX_SECONDS,
    Math.max(BOOKEND_MIN_SECONDS, Math.round(first.durationSeconds || BOOKEND_MAX_SECONDS)),
  );
  return [{ ...first, clipNumber: 1, durationSeconds: seconds, timeRange: `0–${seconds}s` }];
}

export function bookendDirectorBlock(
  skillSlug: string,
  hasLogo: boolean,
  options?: { lockLength?: boolean },
) {
  const opening = skillSlug === OPENING_SKILL_SLUG;
  // Auto keeps the one-clip sting. A chosen length follows that preset instead.
  const lockLength = options?.lockLength !== false;
  return [
    opening
      ? lockLength
        ? "This is an OPENING bookend: a 5–12 second brand sting that plays before the main video. Set durationSeconds from the spoken line. The logo arrives and settles."
        : "This is an OPENING bookend: a brand sting that plays before the main video. The logo arrives and settles."
      : lockLength
        ? "This is an ENDING bookend: a 5–12 second brand sting that closes the video. Set durationSeconds from the spoken line. The scene resolves onto the logo as the final resting card."
        : "This is an ENDING bookend: a brand sting that closes the video. The scene resolves onto the logo as the final resting card.",
    lockLength
      ? "Produce exactly ONE clip. Never add a second clip, a story, or an explainer beat."
      : "Follow the duration preset for clip count and each clip's length. This remains a brand sting, not a full explainer story.",
    hasLogo
      ? "The brand logo image is attached. It is the hero of both stills: startScene and endScene must name the logo, its placement (centered unless stated), and its size. Never redraw, restyle, translate, or invent a different logo or wordmark."
      : "No logo image is attached: build the sting around the brand or product name from the source as title lettering in the selected text style. Do not copy typography from the visual style.",
    opening
      ? "startScene: the logo is hidden, small, or forming (drawn on, assembled from shapes, revealed behind a prop). endScene: the full logo, crisp and readable, centered. If a character is on screen, give them a vivid, expressive facial expression reacting to the reveal."
      : "startScene: the closing beat of the world (character with a warm, expressive facial expression or props wrapping up). endScene: the full logo centered on a calm canvas as the final card.",
    lockLength
      ? "motionCamera is one simple move that fits this clip's 5–12 seconds (reveal, pop, settle, or slow push-in). No cuts."
      : "motionCamera is one simple move that fits the clip length (reveal, pop, settle, or slow push-in). No cuts.",
  ].join(" ");
}

// Pasted into bookend stills when a logo is attached.
export function bookendLogoFrameLines(imageIndex: number) {
  return [
    `BRAND LOGO: attached image ${imageIndex} is the brand logo. Reproduce it exactly — same shapes, colours, and lettering; do not redraw, restyle, crop, or invent text.`,
    "Place the logo as the Scene describes. Keep it sharp and readable on the canvas.",
  ];
}

// Talking-head, surprise-interview, and two-character Q&A use on-screen character lip-sync.
const DIALOGUE_ONLY_SKILLS = new Set([SURPRISE_INTERVIEW_SKILL_SLUG, DIALOGUE_QA_SKILL_SLUG]);

export function skillBansNarration(skillSlug?: string) {
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.bansNarration;
  return Boolean(skillSlug && DIALOGUE_ONLY_SKILLS.has(skillSlug));
}

export function skillUsesOnScreenLipSync(skillSlug?: string) {
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.speechMode === "lip-sync";
  return (
    isTalkingHeadSkill(skillSlug) ||
    isSurpriseInterviewSkill(skillSlug) ||
    skillSlug === DIALOGUE_QA_SKILL_SLUG
  );
}

export function isDialogueQaSkill(skillSlug?: string) {
  return skillSlug === DIALOGUE_QA_SKILL_SLUG;
}

// Dialogue Q&A is the only director that uses two people. Every other director
// is a single on-screen character.
export function requiredCastCount(skillSlug?: string) {
  if (!skillSlug) return 0;
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.requiredCastCount;
  if (skillSlug === DIALOGUE_QA_SKILL_SLUG) return 2;
  return 1;
}

export function isComparisonCardSkill(skillSlug?: string) {
  return skillSlug === COMPARISON_CARD_SKILL_SLUG;
}

export function isTalkingBrollSkill(skillSlug?: string) {
  return skillSlug === TALKING_BROLL_SKILL_SLUG;
}

export function isEditorialInterviewSkill(skillSlug?: string) {
  return skillSlug === EDITORIAL_INTERVIEW_SKILL_SLUG;
}

export function isWorkflowPromoSkill(skillSlug?: string) {
  return skillSlug === WORKFLOW_PROMO_SKILL_SLUG;
}

export function isStyleSwitchSkill(skillSlug?: string) {
  return skillSlug === STYLE_SWITCH_SKILL_SLUG;
}

export function maxStyleCountForSkill(skillSlug?: string) {
  if (!skillSlug) return 1;
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.maxStyleCount;
  if (skillSlug === STYLE_SWITCH_SKILL_SLUG) return 4;
  return 1;
}

// 16:9 reads left | right. Portrait and square read top | bottom.
export function comparisonSplitAxis(aspectRatio: AspectRatio): "left-right" | "top-bottom" {
  return aspectRatio === "16:9" ? "left-right" : "top-bottom";
}

// narrativeJob contract: `contrast: Panel A | Panel B`.
export function comparisonPanels(narrativeJob: string): { a: string; b: string } | null {
  const match = narrativeJob.match(/contrast:\s*(.+?)\s*\|\s*(.+)$/i);
  const a = match?.[1]?.trim();
  const b = match?.[2]?.trim();
  if (!a || !b) return null;
  return { a, b };
}

export function skillForcesSceneText(skillSlug?: string) {
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.forcesSceneText;
  return skillSlug === LISTICLE_SKILL_SLUG;
}

// 白板概念解說：畫面文字 OFF 只代表「不做旁白字幕」；場景內的短手寫標籤
// （黃色 tag、箭頭字、道具名，1–3 個字）是這個風格的核心視覺語彙，仍然允許。
export function skillAllowsInWorldLabels(skillSlug?: string) {
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.allowsInWorldLabels;
  return skillSlug === CARTOON_EXPLAINER_SKILL_SLUG;
}

export function briefSkillError(input: {
  skillSlug: string;
  characterIds: string[];
}) {
  const need = requiredCastCount(input.skillSlug);
  if (need > 0 && input.characterIds.length !== need) {
    return `這個導演需要正好 ${need} 個角色`;
  }
  return undefined;
}

export function applySkillSceneText(skillSlug: string, enabled: boolean) {
  return skillForcesSceneText(skillSlug) ? true : enabled;
}

type ListicleClip = {
  clipNumber: number;
  narrativeJob: string;
  englishVo: string;
};

function isListicleItemJob(job: string) {
  return /item|項目|#\s*\d|第\s*\d/i.test(job);
}

function isListicleBookendJob(job: string) {
  return /hook|outro|intro|開場|結尾|收束|full list|完整清單/i.test(job);
}

export function listicleListEntries(clips: ListicleClip[]) {
  const items = clips.filter((clip) => isListicleItemJob(clip.narrativeJob));
  const rows =
    items.length > 0
      ? items
      : clips.filter((clip) => !isListicleBookendJob(clip.narrativeJob));
  const source = rows.length > 0 ? rows : clips;
  return source.map((clip, index) => ({
    clipNumber: clip.clipNumber,
    index: index + 1,
    title: clip.englishVo.trim(),
  }));
}

// One shot per item, in order, so neighbouring items never share an angle.
const LISTICLE_ITEM_SHOTS = [
  "low angle, object huge in the foreground, host small behind it",
  "overhead, looking straight down, object in the middle of a surface",
  "tight side close-up, object filling the left half, open space on the right",
  "wide three-quarter, object off-center, host entering from the opposite side",
  "dutch tilt close to the lens, object leaning forward, background falling away",
  "over-the-shoulder, host's shoulder on the near edge, object deeper in the shot",
];

export function listicleItemShot(itemIndex: number) {
  const index = (Math.max(itemIndex, 1) - 1) % LISTICLE_ITEM_SHOTS.length;
  return LISTICLE_ITEM_SHOTS[index];
}

// Shared by every dialogue-only director (story short, Q&A).
export function dialogueOnlyDirectorBlock() {
  return [
    'There is NO narrator and NO third-person voiceover. The narrator field must start with "No narrator — characters speak." Then paste each supplied voice lock verbatim, one speaker per sentence. A speaker without their own lock uses the project voice lock verbatim. Do not invent a timbre and do not leave a speaker out.',
    'englishVo is only character dialogue written as NAME: "line", in the chosen dialogue language. Multiple speakers are allowed. A silent beat is "(no dialogue)".',
    "motionCamera names who is speaking. That character's mouth lip-syncs every syllable of their line with precise, restrained lip articulation and natural small jaw movement (~30–40% conversational mouth opening, clean lip closure on bilabials and pauses, no exaggerated wide-open mouth, no excessive jaw swing, no rubbery cheeks), while emotion shows in active eyebrows and expressive eyes. Every other on-screen character keeps their mouth closed and only reacts with expressive facial expressions (brow raises, eye shifts, nods).",
  ].join(" ");
}

export function storyShortDirectorBlock() {
  return [
    "This is a SHORT FILM, not an explainer.",
    "Do not force want → obstacle → turn → resolution. Arrange clips in the order the source already tells; invent beats only when the source has no story of its own.",
    "Voiceover is spoken by an unseen off-screen narrator. On-screen characters NEVER speak, NEVER move their mouths to talk, and NEVER lip-sync — their mouths stay closed while they act out the scene.",
    "Film every clip as a third-person observer camera: characters live inside the scene and never look at or talk to the camera. Describe eyelines in explainerScene and motionCamera (profile, three-quarter, over-the-shoulder). Give every on-screen character rich, expressive facial expressions (nuanced brow and eye changes that convey the emotional beat with mouths closed—never a blank or wooden face, and never lip-sync).",
  ].join(" ");
}

// Pasted into story-short stills and clip videos; empty for every other director.
export function storyShortCameraLock(skillSlug?: string) {
  if (skillSlug !== STORY_SHORT_SKILL_SLUG) return "";
  return "Camera: third-person observer camera, as in a film scene. No eye contact with the lens; characters never look at, wave to, or talk to the camera. Eyelines go to other characters, objects, or off into the scene (profile, three-quarter, over-the-shoulder).";
}

// 白板概念解說：永遠是畫外旁白；角色不說話。有角色時每個鏡頭只做一種主動作，依台詞語意挑選，近兩鏡不重複。
export type CartoonAction =
  | "push"
  | "pull"
  | "stack"
  | "lift"
  | "place"
  | "toss"
  | "plug"
  | "sketch"
  | "flip"
  | "dial"
  | "stretch"
  | "squeeze"
  | "magnify"
  | "jump"
  | "point";

type CartoonActionSpec = {
  action: CartoonAction;
  // Word the first motionCamera beat must use so the still can name this action.
  cue: string;
  meaning: string;
  director: string;
  pattern: RegExp;
  // Still lines stay short: only the detected action's line reaches the image prompt.
  start: string;
  end: string;
  video: string;
};

const NO_SWAP = "Do not swap the action for a jump, a cheer, or a new prop.";

// Earlier entries win a tie at the same word, so "pulls it apart" reads as stretch.
const CARTOON_ACTIONS: CartoonActionSpec[] = [
  {
    action: "stretch",
    cue: "stretches",
    meaning: "break down, expand",
    director: "hands together on a small chart, then arms wide and the chart stretched wide",
    pattern:
      /\bstretch(?:es|ed|ing)?\b(?!\s+(?:\w+\s+)?(?:arms?|hands?|body|legs?)\b)|\bpull(?:s|ed|ing)?\s+(?:\w+\s+){0,3}apart\b/i,
    start:
      "This clip's one action is a STRETCH. In this still both hands hold the edges of a small, compact element named in the Scene, close together.",
    end: `This still is after the STRETCH: arms spread wide, and the same element is stretched wide between the hands, showing more parts. ${NO_SWAP}`,
    video: "This clip's action is a STRETCH: the arms spread apart and the element widens between the hands.",
  },
  {
    action: "push",
    cue: "pushes",
    meaning: "send out, submit",
    director: "hands on the element, then arms extended and it farther away, at its destination",
    pattern: /\b(?:push(?:es|ed|ing)?|shov(?:e|es|ed|ing)|thrust(?:s|ing)?)\b/i,
    start:
      "This clip's one action is a PUSH. In this still the hands are on the element named in the Scene, arms bent and loaded, the element right against the hands. Draw its destination named in the Scene on the far side of the element from the character. Any motion marks point away from the character, toward that destination.",
    end: `This still is after the PUSH landed: arms fully extended away from the body, and the same element is still visible, farther from the character and at or against its destination. Any motion marks point away from the character. ${NO_SWAP}`,
    video:
      "This clip's action is a PUSH: the arms shove out fast and the element shoots away from the character's body, then never slides back toward them.",
  },
  {
    action: "pull",
    cue: "pulls",
    meaning: "bring in, get",
    director: "arms reach and grip it, then it close to the chest with the arms drawn in",
    pattern: /\b(?:pull(?:s|ed|ing)?|drag(?:s|ged|ging)?|tug(?:s|ged|ging)?|yank(?:s|ed|ing)?|haul(?:s|ed|ing)?)\b/i,
    start:
      "This clip's one action is a PULL. In this still the arms reach out and the hands grip the element named in the Scene, which sits away from the body. Any motion marks point from the element toward the character.",
    end: `This still is after the PULL landed: arms drawn in toward the chest, and the same element is still visible, now close to the body. Any motion marks point toward the character. ${NO_SWAP}`,
    video:
      "This clip's action is a PULL: the arms yank in fast and the element snaps toward the character's body, then never slides away from them.",
  },
  {
    action: "stack",
    cue: "stacks",
    meaning: "add, build up",
    director: "one hand holds a block above the stack, then the stack one block taller and the hand letting go",
    pattern: /(?<!\b(?:a|an|the|its|this|that|tall|growing)\s)\bstack(?:s|ed|ing)?\b(?!\s+of\b)/i,
    start:
      "This clip's one action is a STACK. In this still one hand holds a block just above the stack named in the Scene, which is one block short.",
    end: `This still is after the STACK: the same block sits on top, the stack is one block taller, and the hand is just letting go. ${NO_SWAP}`,
    video: "This clip's action is a STACK: the block lowers onto the stack and stays there; the stack only grows.",
  },
  {
    action: "lift",
    cue: "lifts",
    meaning: "increase, level up",
    director: "crouched with both hands under it at the waist, then arms overhead holding it up",
    pattern:
      /\b(?:lift|hoist)(?:s|ed|ing)?\b(?!\s+(?:(?:his|her|their|one|both|an?|the)\s+)?(?:arms?|hands?|head|chin|gaze|eyes)\b)/i,
    start:
      "This clip's one action is a LIFT. In this still they crouch with knees bent and both hands under the element named in the Scene, at waist height.",
    end: `This still is after the LIFT: knees straight, both arms overhead holding the same element above the head. ${NO_SWAP}`,
    video: "This clip's action is a LIFT: they rise from a crouch and raise the element overhead; it only goes up.",
  },
  {
    action: "place",
    cue: "places",
    meaning: "put it in the right spot",
    director: "holds it just above its slot, then it sits in the slot with open hands above",
    pattern: /(?<!\b(?:in|into|of|take|takes|took|taking)\s)\bplac(?:e|es|ed|ing)\b/i,
    start:
      "This clip's one action is a PLACE. In this still the hands hold the element named in the Scene just above its slot, with a small gap between them.",
    end: `This still is after the PLACE: the same element sits in its slot, and the open hands hover just above it. ${NO_SWAP}`,
    video: "This clip's action is a PLACE: the element lowers into its slot and settles there.",
  },
  {
    action: "toss",
    cue: "tosses",
    meaning: "remove, give up",
    director: "arm cocked back holding it, then arm swung through and it in mid-air just above the bin",
    pattern: /\b(?:toss(?:es|ed|ing)?|throw(?:s|ing|n)?|threw|fling(?:s|ing)?|flung|lob(?:s|bed|bing)?)\b/i,
    start:
      "This clip's one action is a TOSS. In this still the throwing arm is cocked back behind the shoulder, holding the element named in the Scene; its bin or target is on the other side.",
    end: `This still is after the TOSS: the arm has swung through toward the target, and the same element is in the air just above it. Motion marks trail from the hand toward the target. ${NO_SWAP}`,
    video:
      "This clip's action is a TOSS: the arm swings through and the element arcs away from the body toward the target, never back.",
  },
  {
    action: "plug",
    cue: "plugs",
    meaning: "connect, integrate",
    director: "holds the plug a short gap from its socket, then it seated with a small spark",
    pattern: /\bplug(?:s|ged|ging)?\b|\bsnap(?:s|ped|ping)?\s+(?:\w+\s+){0,3}(?:(?:into|onto)\b(?!\s+place\b)|together\b)/i,
    start:
      "This clip's one action is a PLUG. In this still the hands hold the plug or piece named in the Scene a short gap away from its socket.",
    end: `This still is after the PLUG: the same piece is seated in its socket, with a small spark at the joint and the hands just letting go. ${NO_SWAP}`,
    video: "This clip's action is a PLUG: the piece moves into its socket and clicks in with a small spark.",
  },
  {
    action: "sketch",
    cue: "sketches an arrow",
    meaning: "cause and effect, link two ideas",
    director: "marker tip on node A, then a finished arrow from A to B with the marker at B",
    pattern:
      /\bsketch(?:es|ed|ing)?\b|\b(?:draw(?:s|ing)?|drew)\s+(?:a|an|the|one)\s+(?:\w+\s+)?(?:arrow|line|link)\b/i,
    start:
      "This clip's one action is a SKETCH. In this still they hold a big marker with its tip on the first node named in the Scene; the arrow is not drawn yet.",
    end: "This still is after the SKETCH: a finished hand-drawn arrow runs from the first node to the second, and the marker tip rests at the second node.",
    video: "This clip's action is a SKETCH: the marker draws the arrow from the first node to the second in one stroke.",
  },
  {
    action: "flip",
    cue: "flips",
    meaning: "compare, myth versus fact",
    director: "a card shows side A, then it turned over to side B",
    pattern: /\bflip(?:s|ped|ping)?\b/i,
    start: "This clip's one action is a FLIP. In this still the hands hold a large card named in the Scene, showing its first side.",
    end: "This still is after the FLIP: the same card is turned over and shows its second side, as the Scene names it.",
    video: "This clip's action is a FLIP: the card turns over once, from its first side to its second.",
  },
  {
    action: "dial",
    cue: "turns the dial",
    meaning: "adjust, turn up",
    director: "hand on a dial with the pointer at low, then at high with the linked gauge raised",
    pattern:
      /\b(?:turn(?:s|ed|ing)?|twist(?:s|ed|ing)?|spin(?:s|ning)?|spun|crank(?:s|ed|ing)?|rotat(?:e|es|ed|ing))\s+(?:\w+\s+){0,2}(?:dial|knob|wheel|crank|lever)\b|\bdial(?:s|ed|ing)?\s+(?:it\s+)?up\b/i,
    start:
      "This clip's one action is a DIAL turn. In this still the hand grips a big dial named in the Scene, its pointer at the low mark.",
    end: "This still is after the DIAL turn: the same dial's pointer is at the high mark, and the linked gauge or graph is higher.",
    video: "This clip's action is a DIAL turn: the hand rotates the dial from low to high and the linked gauge rises with it.",
  },
  {
    action: "squeeze",
    cue: "squeezes",
    meaning: "simplify, condense",
    director: "arms wide around a messy pile, then hands together on one small block",
    pattern: /\b(?:squeez(?:e|es|ed|ing)|compress(?:es|ed|ing)?|crush(?:es|ed|ing)?)\b/i,
    start: "This clip's one action is a SQUEEZE. In this still the arms are wide around a big, messy pile named in the Scene.",
    end: `This still is after the SQUEEZE: the hands press together around one small, neat block, the pile condensed into it. ${NO_SWAP}`,
    video: "This clip's action is a SQUEEZE: the hands come together and the pile condenses into one small block.",
  },
  {
    action: "magnify",
    cue: "magnifies",
    meaning: "look closer",
    director: "a magnifying glass at the chest, then over one node with that node enlarged in the lens",
    pattern: /\bmagnif(?:y|ies|ied|ying|ier)\b/i,
    start: "This clip's one action is a MAGNIFY. In this still they hold a magnifying glass at chest height, away from the graph.",
    end: "This still is after the MAGNIFY: the magnifying glass is over one node of the graph, and that node appears enlarged inside the lens.",
    video: "This clip's action is a MAGNIFY: the glass moves over one node and that node enlarges inside the lens.",
  },
  {
    action: "jump",
    cue: "jumps",
    meaning: "breakthrough, excitement",
    director: "crouched, then both feet off the ground — never a body slid upward",
    pattern: /\b(?:jump(?:s|ed|ing)?|leap(?:s|ed|ing|t)?|hop(?:s|ped|ping)?)\b/i,
    start:
      "This clip's one action is a JUMP. In this still they crouch with knees bent, both feet on the ground, ready to spring.",
    end: "This still is the JUMP: both feet clearly off the ground with a shadow below, not a body slid upward.",
    video: "This clip's action is a JUMP: both feet leave the ground, then land.",
  },
  {
    action: "point",
    cue: "points at the camera",
    meaning: "call to action, \"you\"",
    director: "arm down, then one arm aimed at the lens, not at a side graphic",
    pattern: /\bpoint(?:s|ed|ing)?\b(?=[^.;]*\b(?:camera|lens|viewer)\b)/i,
    start: "This clip's one action is a POINT toward the camera. In this still the pointing arm is down.",
    end: "This still is after the POINT: one arm reaches straight at the lens, fingertip aimed at the viewer, not at a side graphic.",
    video: "This clip's action is a POINT toward the camera: the arm rises and the fingertip aims at the lens.",
  },
];

const ACTION_BY_NAME = new Map(CARTOON_ACTIONS.map((spec) => [spec.action, spec]));

const MENU_ORDER: CartoonAction[] = [
  "push", "pull", "stack", "lift", "place", "toss", "plug", "sketch",
  "flip", "dial", "stretch", "squeeze", "magnify", "jump", "point",
];

type CartoonExpressionArc = {
  label: string;
  start: string;
  end: string;
  video: string;
};

// Distinct per-clip facial expression arcs so the whiteboard character never repeats the same face across clips.
export const CARTOON_EXPRESSION_ARCS: readonly CartoonExpressionArc[] = [
  {
    label: "shocked disbelief → intrigued smirk",
    start:
      "wide saucer eyes, high arched eyebrows, and a stunned closed-lip reaction with lips pressed firmly shut (override the blueprint's neutral smile; mouth strictly closed)",
    end:
      "one eyebrow raised high in curiosity, focused eyes, and an intrigued asymmetrical smirk with closed lips",
    video:
      "the face shifts from wide-eyed shocked disbelief (high arched brows, lips firmly closed) into a curious single-brow closed-lip smirk",
  },
  {
    label: "puzzled furrow → sharp analytical squint",
    start:
      "deeply furrowed V-shaped eyebrows, squinted questioning eyes, and a tight side-pursed thinking mouth with lips closed (override the blueprint's neutral smile)",
    end:
      "focused analytical eyes, angled determined eyebrows, and a firm closed-mouth nod expression",
    video:
      "the face shifts from a puzzled V-brow frown and side-pursed closed mouth into a sharp analytical squint",
  },
  {
    label: "lightbulb eureka → proud confident grin",
    start:
      "eyebrows shooting high up in a sudden 'aha!' eureka realization, bright wide-open eyes, and an excited closed-lip smile",
    end:
      "relaxed confident eyebrows, sparkling eyes, and a broad proud closed-mouth grin",
    video:
      "the face lights up from a sudden wide-eyed 'aha!' eureka reaction into a proud confident closed-mouth grin",
  },
  {
    label: "skeptical side-eye → relieved warm smile",
    start:
      "asymmetric skeptical eyebrows (one brow cocked high, one lowered), side-glancing eyes, and a crooked wry closed mouth (override the blueprint's default expression)",
    end:
      "softly lifted eyebrows, warm bright eyes, and a relieved closed-mouth smile",
    video:
      "the face transitions from a skeptical single-raised-brow side-eye and wry closed mouth into a relieved warm closed-lip smile",
  },
  {
    label: "intense effort grit → triumphant beam",
    start:
      "steeply angled determined eyebrows, narrowed focused eyes, and slightly puffed cheeks with tight grit closed lips (override the blueprint's neutral face)",
    end:
      "high celebratory eyebrows, wide cheerful eyes, and a triumphant closed-lip beam",
    video:
      "the face strains with furrowed determined brows and puffed cheeks (lips firmly closed), then pops into a triumphant closed-lip beam",
  },
  {
    label: "alarmed overwhelm → calm mastery",
    start:
      "upward-slanted worried inner eyebrows, startled wide eyes, and a tense closed-lip grimace (override the blueprint's neutral smile)",
    end:
      "composed confident eyebrows, steady bright eyes, and a calm knowing closed-mouth smile",
    video:
      "the face shifts from an alarmed, worried closed-lip grimace with slanted brows into a calm, assured knowing closed-mouth smile",
  },
  {
    label: "playful wink → enthusiastic grin",
    start:
      "one eye playfully crinkled/winking with a high arched brow and a cheeky lopsided closed-lip smile",
    end:
      "both eyes wide and bright with raised eyebrows and an enthusiastic broad closed-mouth grin",
    video:
      "the face moves from a playful cheeky wink into an enthusiastic wide-eyed closed-mouth grin",
  },
  {
    label: "curious lean-in wonder → satisfied nod",
    start:
      "high curious eyebrows, wide fascinated eyes leaning toward the diagram, and an intrigued closed-lip expression",
    end:
      "warm arched eyebrows, crinkling smiling eyes, and a satisfied closed-lip smile",
    video:
      "the face shifts from wide-eyed curious wonder with closed lips into a warm, satisfied closed-mouth smiling nod",
  },
];

export function cartoonClipExpressionArc(
  clipNumber?: number,
  options?: { realistic?: boolean },
): CartoonExpressionArc | undefined {
  if (options?.realistic) return undefined;
  if (!clipNumber || clipNumber < 1) return undefined;
  return CARTOON_EXPRESSION_ARCS[(clipNumber - 1) % CARTOON_EXPRESSION_ARCS.length];
}

// Clip 1 only. The two stills must show the before and after, or the video will not move the lens.
export function cartoonHookCameraRule(
  hasCharacter: boolean,
  smoothMotion?: boolean,
  realistic?: boolean,
) {
  const faceNote = realistic
    ? "The face stays normal, alive, and naturally engaged with lips firmly closed — never a blank or deadpan stare; the character stays silent and never lip-syncs."
    : "Surprise is a facial expression only. The character stays silent.";
  if (smoothMotion) {
    if (!hasCharacter) {
      return "Clip 1 is the hook and uses at most one push-in or pull-out (parallax zoom-out / push-in) on the graph. It starts, accelerates through the change, then decelerates into the landing. The middle of that move is sharp and quick. Foreground, midground, and background stay rigid cardboard cutout layers that shift with clean parallax depth—never morph, warp, or melt the background. Same angle and same crop centre in both stills; only the distance may differ a little. Show every in-between frame. No skipped frame and no new angle. Later clips do not repeat this hook camera.";
    }
    return `Clip 1 is the hook and uses at most one push-in or pull-out (parallax zoom-out / push-in). It starts, accelerates through the change, then decelerates into the landing. The middle of that move is sharp and quick. Foreground, midground, and background stay rigid cardboard cutout layers that shift with clean parallax depth—never morph, warp, or melt the background. Both Camera lines keep the same angle and the same side; only the distance may differ a little. Show every in-between frame. No skipped frame, no orbit, and no new angle. ${faceNote} Later clips do not repeat this hook camera.`;
  }
  if (!hasCharacter) {
    return "Clip 1 is the hook and always uses one exaggerated camera on the graph, sharp and fast, no slow glide and no blur: a snap zoom into the key node, or a snap zoom out from that node to the whole chart. The start still and the end still use different shot sizes. Later clips do not repeat this hook camera.";
  }
  const hookFace = realistic ? "normal, alive, engaged face" : "surprised face";
  return `Clip 1 is the hook and always uses exactly one exaggerated camera move, sharp and fast in the first second, no slow glide and no blur. Pick one, and do not use the same move every video: a snap zoom in from a wider shot to the ${hookFace}; a snap zoom out from the ${hookFace} to the full body and the graph; a fast 360 orbit around the character that ends on the opposite side; an overhead drop from looking down onto an eye-level ${hookFace}; a crash push from far across the canvas into a close-up as the graph rushes past; a dutch snap from a tilted close-up into an upright wider view. Write that before and after in each still's Camera line, so shot size or angle differs. ${faceNote} Later clips do not repeat this hook camera.`;
}

// Concept explainers teach with several on-screen pieces, named in the still and in the camera move.
function teachingElementsRule(pieceNoun: string, graphNoun: string) {
  return [
    `Teaching elements: every clip explains its spoken line with at least four distinct ${pieceNoun}s on the ${graphNoun}, besides the character.`,
    "Each element teaches one part of that line (an icon, a diagram node, an arrow, a chart piece, a labeled part, a comparison card, a before/after strip, or a cause-and-effect object).",
    "Do not add decoration the line does not need, and do not repeat the same four elements unchanged on the next clip — add, replace, or change their state as the idea moves forward.",
    "The character does not have to hold them.",
    "Scene prompt: in the Set part of explainerScene, startScene, and endScene, name every teaching element in a numbered list — what it is, which part of the concept it explains, and where it sits (left / centre / right, foreground / midground / background).",
    "A scene that only names the character and one label is incomplete.",
    "Camera motion prompt: in motionCamera, give each teaching element its own timed beat — time window, which element moves or appears, from where to where, how it moves (drawn on, pasted, slid in from a frame edge, flipped, or stacked), and how the camera reveals it (push in on that piece, pan across the row, or pull out so the new piece sits next to the old ones).",
    "Every element in the end still is already in the start still or enters in one of those beats.",
  ].join(" ");
}

function directorActionMenu() {
  return MENU_ORDER.map((action) => ACTION_BY_NAME.get(action)!)
    .map((spec) => `${spec.action} (${spec.meaning}; write "${spec.cue}"): ${spec.director}`)
    .join("; ");
}

export function cartoonExplainerDirectorBlock(options?: {
  hasCharacter?: boolean;
  smoothMotion?: boolean;
  realistic?: boolean;
  canvas?: ExplainerCanvasKind;
}) {
  const hasCharacter = Boolean(options?.hasCharacter);
  const smooth = Boolean(options?.smoothMotion);
  const realistic = Boolean(options?.realistic);
  const canvas: ExplainerCanvasKind = options?.canvas ?? "whiteboard";
  const canvasLock =
    canvas === "paper-cutout"
      ? PAPER_CUTOUT_CANVAS_LOCK
      : "Whole-canvas 2D whiteboard lock (applies to EVERY visual style): no matter what kind of visual style is selected, the entire video frame edge-to-edge (100% of the canvas) is like a flat 2D whiteboard surface, every on-screen character is drawn in flat 2D directly on the whiteboard, and every concept is explained with 2D drawings on the whiteboard (never stage a 3D room, studio building, sky, or a physical whiteboard on an easel/stand inside a room, and never write that the canvas itself is restricted to the middle 60%).";
  const graphNoun = canvas === "paper-cutout" ? "paper-cutout explanation collage" : "whiteboard explanation graph";
  const pieceNoun = canvas === "paper-cutout" ? "cutout piece" : "drawn element";
  const physicsNoun =
    canvas === "paper-cutout"
      ? "Paper-cutout collage physics: every diagram card, prop, chart bar, shape, object, label, and graphic element is a rigid paper cutout with a thick irregular white scissor border, sliding briskly in and out of the screen (from or to the frame edges) rather than morphing, melting, or dissolving"
      : "Whiteboard cardboard style: every diagram card, prop, chart bar, shape, object, label, and graphic element stays in one rigid piece like a flat cardboard cutout, sliding briskly in and out of the screen (from or to the frame edges) rather than morphing, melting, or dissolving";
  const expressionGuidance = realistic
    ? "keeps a normal, alive, engaged real-person facial expression with a calm, relaxed, unforced neutral mouth and softly closed lips at natural rest (attentive focused eyes; never a forced or stiff closed-lip smile, never a tight-lipped smirk, never a blank, deadpan, or expressionless stare; never exaggerated cartoon grimaces, wide saucer eyes, puffed cheeks, or open-mouth gasps, and keep the mouth softly closed at all times)"
    : "gives a vivid, expressive facial expression that is DISTINCT from the previous clip (never repeat the same face twice in a row, and never keep the blueprint's default neutral smile — rotate across contrasted emotions such as Clip 1 shocked wide saucer eyes & arched brows → intrigued smirk; Clip 2 puzzled V-furrowed brows & side-pursed mouth → analytical squint; Clip 3 'aha!' eureka raised brows → proud grin; Clip 4 skeptical single-cocked eyebrow & wry mouth → relieved smile; Clip 5 intense grit with puffed cheeks → triumphant beam; Clip 6 worried slanted brows & tense grimace → calm knowing smile, with a clear emotional shift from startScene to endScene)";
  return [
    "This director is ALWAYS narrated: an unseen off-screen narrator speaks every englishVo line in the third person, using the attached character's locked voice timbre and gender verbatim when a character is attached (or the project's chosen male/female voice when no character is attached; never switch gender).",
    canvasLock,
    "Single location lock: keep the entire video in ONE single consistent background environment / set from Clip 1 through the final clip (exactly one background plate shared by all clips; never switch rooms or locations mid-video).",
    "On screen, the character never speaks, never lip-syncs, and never introduces themself. No first-person lines in the character's voice (no \"Hi, I'm Scro\", \"I am…\", \"we…\" spoken as the character); the narrator may name the character or product in the third person (\"Meet Scro. Scro turns…\").",
    hasCharacter
      ? `A character is on screen. Each clip has exactly one primary body action, chosen from this list by what the clip's line means. Each entry gives the meaning, the word motionCamera's first beat must use, and the before then after of the two stills: ${directorActionMenu()}. Do not reuse an action from either of the previous two clips. Use jump at most once per video, on the key beat. The last clip never points toward the camera. Pick another action that matches the last line, and keep the hands on the graph. A different standing position, a few steps, or a walk is not a new action.`
      : realistic
        ? "The character is a silent demonstrator: no greeting wave or talking to the viewer, mouth firmly closed with a normal, alive, engaged facial expression (never a blank or deadpan stare; never exaggerated cartoon faces). It may point at a diagram, stand aside reacting, or handle props — it does not have to hold three props."
        : "The character is a silent demonstrator: no greeting wave or talking to the viewer, mouth closed or reacting with vivid facial expressions. It may point at a diagram, stand aside reacting, or handle props — it does not have to hold three props.",
    hasCharacter
      ? smooth
        ? `Alternate the starting side: if one clip starts on the left side, the next starts on the right side (the first clip's side is free, not always left). They stay on that side for the whole clip; no lateral cross. The head may turn. Every clip still changes their body (arms, hands, torso, and legs) and ${expressionGuidance}. The camera is locked inside a clip: both stills share the same angle, shot size, and crop. A new angle (from the character's left side, from above, from the front, or from behind) is chosen only between clips, at the cut, and does not repeat the previous clip. No orbit and no move to another side inside a clip. They stay silent — expression only, mouth closed, no lip-sync and no greeting wave.`
        : `Alternate the starting side: if one clip starts on the left side, the next starts on the right side (the first clip's side is free, not always left). About 80% of clips keep them on that same side for the whole clip — do not walk them from left to right every time. Only about 20% of clips are a full cross, either left to right or right to left, and those rare crosses do not all go the same way. The head may turn. Every clip still changes their body (arms, hands, torso, and legs) and ${expressionGuidance}. Camera angle changes every clip and does not repeat: from the character's left side, from above, from the front, or from behind as they turn around, and it may zoom in or out. One continuous move, no cut and no teleport. They stay silent — expression only, mouth closed, no lip-sync and no greeting wave.`
      : "",
    hasCharacter
      ? `For every topic, keep a rich on-screen ${graphNoun} (charts, connecting lines, directional arrows, geometric shapes, diagram nodes, and conceptual objects/icons) in frame alongside the character, and add the ${pieceNoun} this clip's action works on. Do not reuse the same camera angle on the next clip. A full left-to-right or right-to-left walk is rare and does not count as the primary action. Map the claim onto a comparison, before/after, cause→effect chain, numbered steps, labeled parts, flow, or a clear chart with visible lines, bars, shapes, and objects. Never a near-empty canvas or a realistic room without prominent on-screen visual diagram graphics.`
      : `For every topic, make a rich on-screen ${graphNoun} the main subject of the canvas — not a character holding metaphor props. Map the claim onto a comparison, before/after, cause→effect chain, numbered steps, labeled parts of a whole, flow or cycle, or a simple chart with visible lines, arrows, geometric shapes, and conceptual objects. Topic does not matter: food, money, health, product, habit, or science all get a graph. Metaphor props (boxes, bins, arrows, yellow tags) support the graph; they do not replace it. Never a near-empty canvas with one floating label.`,
    hasCharacter
      ? "startScene and endScene are the before and after of that one action as listed, not two standing poses. They usually stay on the same side; they finish on the opposite side only on a rare lateral cross. Do not write that the character stands in both stills. The travel lives only in motionCamera."
      : "",
    hasCharacter
      ? "When the action moves an element (every action except jump and point toward the camera), write the same element in both startScene and endScene inside 1) Character, with where it sits relative to the hands and where its destination is (the slot, bin, stack, socket, or graph node). In endScene the element is still visible. Never write that it vanished, was swallowed, or is entirely inside something."
      : "",
    hasCharacter
      ? smooth
        ? `motionCamera plays the one action with a fast, energetic rhythm: it starts, accelerates through the change, then decelerates into the landing. The middle is sharp and quick. The opening and the landing are slower. Timestamp the speed-up and the slow-down, and pack the clip with rapid on-screen visual effects every 1–1.5 seconds (connecting lines drawing across between nodes, directional arrows snapping in, chart bars/lines rising or falling, geometric shapes and conceptual objects sliding in from the frame edges) so there is zero dead hold. Show every in-between pose. ${physicsNoun}. Any camera zoom-out or push-in uses a clean multi-plane parallax effect with rigid background layers that never warp or transform. A card flip rotates through its edge as a rigid card. Never a cut or a skipped frame. Do not describe the move as one slow constant glide.`
        : "motionCamera plays the action in three beats with real human timing, never one constant speed: a quick anticipation (wind-up or crouch, about a quarter to half a second), the action snapping fast and sharp (well under a second), then a small overshoot, a settle with a wobble, and a brisk sequence of on-screen whiteboard visual effects every 1–1.5 seconds while the graph responds (connecting lines and arrows drawing themselves across, chart bars or trend lines shooting up or down, labeled geometric shapes and conceptual objects popping or sliding in from the frame edges—never a static 2–3 second hold). Timestamp each beat. Never describe the body as moving smoothly, slowly, gently, or steadily. Clip 1 opens already moving: its startScene is the wound-up pose of its action, so the first second has motion."
      : `${physicsNoun}, with connecting lines, arrows, charts, and shapes animating every 1–1.5 seconds. Any camera zoom-out or push-in uses a clean multi-plane parallax effect with rigid background layers that never warp or transform.`,
    teachingElementsRule(pieceNoun, graphNoun),
    cartoonHookCameraRule(hasCharacter, smooth, realistic),
    "On-canvas beat text: never write Subtitle: or caption the spoken voiceover on the stills. A beat title may name a diagram label, node, arrow, or prop inside 「」 on the object it belongs to as ordinary writing on that object.",
  ]
    .filter(Boolean)
    .join(" ");
}

// Camera moves share the verbs; they are not the character's action.
const CAMERA_VERB =
  /\b(camera|lens|shot|view)\s+(?:\w+\s+){0,2}(?:push|pull)\w*(?:\s+(?:in|out|back|away))?|\b(?:push|pull)[- ](?:in|out|back)\b/gi;

// The character's one action, read from the first motion beat that names a verb.
export function cartoonClipAction(motionCamera: string | undefined): CartoonAction | undefined {
  if (!motionCamera) return undefined;
  const beats = motionCamera
    .replace(CAMERA_VERB, " ")
    .split(/[；;]\s*|\s(?=\d+\s*[–-]\s*\d+\s*s\s*:)/)
    .filter((beat) => beat.trim());
  for (const beat of beats) {
    let found: { action: CartoonAction; at: number } | undefined;
    for (const spec of CARTOON_ACTIONS) {
      const at = beat.search(spec.pattern);
      if (at >= 0 && (!found || at < found.at)) found = { action: spec.action, at };
    }
    if (found) return found.action;
  }
  return undefined;
}

// Pasted into whiteboard-explainer stills; empty for every other director.
export function cartoonNarratorFrameLock(
  skillSlug?: string,
  options?: {
    hasCharacter?: boolean;
    action?: CartoonAction;
    position?: "start" | "end";
    clipNumber?: number;
    // Cinematic realistic: both stills share the camera; only the action differs.
    steadyStills?: boolean;
    realistic?: boolean;
  },
) {
  if (!isDiagramExplainerSkill(skillSlug)) return "";
  const steady = Boolean(options?.steadyStills);
  const realistic = Boolean(options?.realistic);
  const canvas = explainerCanvasKind(skillSlug) ?? "whiteboard";
  const hookFace = realistic ? "a normal, alive, engaged closed-lip expression" : "a surprised face";
  const hook =
    options?.clipNumber === 1
      ? steady
        ? `HOOK CAMERA: Clip 1 moves the camera by one push-in or pull-out at most. This still keeps the same angle and side as the other still of Clip 1. A close view shows ${hookFace}.`
        : `HOOK CAMERA: this still uses the exaggerated framing named in the Scene. Shot size or angle differs from the other still of Clip 1. A close view shows ${hookFace}.`
      : "";
  const cameraMatch = steady
    ? "Camera angle, shot size, and side match the other still of this clip."
    : "Camera angle may differ from the other still.";
  const whiteboard2dRule =
    canvas === "paper-cutout" ? PAPER_CUTOUT_CANVAS_LOCK : WHITEBOARD_CANVAS_LOCK;
  if (options?.hasCharacter) {
    const expArc = cartoonClipExpressionArc(options.clipNumber, { realistic });
    const expStill = expArc
      ? ` FACIAL EXPRESSION LOCK (Clip ${options.clipNumber} — ${expArc.label}): draw the face with ${options.position === "end" ? expArc.end : expArc.start}; never copy the character blueprint's neutral/default expression.`
      : realistic
        ? " FACIAL EXPRESSION LOCK: keep a normal, alive, engaged real-person expression with lips firmly closed (never a blank, deadpan, or expressionless face; no exaggerated cartoon expressions, no open mouth, and no lip-sync)."
        : "";
    const silent = realistic
      ? `${whiteboard2dRule} Silent demonstrator: the character does not talk or lip-sync (keep a normal, alive, engaged facial expression with mouth firmly closed when the face is toward the camera; from behind, leave the face unseen; no greeting wave).${expStill}`
      : `${whiteboard2dRule} Silent demonstrator: the character does not talk or lip-sync (a vivid, expressive facial expression with active eyebrows and eyes and lips closed when the face is toward the camera; from behind, leave the face unseen; no greeting wave).${expStill}`;
    const labels =
      "Draw every beat title or diagram label written in 「」 as ordinary writing on that object, clearly readable. Those words are not the subtitle.";
    const spec = options.action ? ACTION_BY_NAME.get(options.action) : undefined;
    if (spec && options.position) {
      return [
        silent,
        spec[options.position],
        `Keep the character on the side of the frame the Scene names. ${cameraMatch} Draw every teaching element named in the Scene — the explanation graph's lines, charts, shapes, icons, and the element of this action. Do not drop a named piece.`,
        labels,
        hook,
      ].filter(Boolean).join(" ");
    }
    return `${silent} Draw the before or after of this clip's one action as the Scene describes it, not a neutral standing pose: the hands act on the drawn element and it moves the way the Scene names; a jump has both feet off the ground, and a point toward the camera aims at the lens. They usually stay on the same side of the frame; they stand on the other side only when this scene is a rare left-to-right or right-to-left cross. The head may face left or the right. ${cameraMatch} Draw every teaching element named in the Scene, including the explanation graph and the element of this action. Do not drop a named piece. ${labels}${hook ? ` ${hook}` : ""}`;
  }
  const expArcNoCast = cartoonClipExpressionArc(options?.clipNumber, { realistic });
  const expNoCastLine = expArcNoCast
    ? ` FACIAL EXPRESSION LOCK (Clip ${options?.clipNumber} — ${expArcNoCast.label}): draw the character's face with ${options?.position === "end" ? expArcNoCast.end : expArcNoCast.start}.`
    : realistic
      ? " FACIAL EXPRESSION LOCK: keep a normal, alive, engaged real-person expression with lips firmly closed (never a blank, deadpan, or expressionless face; no exaggerated cartoon expressions or open mouth)."
      : "";
  const base = realistic
    ? `${whiteboard2dRule} Silent demonstrator: the character does not talk to the viewer (mouth firmly closed with a normal, alive, engaged facial expression, no greeting wave).${expNoCastLine} Draw every teaching element named in the Scene. The explanation graph is the primary graphic. Do not drop a named piece. Draw every beat title or diagram label written in 「」 as ordinary writing on that object, clearly readable. Those words are not the subtitle.`
    : `${whiteboard2dRule} Silent demonstrator: the character does not talk to the viewer (mouth closed or reacting with a vivid, expressive facial expression, no greeting wave).${expNoCastLine} Draw every teaching element named in the Scene. The explanation graph is the primary graphic. Do not drop a named piece. Draw every beat title or diagram label written in 「」 as ordinary writing on that object, clearly readable. Those words are not the subtitle.`;
  return hook ? `${base} ${hook}` : base;
}

function letteringKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.!?。！？'"“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Cartoon stills only. A 「」 label that repeats the Subtitle sentence is a second copy.
export function dropRepeatedSubtitleLabels(scene: string) {
  const quotes = [...scene.matchAll(/Subtitle(?:\s*\([^)]*\))?\s*:\s*"([^"]*)"/gi)].map((match) =>
    letteringKey(match[1] || ""),
  );
  if (!quotes.some(Boolean)) return scene;
  return scene
    .replace(/「([^」]*)」/g, (full, inner: string) =>
      quotes.includes(letteringKey(inner)) ? "" : full,
    )
    .replace(/[ \t]{2,}/g, " ");
}

// Appended to whiteboard-explainer clip videos; empty for every other director.
const SNAP_MOTION =
  "Animate this clip's one action as the two stills show it, in three beats with real human timing: a quick anticipation, the action snapping fast and sharp, then a small overshoot, a settle with a wobble, and continuous brisk whiteboard explainer visual effects (lines and arrows drawing across, chart bars or trend lines animating, shapes and objects popping in) while the graph responds. Speed changes within the clip like a real person; never one constant slow glide.";

const SMOOTH_MOTION =
  "Animate this clip's one action so it leaves the start still and lands on the described end scene. There is no end image. The move has a fast, energetic rhythm: it starts, accelerates through the change, then decelerates into the landing. The middle of the move is sharp and quick. The opening and the landing are slower. Show every in-between frame. The body, the hands, and any prop keep moving through that curve, accompanied by continuous on-screen whiteboard explainer visual effects every 1–1.5 seconds: connecting lines and directional arrows draw sharply between nodes, chart bars and trend lines animate briskly up or down, and rigid geometric shapes, icons, and conceptual objects slide or pop in to explain the concept—never leave the scene static for seconds. Whiteboard cardboard cutout physics: every prop, card, diagram piece, chart bar, shape, object, and label stays in one rigid flat cardboard piece—sliding cleanly and briskly in and out of the screen (from or to the frame edges) or snapping into place without morphing, warping, melting, or dissolving. Background and set planes stay rigid and never warp or transform; any camera push-in or zoom-out moves with a clean multi-plane parallax effect. A card flip rotates through its edge as a rigid card and does not pop from one face to the other. Do not stretch the action as one slow constant glide. Never skip a frame and never cut. The camera follows the motion already written, on the same accelerate-then-decelerate curve. The lettering painted on the start still stays fixed for the whole clip: no wipe, no rewrite, no new words.";

export function cartoonNarratorVideoLock(
  skillSlug?: string,
  options?: {
    hasCharacter?: boolean;
    action?: CartoonAction;
    clipNumber?: number;
    smoothMotion?: boolean;
    realistic?: boolean;
  },
) {
  if (!isDiagramExplainerSkill(skillSlug)) return "";
  const smooth = Boolean(options?.smoothMotion);
  const realistic = Boolean(options?.realistic);
  const canvas = explainerCanvasKind(skillSlug) ?? "whiteboard";
  const canvasVoice =
    canvas === "paper-cutout"
      ? "Keep the whole canvas edge-to-edge as a paper-cutout craft collage: thick irregular white scissor borders on every piece, colour hero on mono/kraft background cutouts, rigid paste motion (no morphing)."
      : "Keep the whole canvas edge-to-edge as a flat 2D whiteboard surface with the character in 2D on the whiteboard and the concept explained with 2D whiteboard drawings.";
  const voice =
    `Voice: an unseen off-screen narrator speaks every line aloud. The on-screen character never speaks or lip-syncs — lips stay firmly closed with zero mouth or jaw speech movement for the entire clip. Sound effects never replace the narrator. The clip is never silent. ${canvasVoice}`;
  const teachingMotion =
    "Animate every teaching element named in the Scene on its own beat, and move the camera to reveal that piece. Do not leave the extra concept pieces as a frozen background.";
  if (!options?.hasCharacter) {
    const graphHook =
      options?.clipNumber === 1
        ? smooth
          ? " HOOK CAMERA: play the one push drawn between the two stills so it accelerates through the change, then decelerates into the landing. The middle of that push is sharp and quick. Show every in-between frame. No skipped frame and no new angle."
          : " HOOK CAMERA: play the exaggerated zoom drawn between the two stills, sharp and fast, no slow glide and no blur."
        : "";
    const glide = smooth ? ` ${SMOOTH_MOTION}` : "";
    const noCastFace = realistic
      ? "Mouth stays firmly closed with a normal, alive, engaged facial expression (never a blank or deadpan stare; no exaggerated facial expressions and no lip-sync), and reacts naturally to the diagram or props."
      : "Mouth stays closed or shows vivid facial expressions (active eyebrows, expressive eyes, and clear emotional reactions), and reacts to the diagram or props.";
    return `${voice} ${noCastFace} ${teachingMotion}${glide}${graphHook}`;
  }
  const spec = options.action ? ACTION_BY_NAME.get(options.action) : undefined;
  const named = spec ? ` ${spec.video}` : "";
  const expArc = cartoonClipExpressionArc(options.clipNumber, { realistic });
  const expVideo = expArc
    ? ` Facial expression arc for Clip ${options.clipNumber}: ${expArc.video}.`
    : realistic
      ? " Keep the character's facial expression normal, alive, and engaged with lips firmly closed and zero jaw or mouth articulation (never a blank or deadpan stare; no exaggerated faces, no lip-sync)."
      : "";
  const hookFace = realistic ? "a normal, alive, engaged face with lips closed" : "a surprised face";
  const hook =
    options?.clipNumber === 1
      ? smooth
        ? ` HOOK CAMERA: play the one push drawn between the two stills so it accelerates through the change, then decelerates into the landing. The middle of that push is sharp and quick. Show every in-between frame. No skipped frame and no new angle. A close view shows ${hookFace}. The character stays silent.`
        : ` HOOK CAMERA: play the exaggerated move drawn between the two stills, sharp and fast in the first second, no slow glide and no blur. A close view shows ${hookFace}. The character stays silent.`
      : "";
  const beats = smooth ? SMOOTH_MOTION : SNAP_MOTION;
  const faceBeats = realistic
    ? "Keep a normal, alive, engaged facial expression (natural blinks, living eye focus, and a calm, relaxed, unforced neutral expression with softly closed lips at rest — never a forced or stiff closed-lip smile; never a blank or deadpan stare; never exaggerated eyebrows or grimaces) while the mouth stays softly closed with zero lip-sync."
    : "Give the character lively, expressive facial expression changes (animated eyebrows, expressive eyes, and clear emotional shifts) across the beats while the mouth stays closed.";
  return `${voice}${named} ${beats} ${teachingMotion} ${faceBeats}${expVideo} It must differ from the previous clip's action. Never slide the body upward, and do not turn the clip into a walk between two standing poses. Usually keep them on the same side. Cross from left to right or right to left only when the stills already show that rare lateral move. Match the camera angle in the stills (from the side, from above, from the front, or from behind as they turn around) and zoom in or out only if the stills change shot size. Do not repeat the previous clip's action.${hook}`;
}

export function dialogueQaDirectorBlock() {
  return [
    "This director requires exactly two attached character blueprints. Assign one as ASKER and one as ANSWERER. Do not invent a third character or a replacement hero.",
    "Use each character's attached name as NAME in every dialogue line (`NAME: \"line\"`). The ASKER speaks the questions; the ANSWERER speaks the answers. No unseen host or narrator explains anything.",
    "Each clip has ONE speaker (`NAME: \"line\"`). On a question clip only the asker's mouth lip-syncs with calm, restrained lip articulation and expressive facial acting (active eyebrows, expressive eyes, natural emotional shifts). On an answer clip only the answerer's mouth lip-syncs with calm, restrained lip articulation and expressive facial acting. The listener's mouth stays closed while their face actively reacts (brow raises, eye shifts, nods).",
  ].join(" ");
}

export function listicleDirectorBlock() {
  return [
    "This is a LISTICLE. Always turn the source into a numbered list of distinct items. Do not tell it as a story with no list, and do not drop items to fit a shorter preset.",
    "Show the items one by one. One item per clip until the item count passes the duration ceiling. Above that ceiling, put 2 items on a middle clip and reveal them one by one inside that clip (start highlights the first, end highlights the last). Use 3 on a clip only when pairs would still pass the ceiling. Never more than 3 on one clip. Item 1 and the last item each stay on their own clip when there are at least two item clips. If 3 per clip still passes the ceiling, keep 3 per clip and let the clip count run over the preset.",
    "Ceilings, counting the ending: micro 2 clips, short 4, punchy 6, full 10, auto 12.",
    "Clip 1 is a clear hook: empty setting, one large count, and the spoken line written as a subtitle. That spoken line is the largest text in the whole video, bigger than the count and bigger than any later title. No items, no checklist, and no extra props.",
    "Then introduce items one by one. An item clip holds only that item's number, a short title (the name, not the spoken sentence), and one object. When a host or character is in frame, give them a vivid, expressive facial reaction to the item while their mouth stays closed (no lip-sync, never a blank face). Each item clip uses a different camera angle and a different composition. Do not repeat the previous item's angle, shot size, or where the object sits. In order: low angle with the object huge in front; overhead looking down; a tight side close-up; a wide three-quarter with the object off-center; a dutch tilt close to the lens; an over-the-shoulder. Within one clip the start and end share that angle. Do not draw the other items or a side list.",
    "The last clip is required and is not an item clip. narrativeJob is `full list`. It is a clean full list: short titles only, evenly spaced on an empty background, every title readable, no host and no extra props. A packed clip's englishVo joins those item lines with ` | `.",
    "Every clip also shows that clip's spoken line as a subtitle in the selected text style, clear of the count, the item, and the full list. The subtitle does not replace those graphics. Ignore any earlier line that puts the whole list on every still or that forbids the subtitle.",
  ].join(" ");
}

export function comparisonCardDirectorBlock(aspectRatio: AspectRatio) {
  const split =
    comparisonSplitAxis(aspectRatio) === "left-right"
      ? "LEFT half then RIGHT half (16:9). Panel A is left, panel B is right."
      : "TOP half then BOTTOM half (9:16 or 1:1). Panel A is top, panel B is bottom.";
  return [
    "This is a COMPARISON CARD: every clip is one split frame of two views of the same subject.",
    split,
    "narrativeJob MUST be exactly `contrast: <panel A title> | <panel B title>`. Titles are short (about 2–5 words).",
    "Those two titles are the only on-canvas writing. Do not also caption the full voiceover.",
    "The hook names the contrast. Later clips may change what each half shows; the split stays. The last clip rests with both halves visible.",
    "A host is optional. If a character is attached, they may stand in one half or point across the split with a vivid, expressive facial expression reacting to the contrast while their mouth stays closed (no lip-sync), and must not cover either title.",
  ].join(" ");
}

// Surprise hook, then every later clip opens on the previous end still.
export function surpriseInterviewDirectorBlock() {
  return [
    "This is a SURPRISE INTERVIEW. Exactly one attached character. They speak every line to the camera. No second character and no screen recording.",
    "Clip 1 is the hook. Its length is 5–12 seconds from the spoken line, and at least 5 seconds. The person stays right-side up. The camera starts above the head, looking down, then drops downward while it snaps a zoom-in onto the surprised face. Sharp and clear: no blur, no slow glide, and do not flip the picture. The eyes and eyebrows move into a clear surprise while the mouth speaks one short hook with precise, restrained lip articulation and small natural jaw movement (no exaggerated wide-open mouth or excessive jaw swing). If the user pasted a script, that hook is the first sentence verbatim. If they gave only a concept, write the hook.",
    "Clip 2 and after: startScene copies the previous endScene. Same place, same camera angle, same crop, same body pose. Do not hard-cut to a new angle, and do not repeat the overhead zoom. Only the mouth (precise, restrained lip-sync with small natural jaw movement — no exaggerated mouth opening, no excessive jaw swing, no rubbery cheeks) and expressive upper-face reactions (animated eyebrows and expressive eyes) move.",
    "One idea per interview clip. The last clip rests. Each clip pins the spoken line in one place: top, middle, or bottom. Neighbouring clips do not share the place. Not a white subtitle bar. Letters stay upright. Lettering follows the selected text style. Do not invent a font, and do not copy typography from the visual style. No background music.",
  ].join(" ");
}

// Already dressed in the reference outfit. Each clip is a different camera move.
export function outfitReelDirectorBlock() {
  return [
    "This is an OUTFIT REEL. Exactly one attached character. She is already fully dressed in clip 1 and stays in that same outfit for every clip. Do not write her putting clothes on, taking clothes off, or changing garments.",
    "Clothes must follow the clothing reference images 100 percent: same style, cut, colour, pattern, and details. Copy every piece the photos show. Do not redesign, recolor, drop, or add a piece. If no clothing reference is attached, ask for the photos and stop. Do not invent clothes from the brief sentence.",
    "The person in a clothing photo is not the character. Never copy their face, hair, hair length, haircut, skin, age, body, tattoos, pose, or room. Face, hair length, skin, age, and body stay on the character blueprint. Only the clothes change. She is energetic and happy in every clip: bright smile, lively expressive eyes, radiant facial expression, feet planted, no bounce.",
    "Do not add one clip per garment. Clip count follows the duration preset. Every clip shows the complete outfit. One room. Each clip is 5–12 seconds and one camera rotation. With no spoken line, durationSeconds is 5. Inside a clip the camera is one slow gimbal move on a single axis. Same pose, same distance, same subject size, and no handheld shake. The next clip is a hard cut to a different rotation.",
    "Default order is left to right, then top to bottom, then right to left, then bottom to top. Use a shuffle of that list each time you plan, and do not give two clips in a row the same rotation. Do not push, zoom, rise, or change the lens inside a clip. She stays planted. Head and shoes stay in frame.",
    "englishVo is \"(no dialogue)\" on every clip. No voiceover, no spoken line, no narrator. No background music. bgmDirection and every bgmSfx are one sound effect only.",
  ].join(" ");
}

// Same empty white room, locked camera. Each clip hard-cuts to a new complete look.
export function outfitChangeDirectorBlock() {
  return [
    "This is an OUTFIT CHANGE lookbook. Exactly one attached character. Each clip is already fully dressed in THAT clip's complete look. Do not write her putting clothes on, taking clothes off, or changing garments inside a clip.",
    "Clothes must follow the clothing reference assigned to that clip 100 percent: same style, cut, colour, pattern, and details. Copy every piece the photo shows. Do not redesign, recolor, drop, or add a piece. If no clothing reference is attached, ask for the photos and stop. Do not invent clothes from the brief sentence.",
    "The person in a clothing photo is not the character. Never copy their face, hair, hair length, haircut, skin, age, body, tattoos, pose, or room. Face, hair length, skin, age, and body stay on the character blueprint. Only the clothes change. She is calm and editorial in every clip: soft closed-mouth expression, eyes to camera, feet planted, no bounce and no bright grin.",
    "One empty cream-white room: plain wall, no furniture, no window props, no shelf. The camera is locked for the whole video: eye-level three-quarter, waist-up to mid-thigh, centered, same crop, same subject size. No gimbal rotation, no push, no zoom, no handheld shake.",
    "Clip count follows the duration preset. Prefer one clothing photo per clip. If the brief asks buttoned or unbuttoned of the same piece, alternate those two styling variants. The next clip is a hard cut to a different complete look, not a camera move on the same outfit.",
    "englishVo is \"(no dialogue)\" on every clip. No voiceover, no spoken line, no narrator. No background music. bgmDirection and every bgmSfx are one sound effect only.",
  ].join(" ");
}

export function streetLookbookDirectorBlock() {
  return [
    "This is a STREET FASHION LOOKBOOK (Esquire / Paris Fashion Week clothing demo). Exactly one attached character. In every clip, the character is already dressed in the complete outfit from that clip's assigned clothing reference image (`referenceImageIds`). Never copy the face, hair, or body of the model inside the clothing photo — face, hair, non-reflective matte skin texture, and proportions stay 100% on the character blueprint, while garments (cut, silhouette, collar/lapel structure, buttons/toggles, fabric weight, trousers, and boots/shoes) match the clothing reference 100%.",
    "Stage the lookbook across textured urban architectural locations in natural daylight (stone steps, iron canal bridge railing, European street façade with street sign, vintage lamppost) and cycle through 3 distinct editorial camera framings across clips: (1) `full-body-silhouette` (low-angle or eye-level full-body showing head-to-toe garment drape and trousers/footwear, seated on stone steps or leaning on a lamppost/wall), (2) `medium-garment-detail` (waist-up or chest-up profile/3-4 shot highlighting collar structure, knit/fabric weave, toggle closures, and layering as the character leans on a bridge railing or holds the coat collar up near their chin), and (3) `back-over-shoulder` (medium 3/4 back view showing rear tailoring or a coat draped over one shoulder while turning the head in profile).",
    "Maintain a cool, contemplative, editorial demeanour: mostly off-camera pensive gazes with one calm direct-to-lens look, and composed micro-actions (hand resting on chin, one hand in coat pocket, arms crossed leaning against a pole, or holding up a coat collar). The mouth stays softly closed at all times (zero lip-sync). `englishVo` MUST be \"(no dialogue)\" on every clip.",
  ].join(" ");
}

// One third-person action, each start copied from the previous end.
export function followShotDirectorBlock() {
  return [
    "This is a FOLLOW SHOT. Exactly one attached character, filmed third-person, already in motion. This is not an interview.",
    "Each clip is 5–12 seconds, set by any spoken line and the pace, or 5 seconds when there is no dialogue. It contains one beat: a few steps, one turn, or one gesture, with a vivid, expressive facial expression matching the beat. The character stays a similar size. The background shifts only a little. Do not scroll a whole street past the lens.",
    "Clip 2 and after: startScene copies the previous endScene. Same place, same clothes, same camera angle, same body position. Do not change angle between clips.",
    "Clothes stay as they are. No whip pan, no new setup, and no required crowd.",
    "No narrator. Default englishVo is \"(no dialogue)\". Use one short line only if the user wrote one. The last clip stops and rests.",
  ].join(" ");
}

export function talkingBrollDirectorBlock() {
  return [
    "This is TALKING-HEAD WITH B-ROLL. The rhythm is fixed: two on-camera lines, then one B-roll cutaway, then back to the same on-camera setup. Repeat until the source is covered. Never open on B-roll.",
    "narrativeJob is only `on-camera` or `b-roll`.",
    "On-camera (`on-camera`): the one attached character, medium close-up, eyes to the lens, speaking `englishVo` on camera with calm, restrained lip articulation and natural facial expressions, same background and light as the first on-camera clip.",
    "B-roll (`b-roll`): the character is not on screen. Show the concrete thing the previous two lines just named. englishVo is one short off-screen line spoken by the character's voiceover or \"(no dialogue)\".",
    "Override clip inheritance for this director: a b-roll startScene is a new place, not the talking-head room. The next on-camera clip returns to the first on-camera setup, not the b-roll ending.",
  ].join(" ");
}

export function editorialInterviewDirectorBlock() {
  return [
    "This is an EDITORIAL PROFILE INTERVIEW (Esquire / GQ / Monocle style). The protagonist delivers a calm, reflective first-person monologue across a 3-act arc: Act 1 (personal craft & devotion to detail) → Act 2 (how that standard shapes their daily routine & tactile product craft) → Act 3 (effortless hands-on experience & closing signature aphorism).",
    "narrativeJob MUST begin with either `interview-a-roll` or `lifestyle-b-roll`. Clip 1 and the final clip MUST be `interview-a-roll`. Alternate rhythmically between `interview-a-roll` and `lifestyle-b-roll`.",
    "In every `interview-a-roll` clip: stage the protagonist seated in one consistent high-end architectural space (e.g. sunlit harbour-view suite or designer studio), framed waist-up or chest-up using the rule of thirds, looking 15 degrees off-camera toward an unseen interviewer beside the lens (never staring dead-center into the lens like a selfie), speaking `englishVo` on camera with calm, restrained lip articulation and composed hand gestures (or holding the attached product at chest height when discussing it).",
    "In every `lifestyle-b-roll` clip: show the protagonist in action (practicing their craft such as playing an instrument or working, standing in silhouette looking out a floor-to-ceiling harbour window, inspecting the attached product's metal/material craft up close, or using the product in their morning routine). During `lifestyle-b-roll`, the protagonist's mouth stays firmly closed (zero lip-sync) while their first-person voiceover (`englishVo`) continues seamlessly off-screen.",
  ].join(" ");
}

export function workflowPromoDirectorBlock() {
  return [
    "This is a WORKFLOW & ROI PROMO. Never hardcode a dark void, whiteboard, or specific colour hexes — all canvas surfaces, line rendering, lighting, and palette come 100% from the selected visual style.",
    "Structure: Clip 1 opens with a pattern-interrupt hook in Beat 1 (startScene / startVo) and snaps into a bold thesis over the old messy workflow in Beat 2 (endScene / endVo). Middle clips walk linearly through the 3-step workflow (Step 1 → Step 2 → Step 3) with numbered step cards or pipeline nodes inside the chosen visual style, using short labels in 「」 (1–3 words). The final clip shows the finished deliverable inside a device frame with rising ROI/analytics indicators in Beat 1, then settles onto a clean brand sign-off card in Beat 2.",
    "Voiceover is spoken by an energetic unseen off-screen narrator across both beats. On-screen characters keep their mouths closed (no lip-sync) with expressive brow and eye reactions while interacting with workflow cards and devices.",
  ].join(" ");
}

export function styleSwitchDirectorBlock(styles: Array<{ id: string; name: string }>) {
  const styleList = styles.length > 0
    ? styles.map((s, i) => `Style #${i + 1}: id="${s.id}" (${s.name})`).join("; ")
    : "Style #1: default style";
  const idsOnly = styles.map((s) => `"${s.id}"`).join(", ");
  return [
    `This is a MULTI-STYLE CHARACTER SHOWCASE. The user selected ${styles.length || 1} visual style(s): ${styleList}.`,
    `Every clip row in clips MUST set the "styleId" field to one of [${idsOnly}].`,
    "Clip 1 MUST use Style #1 (the first style in the list) for the opening hook. Subsequent clips MUST cycle through the remaining selected styles in order so each clip hard-cuts into a contrasting visual world while keeping the character's identity (face, hair, eyewear/accessories, and core outfit design) 100% locked to the attached character blueprint.",
    "Do not write contradicting style rendering rules inside startScene or endScene — let each clip's assigned styleId govern the rendering medium while your scene description defines the character pose, expression, environment, lighting, and camera.",
  ].join(" ");
}

