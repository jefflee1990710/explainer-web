import { directorsCollection } from "@/dao";
import type { Skill } from "@/model/skill";
import { isCustomSkill } from "@/service/director/behavior-slug";
import { DIRECTORS, getDirectorBySlug } from "@/service/director/catalog";
import { directorAsSkill } from "@/service/director/catalog-skill";
import { directorVisibleToEmail, loadDirectorVisibility } from "@/service/director/director-visibility";
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

function builtinOpenTo(
  director: { slug: string; isActive: boolean; behavior: { hiddenInPicker: boolean } },
  email: string | null,
  privateSlugs: ReadonlySet<string>,
) {
  return directorVisibleToEmail({
    slug: director.slug,
    hiddenInPicker: director.behavior.hiddenInPicker,
    isActive: director.isActive,
    requireActive: true,
    privateSlugs,
    email,
  });
}

// Picker list from hardcoded directors plus the user's standalone custom directors in MongoDB (`directors` collection).
export async function listSelectableSkills(clerkUserId?: string): Promise<Skill[]> {
  const visibility = await loadDirectorVisibility(clerkUserId);
  const systemSkills = DIRECTORS.filter((director) =>
    builtinOpenTo(director, visibility.email, visibility.privateSlugs),
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
  if (director) {
    const visibility = await loadDirectorVisibility(clerkUserId);
    if (builtinOpenTo(director, visibility.email, visibility.privateSlugs)) {
      return directorAsSkill(director);
    }
    return null;
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

// Brief edits on a video that already uses a switched-off director can keep that director.
export async function findBriefSkill(
  clerkUserId: string,
  slug: string,
  currentSlug?: string,
): Promise<Skill | null> {
  const selectable = await findSelectableSkill(clerkUserId, slug);
  if (selectable) return selectable;
  if (!currentSlug || currentSlug !== slug) return null;
  const director = getDirectorBySlug(slug);
  if (!director?.isActive) return null;
  return directorAsSkill(director);
}
