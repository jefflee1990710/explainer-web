export const STORY_SHORT_SKILL_SLUG = "story-short-director";
export const DIALOGUE_QA_SKILL_SLUG = "dialogue-qa-director";
export const LISTICLE_SKILL_SLUG = "listicle-director";

export function skillBansNarration(skillSlug?: string) {
  return skillSlug === STORY_SHORT_SKILL_SLUG;
}

export function requiredCastCount(skillSlug?: string) {
  return skillSlug === DIALOGUE_QA_SKILL_SLUG ? 2 : 0;
}

export function skillForcesSceneText(skillSlug?: string) {
  return skillSlug === LISTICLE_SKILL_SLUG;
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

export function storyShortDirectorBlock() {
  return [
    "This is a SHORT FILM, not an explainer.",
    'There is NO narrator and NO third-person voiceover. The narrator field must say: "No narrator — characters speak."',
    'englishVo is only character dialogue written as NAME: "line". Multiple speakers are allowed. A silent beat is "(no dialogue)".',
  ].join(" ");
}

export function dialogueQaDirectorBlock() {
  return "This director requires exactly two attached character blueprints. Assign one as ASKER and one as ANSWERER. Do not invent a third character or a replacement hero.";
}

export function listicleDirectorBlock() {
  return "On-canvas text is REQUIRED. Every still must show a readable numbered list of the item titles (each item clip's englishVo). Highlight the current item. The list is a primary graphic in the scene, not a tiny subtitle bar.";
}
