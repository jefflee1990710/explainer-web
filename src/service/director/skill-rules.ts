import type { AspectRatio, DurationPreset, SpeechPace } from "@/model/project";
import { DURATION_PRESETS } from "@/service/director/duration-presets";
import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";
import { talkingHeadDurationHint, TALKING_HEAD_SKILL_SLUG } from "@/service/director/talking-head";

export const STORY_SHORT_SKILL_SLUG = "story-short-director";
export const DIALOGUE_QA_SKILL_SLUG = "dialogue-qa-director";
export const LISTICLE_SKILL_SLUG = "listicle-director";
export const OPENING_SKILL_SLUG = "opening-director";
export const ENDING_SKILL_SLUG = "ending-director";
export const COMPARISON_CARD_SKILL_SLUG = "comparison-card-director";
export const TALKING_BROLL_SKILL_SLUG = "talking-broll-director";

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
  if (input.skillSlug === TALKING_HEAD_SKILL_SLUG) return talkingHeadDurationHint(input.speechPace);
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
      : "No logo image is attached: build the sting around the brand or product name from the source as clean title lettering.",
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
  if (skillSlug === TALKING_HEAD_SKILL_SLUG || skillSlug === TALKING_BROLL_SKILL_SLUG) return 1;
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
  return /hook|outro|intro|開場|結尾|收束/i.test(job);
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
    'There is NO narrator and NO third-person voiceover. The narrator field must start with "No narrator — characters speak." and may then describe each speaker\'s voice.',
    'englishVo is only character dialogue written as NAME: "line", in the chosen dialogue language. Multiple speakers are allowed. A silent beat is "(no dialogue)".',
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

// 白板概念解說：永遠是畫外旁白；角色不說話。有角色時每個鏡頭只做一種主動作，下一鏡換另一種。
export function cartoonExplainerDirectorBlock(options?: { hasCharacter?: boolean }) {
  const hasCharacter = Boolean(options?.hasCharacter);
  return [
    "This director is ALWAYS narrated: an unseen off-screen narrator speaks every englishVo line in the third person.",
    "The on-screen character never speaks, never introduces themself, and is never the narrator. No first-person lines in the character's voice (no \"Hi, I'm Scro\", \"I am…\", \"we…\" spoken as the character); the narrator may name the character or product in the third person (\"Meet Scro. Scro turns…\").",
    hasCharacter
      ? "A character is on screen. Give every clip a fresh idea and do not repeat the previous clip's performance or camera. Each clip has exactly one primary body action, and the next clip must use a different one. Rotate through these four and never repeat the previous clip: push a drawn element (hands on it, arms extend, it moves away from the body), pull a drawn element (hands grab it and draw it toward the body), jump (crouch, both feet leave the ground, then land — never slide the body upward), or point toward the camera (one arm reaches at the lens, fingertip aimed at the viewer, not at a side graphic). A different standing position, a few steps, or a walk is not a new action. Alternate the starting side: if one clip starts on the left side, the next starts on the right side (the first clip's side is free, not always left). About 80% of clips keep them on that same side for the whole clip — do not walk them from left to right every time. Only about 20% of clips are a full cross, either left to right or right to left, and those rare crosses do not all go the same way. The head may turn. Every clip still changes their body (arms, hands, torso, and legs) and facial expression. Camera angle changes every clip and does not repeat: from the character's left side, from above, from the front, or from behind as they turn around, and it may zoom in or out. One continuous move, no cut and no teleport. They stay silent — expression only, no lip-sync and no greeting wave."
      : "The character is a silent demonstrator: no greeting wave or talking to the viewer, mouth closed or reacting. It may point at a diagram, stand aside reacting, or handle props — it does not have to hold three props.",
    hasCharacter
      ? "For every topic, keep an explanation graph and add the drawn element this clip pushes, pulls, jumps beside, or points past toward the camera. Do not reuse the same action or the same camera angle on the next clip. A full left-to-right or right-to-left walk is rare and does not count as the primary action. Map the claim onto a comparison, before/after, cause→effect chain, numbered steps, labeled parts, flow, or a simple chart. Never a near-empty canvas."
      : "For every topic, make an explanation graph the main subject of the canvas — not a character holding metaphor props. Map the claim onto a comparison, before/after, cause→effect chain, numbered steps, labeled parts of a whole, flow or cycle, or a simple chart. Topic does not matter: food, money, health, product, habit, or science all get a graph. Metaphor props (boxes, bins, arrows, yellow tags) are only a fallback when a graph would hide the idea. Density is the graph — never a three-prop quota. Never a near-empty canvas with one floating label.",
    hasCharacter
      ? "startScene and endScene are the before and after of that one action, not two standing poses. Push: arms loaded on the element, then arms extended and the element farther away. Pull: arms reaching, then the element closer with the arms drawn in. Jump: one still has both feet off the ground. Point toward the camera: one still has the arm down, the other has the arm aimed at the lens. They usually stay on the same side; they finish on the opposite side only on a rare lateral cross. Do not write that the character stands in both stills. The travel lives only in motionCamera, and the first beat names the verb (push, pull, jump, or point toward the camera)."
      : "",
    hasCharacter
      ? "For a push or a pull, write the same element in both startScene and endScene inside 1) Character, with where it sits relative to the character's hands and which side of the character its destination is on (the slot, box, or graph node it moves toward). In endScene the element is still visible, farther away for a push and closer for a pull. Never write that it vanished, was swallowed, or is entirely inside something."
      : "",
    "On-canvas beat text is allowed: write one short beat title that names this clip's idea, plus diagram labels, node names, and arrow names inside 「」 in startScene and endScene. Do not dump the full voiceover into those fields; the still prompt adds startVo / endVo lettering separately.",
  ]
    .filter(Boolean)
    .join(" ");
}

