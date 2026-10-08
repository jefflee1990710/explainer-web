import type { AspectRatio, DurationPreset, SpeechPace } from "@/model/project";
import { DURATION_PRESETS } from "@/service/director/duration-presets";
import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import {
  FOLLOW_SHOT_SKILL_SLUG,
  isFollowShotSkill,
  isOutfitReelSkill,
  isSurpriseInterviewSkill,
  OUTFIT_REEL_SKILL_SLUG,
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
export {
  FOLLOW_SHOT_SKILL_SLUG,
  OUTFIT_REEL_SKILL_SLUG,
  SURPRISE_INTERVIEW_SKILL_SLUG,
  isFollowShotSkill,
  isOutfitReelSkill,
  isSurpriseInterviewSkill,
};

// Opening / Ending bookends. Auto keeps the skill's 1×3–4s sting; a chosen length does not.
const BOOKEND_SKILLS = new Set([OPENING_SKILL_SLUG, ENDING_SKILL_SLUG]);
export const BOOKEND_MIN_SECONDS = 3;
export const BOOKEND_MAX_SECONDS = 4;

export function isBookendSkill(skillSlug?: string) {
  return Boolean(skillSlug && BOOKEND_SKILLS.has(skillSlug));
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

// Clamp a bookend storyboard to its single 3–4s clip.
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
        ? "This is an OPENING bookend: a 3–4 second brand sting that plays before the main video. The logo arrives and settles."
        : "This is an OPENING bookend: a brand sting that plays before the main video. The logo arrives and settles."
      : lockLength
        ? "This is an ENDING bookend: a 3–4 second brand sting that closes the video. The scene resolves onto the logo as the final resting card."
        : "This is an ENDING bookend: a brand sting that closes the video. The scene resolves onto the logo as the final resting card.",
    lockLength
      ? "Produce exactly ONE clip. Never add a second clip, a story, or an explainer beat."
      : "Follow the duration preset for clip count and each clip's length. This remains a brand sting, not a full explainer story.",
    hasLogo
      ? "The brand logo image is attached. It is the hero of both stills: startScene and endScene must name the logo, its placement (centered unless stated), and its size. Never redraw, restyle, translate, or invent a different logo or wordmark."
      : "No logo image is attached: build the sting around the brand or product name from the source as title lettering in the selected text style. Do not copy typography from the visual style.",
    opening
      ? "startScene: the logo is hidden, small, or forming (drawn on, assembled from shapes, revealed behind a prop). endScene: the full logo, crisp and readable, centered."
      : "startScene: the closing beat of the world (character or props wrapping up). endScene: the full logo centered on a calm canvas as the final card.",
    lockLength
      ? "motionCamera is one simple move that fits 3–4 seconds (reveal, pop, settle, or slow push-in). No cuts."
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

// Directors whose audio is character dialogue only: no narrator, no voice picker.
const DIALOGUE_ONLY_SKILLS = new Set([STORY_SHORT_SKILL_SLUG, DIALOGUE_QA_SKILL_SLUG]);

export function skillBansNarration(skillSlug?: string) {
  return Boolean(skillSlug && DIALOGUE_ONLY_SKILLS.has(skillSlug));
}

export function requiredCastCount(skillSlug?: string) {
  if (skillSlug === DIALOGUE_QA_SKILL_SLUG) return 2;
  if (
    isTalkingHeadSkill(skillSlug) ||
    skillSlug === TALKING_BROLL_SKILL_SLUG ||
    isSurpriseInterviewSkill(skillSlug) ||
    isOutfitReelSkill(skillSlug) ||
    isFollowShotSkill(skillSlug)
  ) {
    return 1;
  }
  return 0;
}

export function isComparisonCardSkill(skillSlug?: string) {
  return skillSlug === COMPARISON_CARD_SKILL_SLUG;
}

export function isTalkingBrollSkill(skillSlug?: string) {
  return skillSlug === TALKING_BROLL_SKILL_SLUG;
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
  return skillSlug === LISTICLE_SKILL_SLUG;
}

// 白板概念解說：畫面文字 OFF 只代表「不做旁白字幕」；場景內的短手寫標籤
// （黃色 tag、箭頭字、道具名，1–3 個字）是這個風格的核心視覺語彙，仍然允許。
export function skillAllowsInWorldLabels(skillSlug?: string) {
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

// Shared by every dialogue-only director (story short, Q&A).
export function dialogueOnlyDirectorBlock() {
  return [
    'There is NO narrator and NO third-person voiceover. The narrator field must start with "No narrator — characters speak." Then paste each supplied voice lock verbatim, one speaker per sentence. A speaker without their own lock uses the project voice lock verbatim. Do not invent a timbre and do not leave a speaker out.',
    'englishVo is only character dialogue written as NAME: "line", in the chosen dialogue language. Multiple speakers are allowed. A silent beat is "(no dialogue)".',
    "motionCamera names who is speaking. That character's mouth lip-syncs every syllable of their line. Every other on-screen character keeps their mouth closed and only reacts.",
  ].join(" ");
}

export function storyShortDirectorBlock() {
  return [
    "This is a SHORT FILM, not an explainer.",
    "Do not force want → obstacle → turn → resolution. Arrange clips in the order the source already tells; invent beats only when the source has no story of its own.",
    "Film every clip as a third-person observer camera: characters live inside the scene and never look at or talk to the camera. They speak to each other, to an object, or to themselves. Describe eyelines in explainerScene and motionCamera (profile, three-quarter, over-the-shoulder).",
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

// Clip 1 only. The two stills must show the before and after, or the video will not move the lens.
export function cartoonHookCameraRule(hasCharacter: boolean) {
  if (!hasCharacter) {
    return "Clip 1 is the hook and always uses one exaggerated camera on the graph, sharp and fast, no slow glide and no blur: a snap zoom into the key node, or a snap zoom out from that node to the whole chart. The start still and the end still use different shot sizes. Later clips do not repeat this hook camera.";
  }
  return "Clip 1 is the hook and always uses exactly one exaggerated camera move, sharp and fast in the first second, no slow glide and no blur. Pick one, and do not use the same move every video: a snap zoom in from a wider shot to the surprised face; a snap zoom out from the surprised face to the full body and the graph; a fast 360 orbit around the character that ends on the opposite side; an overhead drop from looking down onto an eye-level surprised face; a crash push from far across the canvas into a close-up as the graph rushes past; a dutch snap from a tilted close-up into an upright wider view. Write that before and after in each still's Camera line, so shot size or angle differs. Surprise is a facial expression only. The character stays silent. Later clips do not repeat this hook camera.";
}

function directorActionMenu() {
  return MENU_ORDER.map((action) => ACTION_BY_NAME.get(action)!)
    .map((spec) => `${spec.action} (${spec.meaning}; write "${spec.cue}"): ${spec.director}`)
    .join("; ");
}

export function cartoonExplainerDirectorBlock(options?: { hasCharacter?: boolean }) {
  const hasCharacter = Boolean(options?.hasCharacter);
  return [
    "This director is ALWAYS narrated: an unseen off-screen narrator speaks every englishVo line in the third person.",
    "The on-screen character never speaks, never introduces themself, and is never the narrator. No first-person lines in the character's voice (no \"Hi, I'm Scro\", \"I am…\", \"we…\" spoken as the character); the narrator may name the character or product in the third person (\"Meet Scro. Scro turns…\").",
    hasCharacter
      ? `A character is on screen. Each clip has exactly one primary body action, chosen from this list by what the clip's line means. Each entry gives the meaning, the word motionCamera's first beat must use, and the before then after of the two stills: ${directorActionMenu()}. Do not reuse an action from either of the previous two clips. Use jump at most once per video, on the key beat. The last clip never points toward the camera. Pick another action that matches the last line, and keep the hands on the graph. A different standing position, a few steps, or a walk is not a new action.`
      : "The character is a silent demonstrator: no greeting wave or talking to the viewer, mouth closed or reacting. It may point at a diagram, stand aside reacting, or handle props — it does not have to hold three props.",
    hasCharacter
      ? "Alternate the starting side: if one clip starts on the left side, the next starts on the right side (the first clip's side is free, not always left). About 80% of clips keep them on that same side for the whole clip — do not walk them from left to right every time. Only about 20% of clips are a full cross, either left to right or right to left, and those rare crosses do not all go the same way. The head may turn. Every clip still changes their body (arms, hands, torso, and legs) and facial expression. Camera angle changes every clip and does not repeat: from the character's left side, from above, from the front, or from behind as they turn around, and it may zoom in or out. One continuous move, no cut and no teleport. They stay silent — expression only, no lip-sync and no greeting wave."
      : "",
    hasCharacter
      ? "For every topic, keep an explanation graph and add the drawn element this clip's action works on. Do not reuse the same camera angle on the next clip. A full left-to-right or right-to-left walk is rare and does not count as the primary action. Map the claim onto a comparison, before/after, cause→effect chain, numbered steps, labeled parts, flow, or a simple chart. Never a near-empty canvas."
      : "For every topic, make an explanation graph the main subject of the canvas — not a character holding metaphor props. Map the claim onto a comparison, before/after, cause→effect chain, numbered steps, labeled parts of a whole, flow or cycle, or a simple chart. Topic does not matter: food, money, health, product, habit, or science all get a graph. Metaphor props (boxes, bins, arrows, yellow tags) are only a fallback when a graph would hide the idea. Density is the graph — never a three-prop quota. Never a near-empty canvas with one floating label.",
    hasCharacter
      ? "startScene and endScene are the before and after of that one action as listed, not two standing poses. They usually stay on the same side; they finish on the opposite side only on a rare lateral cross. Do not write that the character stands in both stills. The travel lives only in motionCamera."
      : "",
    hasCharacter
      ? "When the action moves an element (every action except jump and point toward the camera), write the same element in both startScene and endScene inside 1) Character, with where it sits relative to the hands and where its destination is (the slot, bin, stack, socket, or graph node). In endScene the element is still visible. Never write that it vanished, was swallowed, or is entirely inside something."
      : "",
    hasCharacter
      ? "motionCamera plays the action in three beats with real human timing, never one constant speed: a quick anticipation (wind-up or crouch, about a quarter to half a second), the action snapping fast and sharp (well under a second), then a small overshoot, a settle with a wobble, and a short hold while the graph responds (a node lights up, an arrow draws itself on, a counter ticks up). Timestamp each beat. Never describe the body as moving smoothly, slowly, gently, or steadily. Clip 1 opens already moving: its startScene is the wound-up pose of its action, so the first second has motion."
      : "",
    cartoonHookCameraRule(hasCharacter),
    "On-canvas beat text is allowed: write one short beat title that names this clip's idea, plus diagram labels, node names, and arrow names inside 「」 in startScene and endScene. Do not dump the full voiceover into those fields; the still prompt adds startVo / endVo lettering separately.",
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
  options?: { hasCharacter?: boolean; action?: CartoonAction; position?: "start" | "end"; clipNumber?: number },
) {
  if (skillSlug !== CARTOON_EXPLAINER_SKILL_SLUG) return "";
  const hook =
    options?.clipNumber === 1
      ? "HOOK CAMERA: this still uses the exaggerated framing named in the Scene. Shot size or angle differs from the other still of Clip 1. A close view shows a surprised face."
      : "";
  if (options?.hasCharacter) {
    const silent =
      "Silent demonstrator: the character does not talk or lip-sync (a readable facial expression is required; no greeting wave).";
    const labels = "Draw every beat title or diagram label written in 「」, clearly readable.";
    const spec = options.action ? ACTION_BY_NAME.get(options.action) : undefined;
    if (spec && options.position) {
      return [
        silent,
        spec[options.position],
        "Keep the character on the side of the frame the Scene names. Camera angle may differ from the other still. Draw the explanation graph plus the element of this action.",
        labels,
        hook,
      ].filter(Boolean).join(" ");
    }
    return `${silent} Draw the before or after of this clip's one action as the Scene describes it, not a neutral standing pose: the hands act on the drawn element and it moves the way the Scene names; a jump has both feet off the ground, and a point toward the camera aims at the lens. They usually stay on the same side of the frame; they stand on the other side only when this scene is a rare left-to-right or right-to-left cross. The head may face left or the right. Camera angle may differ from the other still. Draw the explanation graph plus the element of this action. ${labels}${hook ? ` ${hook}` : ""}`;
  }
  const base = "Silent demonstrator: the character does not talk to the viewer (mouth closed or reacting, no greeting wave). Draw the explanation graph named in the Scene as the primary graphic. Draw every prop and every beat title or diagram label written in 「」, clearly readable.";
  return hook ? `${base} ${hook}` : base;
}

// Appended to whiteboard-explainer clip videos; empty for every other director.
export function cartoonNarratorVideoLock(
  skillSlug?: string,
  options?: { hasCharacter?: boolean; action?: CartoonAction; clipNumber?: number },
) {
  if (skillSlug !== CARTOON_EXPLAINER_SKILL_SLUG) return "";
  const voice =
    "Voice: an unseen off-screen narrator speaks every line aloud. The on-screen character never speaks or lip-syncs. Sound effects never replace the narrator. The clip is never silent.";
  if (!options?.hasCharacter) {
    const graphHook =
      options?.clipNumber === 1
        ? " HOOK CAMERA: play the exaggerated zoom drawn between the two stills, sharp and fast, no slow glide and no blur."
        : "";
    return `${voice} Mouth stays closed or shows simple reactions, and reacts to the diagram or props.${graphHook}`;
  }
  const spec = options.action ? ACTION_BY_NAME.get(options.action) : undefined;
  const named = spec ? ` ${spec.video}` : "";
  const hook =
    options?.clipNumber === 1
      ? " HOOK CAMERA: play the exaggerated move drawn between the two stills, sharp and fast in the first second, no slow glide and no blur. A close view shows a surprised face. The character stays silent."
      : "";
  return `${voice}${named} Animate this clip's one action as the two stills show it, in three beats with real human timing: a quick anticipation, the action snapping fast and sharp, then a small overshoot, a settle with a wobble, and a short hold while the graph responds. Speed changes within the clip like a real person; never one constant slow glide. It must differ from the previous clip's action. Never slide the body upward, and do not turn the clip into a walk between two standing poses. Usually keep them on the same side. Cross from left to right or right to left only when the stills already show that rare lateral move. Match the camera angle in the stills (from the side, from above, from the front, or from behind as they turn around) and zoom in or out only if the stills change shot size. Do not repeat the previous clip's action.${hook}`;
}

export function dialogueQaDirectorBlock() {
  return [
    "This director requires exactly two attached character blueprints. Assign one as ASKER and one as ANSWERER. Do not invent a third character or a replacement hero.",
    "Use each character's attached name as NAME in every dialogue line. The ASKER speaks the questions; the ANSWERER speaks the answers. No unseen host or narrator explains anything.",
    "On a question clip only the asker's mouth moves. On an answer clip only the answerer's mouth moves. The listener's mouth stays closed.",
  ].join(" ");
}

export function listicleDirectorBlock() {
  return [
    "This is a LISTICLE. Always turn the source into a numbered list of distinct items. Do not tell it as a story with no list, and do not drop items to fit a shorter preset.",
    "Show the items one by one. One item per clip until the item count passes the duration ceiling. Above that ceiling, put 2 items on a middle clip and reveal them one by one inside that clip (start highlights the first, end highlights the last). Use 3 on a clip only when pairs would still pass the ceiling. Never more than 3 on one clip. Item 1 and the last item each stay on their own clip when there are at least two item clips. If 3 per clip still passes the ceiling, keep 3 per clip and let the clip count run over the preset.",
    "Ceilings, counting the ending: micro 2 clips, short 4, punchy 6, full 10, auto 12.",
    "Clip 1 is a clear hook: empty setting, one large count, and the spoken line written as a subtitle. Both must be readable. No items, no checklist, and no extra props.",
    "Then introduce items one by one. An item clip holds only that item's number, a short title (the name, not the spoken sentence), and one object, with empty space around them. Do not draw the other items or a side list.",
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
    "A host is optional. If a character is attached, they may stand in one half or point across the split, and must not cover either title.",
  ].join(" ");
}

// Surprise close-up, then a seated interview that chains from clip 3.
export function surpriseInterviewDirectorBlock() {
  return [
    "This is a SURPRISE INTERVIEW. Exactly one attached character. They speak every line to the camera. No second character and no screen recording.",
    "Clip 1 is the hook, 3–4 seconds. The person stays right-side up. The camera starts above the head, looking down, then drops downward while it snaps a zoom-in onto the surprised face. Sharp and clear: no blur, no slow glide, and do not flip the picture. The face moves into a clear surprise and says one short hook. If the user pasted a script, that hook is the first sentence verbatim. If they gave only a concept, write the hook.",
    "Clip 2 and after each hard-cut to a different camera angle and a different body pose. Do not copy the previous clip's framing, and do not copy the overhead zoom. Within a clip the angle and the pose stay locked. Only the mouth and expression move.",
    "One idea per interview clip. The last clip rests. Each clip pins the spoken line in one place: top, middle, or bottom. Neighbouring clips do not share the place. Not a white subtitle bar. Letters stay upright. Lettering follows the selected text style. Do not invent a font, and do not copy typography from the visual style. No background music.",
  ].join(" ");
}

// Already dressed in the reference outfit. Each clip is a different camera move.
export function outfitReelDirectorBlock() {
  return [
    "This is an OUTFIT REEL. Exactly one attached character. She is already fully dressed in clip 1 and stays in that same outfit for every clip. Do not write her putting clothes on, taking clothes off, or changing garments.",
    "Clothes must follow the clothing reference images 100 percent: same style, cut, colour, pattern, and details. Copy every piece the photos show. Do not redesign, recolor, drop, or add a piece. If no clothing reference is attached, ask for the photos and stop. Do not invent clothes from the brief sentence.",
    "The person in a clothing photo is not the character. Never copy their face, hair, hair length, haircut, skin, age, body, tattoos, pose, or room. Face, hair length, skin, age, and body stay on the character blueprint. Only the clothes change. She is energetic and happy in every clip: bright smile, lively eyes, feet planted, no bounce.",
    "Do not add one clip per garment. Clip count follows the duration preset. Every clip shows the complete outfit. One room. Each clip is 3–4 seconds and one camera rotation. Inside a clip the camera is one slow gimbal move on a single axis. Same pose, same distance, same subject size, and no handheld shake. The next clip is a hard cut to a different rotation.",
    "Default order is left to right, then top to bottom, then right to left, then bottom to top. Use a shuffle of that list each time you plan, and do not give two clips in a row the same rotation. Do not push, zoom, rise, or change the lens inside a clip. She stays planted. Head and shoes stay in frame.",
    "englishVo is \"(no dialogue)\" on every clip. No voiceover, no spoken line, no narrator. No background music. bgmDirection and every bgmSfx are one sound effect only.",
  ].join(" ");
}

// One third-person action, each start copied from the previous end.
export function followShotDirectorBlock() {
  return [
    "This is a FOLLOW SHOT. Exactly one attached character, filmed third-person, already in motion. This is not an interview.",
    "Each clip is 3–6 seconds and contains one beat: a few steps, one turn, or one gesture. The character stays a similar size. The background shifts only a little. Do not scroll a whole street past the lens.",
    "Clip 2 and after: startScene copies the previous endScene. Same place, same clothes, same camera angle, same body position. Do not change angle between clips.",
    "Clothes stay as they are. No whip pan, no new setup, and no required crowd.",
    "No narrator. Default englishVo is \"(no dialogue)\". Use one short line only if the user wrote one. The last clip stops and rests.",
  ].join(" ");
}

export function talkingBrollDirectorBlock() {
  return [
    "This is TALKING-HEAD WITH B-ROLL. The rhythm is fixed: two on-camera lines, then one B-roll cutaway, then back to the same on-camera setup. Repeat until the source is covered. Never open on B-roll.",
    "narrativeJob is only `on-camera` or `b-roll`.",
    "On-camera: the one attached character, medium close-up, eyes to the lens, same background and light as the first on-camera clip. They speak englishVo.",
    "B-roll: the character is not on screen. Show the concrete thing the previous two lines just named. englishVo is one short off-screen line or \"(no dialogue)\".",
    "Override clip inheritance for this director: a b-roll startScene is a new place, not the talking-head room. The next on-camera clip returns to the first on-camera setup, not the b-roll ending.",
  ].join(" ");
}
