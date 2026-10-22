import type { Skill } from "@/model/skill";
import { isCustomSkill } from "@/service/director/behavior-slug";
import { DIRECTORS, getDirectorBySlug } from "@/service/director/catalog";
import { OUTFIT_REEL_SKILL_SLUG } from "@/service/director/clip-continuity";

// 試衫 stays in the codebase. New videos and the director list do not offer it.
const HIDDEN_PICKER_SLUGS = new Set([OUTFIT_REEL_SKILL_SLUG]);

export function isHiddenPickerSkill(skill: {
  slug: string;
  baseSlug?: string;
  behavior?: { hiddenInPicker?: boolean };
}) {
  if (skill.behavior?.hiddenInPicker != null) return skill.behavior.hiddenInPicker;
  const fromCatalog = getDirectorBySlug(skill.baseSlug || skill.slug);
  if (fromCatalog) return fromCatalog.behavior.hiddenInPicker;
  return (
    HIDDEN_PICKER_SLUGS.has(skill.slug) ||
    Boolean(skill.baseSlug && HIDDEN_PICKER_SLUGS.has(skill.baseSlug))
  );
}

export function systemSelectableFilter() {
  return {
    isActive: true,
    ownerClerkUserId: { $exists: false },
  };
}

export function customSelectableFilter(clerkUserId: string) {
  return {
    isActive: true,
    ownerClerkUserId: clerkUserId,
  };
}

export function sortSelectableSkills(skills: Skill[]): Skill[] {
  const system = skills.filter((skill) => !isCustomSkill(skill)).sort((a, b) => a.sortOrder - b.sortOrder);
  const custom = skills
    .filter(isCustomSkill)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return [...system, ...custom];
}

// Picker list from hardcoded directors.
export async function listSelectableSkills(_clerkUserId?: string): Promise<Skill[]> {
  return DIRECTORS.filter((director) => director.isActive && !isHiddenPickerSkill(director));
}

// One built-in director by slug, only if active and selectable in the picker.
export async function findSelectableSkill(_clerkUserId: string, slug: string): Promise<Skill | null> {
  if (!slug) return null;
  const director = getDirectorBySlug(slug);
  if (!director || !director.isActive || isHiddenPickerSkill(director)) return null;
  return director;
}
