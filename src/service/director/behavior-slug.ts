import type { ObjectId } from "mongodb";
import type { Skill } from "@/model/skill";

// Slug that drives skill-specific rules: a custom director follows its template.
export function behaviorSlug(skill: Pick<Skill, "slug" | "baseSlug">): string {
  return skill.baseSlug || skill.slug;
}

// Copy of the skill whose slug is the behaviour slug, for Phase A / B and pipeline rules.
export function asRunSkill(skill: Skill): Skill {
  return { ...skill, slug: behaviorSlug(skill) };
}

// User-owned directors carry an owner; system skills do not.
export function isCustomSkill(skill: Pick<Skill, "ownerClerkUserId">): boolean {
  return Boolean(skill.ownerClerkUserId);
}

// Unique slug for a custom director document.
export function customSkillSlug(id: ObjectId): string {
  return `custom-${id.toHexString()}`;
}
