export const SCRO_SWAP_STANDALONE_SKILL_SLUG = "scro-swap-director";
export const TELEPORT_STANDALONE_SKILL_SLUG = "teleport-director";

export function isStandaloneEngineSkillSlug(
  skillSlug?: string | null,
): boolean {
  return (
    skillSlug === SCRO_SWAP_STANDALONE_SKILL_SLUG ||
    skillSlug === TELEPORT_STANDALONE_SKILL_SLUG
  );
}
