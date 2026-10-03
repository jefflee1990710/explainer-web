import { skillsCollection, userDirectorsCollection } from "@/dao";
import type { Skill } from "@/model/skill";
import { isCustomSkill } from "@/service/director/behavior-slug";

// Active system skills. Custom directors live in `userDirectors`.
export function systemSelectableFilter() {
  return {
    isActive: true,
    ownerClerkUserId: { $exists: false },
  };
}

// Active custom directors owned by this user. Soft-deleted rows stay out of the picker.
export function customSelectableFilter(clerkUserId: string) {
  return {
    isActive: true,
    ownerClerkUserId: clerkUserId,
  };
}

// System skills by sortOrder, then custom directors newest edit first.
export function sortSelectableSkills(skills: Skill[]): Skill[] {
  const system = skills.filter((skill) => !isCustomSkill(skill)).sort((a, b) => a.sortOrder - b.sortOrder);
  const custom = skills
    .filter(isCustomSkill)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return [...system, ...custom];
}

// Picker list for the signed-in user.
export async function listSelectableSkills(clerkUserId: string): Promise<Skill[]> {
  const skills = await skillsCollection();
  const directors = await userDirectorsCollection();
  const [system, custom] = await Promise.all([
    skills.find(systemSelectableFilter()).toArray(),
    directors.find(customSelectableFilter(clerkUserId)).toArray(),
  ]);
  return sortSelectableSkills([...(system as Skill[]), ...(custom as Skill[])]);
}

// One skill by slug, only if this user may pick it.
export async function findSelectableSkill(clerkUserId: string, slug: string): Promise<Skill | null> {
  if (!slug) return null;
  const skills = await skillsCollection();
  const system = (await skills.findOne({ ...systemSelectableFilter(), slug })) as Skill | null;
  if (system) return system;
  const directors = await userDirectorsCollection();
  return (await directors.findOne({ ...customSelectableFilter(clerkUserId), slug })) as Skill | null;
}
