type SelectableSkill = { id: string; slug: string; behaviorSlug: string };

// Dropdown value for a saved video: its director's slug (custom-… for forks), else the stored behaviour slug.
export function selectedSkillSlugFor(
  video: { skillId: string; skillSlug: string },
  skills: SelectableSkill[],
) {
  return skills.find((skill) => skill.id === video.skillId)?.slug ?? video.skillSlug;
}

// Slug the client-side form rules read: a custom director behaves like its template.
export function ruleSlugFor(slug: string, skills: Array<Pick<SelectableSkill, "slug" | "behaviorSlug">>) {
  return skills.find((skill) => skill.slug === slug)?.behaviorSlug ?? slug;
}
