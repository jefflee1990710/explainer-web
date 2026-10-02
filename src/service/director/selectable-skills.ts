import { skillsCollection } from "@/dao";
import type { Skill } from "@/model/skill";
import { isCustomSkill } from "@/service/director/behavior-slug";

// Active skills a user may pick: every system skill plus their own directors.
export function selectableSkillFilter(clerkUserId: string) {
  return {
    isActive: true,
    $or: [{ ownerClerkUserId: { $exists: false } }, { ownerClerkUserId: clerkUserId }],
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
  const docs = (await skills.find(selectableSkillFilter(clerkUserId)).toArray()) as Skill[];
  return sortSelectableSkills(docs);
}

// One skill by slug, only if this user may pick it.
export async function findSelectableSkill(clerkUserId: string, slug: string): Promise<Skill | null> {
  if (!slug) return null;
  const skills = await skillsCollection();
  return (await skills.findOne({ ...selectableSkillFilter(clerkUserId), slug })) as Skill | null;
}
