import { ObjectId } from "mongodb";
import type { IDirector } from "@/model/director";
import type { Skill } from "@/model/skill";

// Catalog ids stay plain hex strings. Only server callers construct ObjectId.
export function directorAsSkill(director: IDirector): Skill {
  return {
    ...director,
    _id: new ObjectId(director._id),
  };
}
