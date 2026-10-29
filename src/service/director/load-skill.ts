import type { ObjectId } from "mongodb";
import { directorsCollection } from "@/dao";
import type { Skill } from "@/model/skill";
import { getDirectorById, resolveDirector } from "@/service/director/catalog";
import { directorAsSkill } from "@/service/director/catalog-skill";

type SkillFinders = {
  findInSkills: (id: ObjectId) => Promise<Skill | null>;
  findInUserDirectors: (id: ObjectId) => Promise<Skill | null>;
};

// Loads from built-in catalog first, then the standalone `directors` MongoDB collection, falling back to default director.
export async function loadStoredSkill(id: ObjectId, finders?: SkillFinders): Promise<Skill | null> {
  if (finders) {
    const system = await finders.findInSkills(id);
    if (system) return system;
    return finders.findInUserDirectors(id);
  }
  const builtIn = getDirectorById(id);
  if (builtIn) return directorAsSkill(builtIn);
  try {
    const col = await directorsCollection();
    const custom = (await col.findOne({ _id: id })) as Skill | null;
    if (custom) return custom;
  } catch {
    // Fall back to default director when DB is unavailable in unit tests
  }
  return directorAsSkill(resolveDirector(id));
}
