import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { VideoTemplate } from "@/model/video-edit";

export async function videoTemplatesCollection(): Promise<Collection<OptionalId<VideoTemplate>>> {
  const db = await getDb();
  return db.collection<OptionalId<VideoTemplate>>("videoTemplates");
}