export type CartoonAction = "push" | "pull" | "jump" | "point";

// Camera moves share the verbs; they are not the character's action.
const CAMERA_VERB =
  /\b(camera|lens|shot|view)\s+(?:\w+\s+){0,2}(?:push|pull)\w*(?:\s+(?:in|out|back|away))?|\b(?:push|pull)[- ](?:in|out|back)\b/gi;
const ACTION_PATTERNS: Array<[CartoonAction, RegExp]> = [
  ["push", /\b(push(?:es|ed|ing)?|shov(?:e|es|ed|ing)|thrust(?:s|ing)?)\b/i],
  ["pull", /\b(pull(?:s|ed|ing)?|drag(?:s|ged|ging)?|tug(?:s|ged|ging)?|yank(?:s|ed|ing)?|haul(?:s|ed|ing)?)\b/i],
  ["jump", /\b(jump(?:s|ed|ing)?|leap(?:s|ed|ing|t)?|hop(?:s|ped|ping)?)\b/i],
  ["point", /\bpoint(?:s|ed|ing)?\b(?=[^.;]*\b(?:camera|lens|viewer)\b)/i],
];

// The character's one action, read from the first motion beat that names a verb.
export function cartoonClipAction(motionCamera: string | undefined): CartoonAction | undefined {
  if (!motionCamera) return undefined;
  const beats = motionCamera
    .replace(CAMERA_VERB, " ")
    .split(/[；;]\s*|\s(?=\d+\s*[–-]\s*\d+\s*s\s*:)/)
    .filter((beat) => beat.trim());
  for (const beat of beats) {
    let found: { action: CartoonAction; at: number } | undefined;
    for (const [action, pattern] of ACTION_PATTERNS) {
      const at = beat.search(pattern);
      if (at >= 0 && (!found || at < found.at)) found = { action, at };
    }
    if (found) return found.action;
  }
  return undefined;
}

const ACTION_STILL: Record<CartoonAction, Record<"start" | "end", string>> = {
  push: {
    start:
      "This clip's one action is a PUSH. In this still the hands are on the element named in the Scene, arms bent and loaded, the element right against the hands. Draw its destination named in the Scene on the far side of the element from the character. Any motion marks point away from the character, toward that destination.",
    end:
      "This still is after the PUSH landed: arms fully extended away from the body, and the same element is still visible, farther from the character and at or against its destination. Any motion marks point away from the character. Do not swap the action for a jump, a cheer, or a new prop.",
  },
  pull: {
    start:
      "This clip's one action is a PULL. In this still the arms reach out and the hands grip the element named in the Scene, which sits away from the body. Any motion marks point from the element toward the character.",
    end:
      "This still is after the PULL landed: arms drawn in toward the chest, and the same element is still visible, now close to the body. Any motion marks point toward the character. Do not swap the action for a jump, a cheer, or a new prop.",
  },
  jump: {
    start:
      "This clip's one action is a JUMP. In this still they crouch with knees bent, both feet on the ground, ready to spring.",
    end:
      "This still is the JUMP: both feet clearly off the ground with a shadow below, not a body slid upward.",
  },
  point: {
    start: "This clip's one action is a POINT toward the camera. In this still the pointing arm is down.",
    end:
      "This still is after the POINT: one arm reaches straight at the lens, fingertip aimed at the viewer, not at a side graphic.",
  },
};

