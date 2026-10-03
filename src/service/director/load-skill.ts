import type { ObjectId } from "mongodb";
import { skillsCollection, userDirectorsCollection } from "@/dao";
import type { Skill } from "@/model/skill";

type SkillFinders = {
  findInSkills: (id: ObjectId) => Promise<Skill | null>;
  findInUserDirectors: (id: ObjectId) => Promise<Skill | null>;
};

// System row first, then the custom collection. Soft-deleted custom rows stay
// loadable so a video that already points at that `_id` still runs.
async function defaultFinders(): Promise<SkillFinders> {
  const skills = await skillsCollection();
  const directors = await userDirectorsCollection();
  return {
    findInSkills: async (id) => (await skills.findOne({ _id: id })) as Skill | null,
    findInUserDirectors: async (id) => (await directors.findOne({ _id: id })) as Skill | null,
  };
}

export async function loadStoredSkill(id: ObjectId, finders?: SkillFinders): Promise<Skill | null> {
  const lookup = finders ?? (await defaultFinders());
  const system = await lookup.findInSkills(id);
  if (system) return system;
  return lookup.findInUserDirectors(id);
}
