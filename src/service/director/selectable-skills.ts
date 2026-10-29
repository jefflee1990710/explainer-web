import { directorsCollection } from "@/dao";
import type { Skill } from "@/model/skill";
import { isCustomSkill } from "@/service/director/behavior-slug";
import { DIRECTORS, getDirectorBySlug } from "@/service/director/catalog";
import { directorAsSkill } from "@/service/director/catalog-skill";
import {
  OUTFIT_REEL_SKILL_SLUG,
  SURPRISE_INTERVIEW_SKILL_SLUG,
} from "@/service/director/clip-continuity";
import { FULL_BODY_TALKING_HEAD_SKILL_SLUG } from "@/service/director/talking-head";

// Retired directors stay in the codebase for existing videos; new videos and the director list do not offer them.
const HIDDEN_PICKER_SLUGS = new Set([
  OUTFIT_REEL_SKILL_SLUG,
  FULL_BODY_TALKING_HEAD_SKILL_SLUG,
  SURPRISE_INTERVIEW_SKILL_SLUG,
]);

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

// Picker list from hardcoded directors plus the user's standalone custom directors in MongoDB (`directors` collection).
export async function listSelectableSkills(clerkUserId?: string): Promise<Skill[]> {
  const systemSkills = DIRECTORS.filter(
    (director) => director.isActive && !isHiddenPickerSkill(director),
  ).map(directorAsSkill);
  if (!clerkUserId) return systemSkills;
  try {
    const col = await directorsCollection();
    const userDocs = (await col
      .find(customSelectableFilter(clerkUserId))
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray()) as Skill[];
    const visibleCustom = userDocs.filter((doc) => !isHiddenPickerSkill(doc));
    return sortSelectableSkills([...systemSkills, ...visibleCustom]);
  } catch {
    return systemSkills;
  }
}

// One built-in or user-owned director by slug, only if active and selectable in the picker.
export async function findSelectableSkill(clerkUserId: string, slug: string): Promise<Skill | null> {
  if (!slug) return null;
  const director = getDirectorBySlug(slug);
  if (director && director.isActive && !isHiddenPickerSkill(director)) {
    return directorAsSkill(director);
  }
  if (!clerkUserId) return null;
  try {
    const col = await directorsCollection();
    const custom = (await col.findOne({
      slug,
      ...customSelectableFilter(clerkUserId),
    })) as Skill | null;
    if (!custom || isHiddenPickerSkill(custom)) return null;
    return custom;
  } catch {
    return null;
  }
}