// Pasted into whiteboard-explainer stills; empty for every other director.
export function cartoonNarratorFrameLock(
  skillSlug?: string,
  options?: { hasCharacter?: boolean; action?: CartoonAction; position?: "start" | "end" },
) {
  if (skillSlug !== CARTOON_EXPLAINER_SKILL_SLUG) return "";
  if (options?.hasCharacter) {
    const silent =
      "Silent demonstrator: the character does not talk or lip-sync (a readable facial expression is required; no greeting wave).";
    const side =
      "They usually stay on the same side of the frame; they stand on the other side only when this scene is a rare left-to-right or right-to-left cross. The head may face left or the right. Camera angle may differ from the other still.";
    const labels = "Draw every beat title or diagram label written in 「」, clearly readable.";
    if (options.action && options.position) {
      return [
        silent,
        ACTION_STILL[options.action][options.position],
        "Keep the character on the side of the frame the Scene names. Camera angle may differ from the other still. Draw the explanation graph plus the element of this action.",
        labels,
      ].join(" ");
    }
    return `${silent} Draw the before or after of this clip's one action, not a neutral standing pose: push (hands on a drawn element, the element moving away from the body), pull (hands on a drawn element, the element moving toward the body), jump (both feet off the ground when airborne, never a body slid upward), or point toward the camera (the arm aims at the lens, not at a side graphic). ${side} Draw the explanation graph plus the element they push, pull, or point past. ${labels}`;
  }
  return "Silent demonstrator: the character does not talk to the viewer (mouth closed or reacting, no greeting wave). Draw the explanation graph named in the Scene as the primary graphic. Draw every prop and every beat title or diagram label written in 「」, clearly readable.";
}

const ACTION_VIDEO: Record<CartoonAction, string> = {
  push: "This clip's action is a PUSH: the element moves away from the character's body for the whole clip and never slides back toward them.",
  pull: "This clip's action is a PULL: the element moves toward the character's body for the whole clip and never slides away from them.",
  jump: "This clip's action is a JUMP: both feet leave the ground, then land.",
  point: "This clip's action is a POINT toward the camera: the arm rises and the fingertip aims at the lens.",
};

// Appended to whiteboard-explainer clip videos; empty for every other director.
export function cartoonNarratorVideoLock(
  skillSlug?: string,
  options?: { hasCharacter?: boolean; action?: CartoonAction },
) {
  if (skillSlug !== CARTOON_EXPLAINER_SKILL_SLUG) return "";
  const voice =
    "Voice: an unseen off-screen narrator speaks every line. The on-screen character never speaks or lip-syncs.";
  if (!options?.hasCharacter) {
    return `${voice} Mouth stays closed or shows simple reactions, and reacts to the diagram or props.`;
  }
  const named = options.action ? ` ${ACTION_VIDEO[options.action]}` : "";
  return `${voice}${named} Animate this clip's one action, which must differ from the previous clip: a push that moves a drawn element away from the body, a pull that brings a drawn element toward the body, a jump with both feet leaving the ground (never slide the body upward), or a point aimed at the camera. Do not turn the clip into a walk between two standing poses. Usually keep them on the same side. Cross from left to right or right to left only when the stills already show that rare lateral move. Match the camera angle in the stills (from the side, from above, from the front, or from behind as they turn around) and zoom in or out only if the stills change shot size. The drawn element moves with the push or pull. Do not repeat the previous clip's action.`;
}

export function dialogueQaDirectorBlock() {
  return [
    "This director requires exactly two attached character blueprints. Assign one as ASKER and one as ANSWERER. Do not invent a third character or a replacement hero.",
    "Use each character's attached name as NAME in every dialogue line. The ASKER speaks the questions; the ANSWERER speaks the answers. No unseen host or narrator explains anything.",
  ].join(" ");
}

export function listicleDirectorBlock() {
  return "On-canvas text is REQUIRED. Every still must show a readable numbered list of the item titles (each item clip's englishVo). Highlight the current item. The list is a primary graphic in the scene, not a tiny subtitle bar.";
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

export function talkingBrollDirectorBlock() {
  return [
    "This is TALKING-HEAD WITH B-ROLL. The rhythm is fixed: two on-camera lines, then one B-roll cutaway, then back to the same on-camera setup. Repeat until the source is covered. Never open on B-roll.",
    "narrativeJob is only `on-camera` or `b-roll`.",
    "On-camera: the one attached character, medium close-up, eyes to the lens, same background and light as the first on-camera clip. They speak englishVo.",
    "B-roll: the character is not on screen. Show the concrete thing the previous two lines just named. englishVo is one short off-screen line or \"(no dialogue)\".",
    "Override clip inheritance for this director: a b-roll startScene is a new place, not the talking-head room. The next on-camera clip returns to the first on-camera setup, not the b-roll ending.",
  ].join(" ");
}
