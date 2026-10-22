import type { ObjectId } from "mongodb";
import type { Skill } from "@/model/skill";
import { getDirectorById, resolveDirector } from "@/service/director/catalog";
import { directorAsSkill } from "@/service/director/catalog-skill";

type SkillFinders = {
  findInSkills: (id: ObjectId) => Promise<Skill | null>;
  findInUserDirectors: (id: ObjectId) => Promise<Skill | null>;
};

// Loads from the hardcoded director catalog, falling back legacy custom IDs to the default director.
export async function loadStoredSkill(id: ObjectId, finders?: SkillFinders): Promise<Skill | null> {
  if (finders) {
    const system = await finders.findInSkills(id);
    if (system) return system;
    return finders.findInUserDirectors(id);
  }
  return directorAsSkill(getDirectorById(id) ?? resolveDirector(id));
}
