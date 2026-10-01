import { CARTOON_EXPLAINER_SKILL_SLUG } from "@/service/director/dual-beat";

export const STORY_SHORT_SKILL_SLUG = "story-short-director";
export const DIALOGUE_QA_SKILL_SLUG = "dialogue-qa-director";
export const LISTICLE_SKILL_SLUG = "listicle-director";

// Directors whose audio is character dialogue only: no narrator, no voice picker.
const DIALOGUE_ONLY_SKILLS = new Set([STORY_SHORT_SKILL_SLUG, DIALOGUE_QA_SKILL_SLUG]);

export function skillBansNarration(skillSlug?: string) {
  return Boolean(skillSlug && DIALOGUE_ONLY_SKILLS.has(skillSlug));
}

export function requiredCastCount(skillSlug?: string) {
  return skillSlug === DIALOGUE_QA_SKILL_SLUG ? 2 : 0;
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

// 白板概念解說：永遠是畫外旁白；角色不說話，用多個道具把概念演出來。
export function cartoonExplainerDirectorBlock() {
  return [
    "This director is ALWAYS narrated: an unseen off-screen narrator speaks every englishVo line in the third person.",
    "The on-screen character never speaks, never introduces themself, and is never the narrator. No first-person lines in the character's voice (no \"Hi, I'm Scro\", \"I am…\", \"we…\" spoken as the character); the narrator may name the character or product in the third person (\"Meet Scro. Scro turns…\").",
    "The character is a silent demonstrator: no greeting wave or talking to the viewer, mouth closed or reacting, and it acts out the concept with props.",
    "Every startScene and endScene gives the character at least 3 concrete props it holds, points at, opens, sorts, stacks, or transforms (cardboard boxes, bins, arrows, yellow tags, icons, gauges, morphing objects), each standing for one part of the idea. List them in Set and name the interaction in Character. Never a near-empty canvas with one floating label.",
  ].join(" ");
}

// Pasted into whiteboard-explainer stills; empty for every other director.
export function cartoonNarratorFrameLock(skillSlug?: string) {
  if (skillSlug !== CARTOON_EXPLAINER_SKILL_SLUG) return "";
  return "Silent demonstrator: the character does not talk to the viewer (mouth closed or reacting, no greeting wave). It actively uses the props to explain the idea — draw every prop named in the Scene, clearly readable.";
}

// Appended to whiteboard-explainer clip videos; empty for every other director.
export function cartoonNarratorVideoLock(skillSlug?: string) {
  if (skillSlug !== CARTOON_EXPLAINER_SKILL_SLUG) return "";
  return "Voice: an unseen off-screen narrator speaks every line. The on-screen character never speaks or lip-syncs — mouth stays closed or shows simple reactions — and acts out the idea with the props.";
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
