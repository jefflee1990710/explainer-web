import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { SoundEffectDoc } from "@/model/sound-effect";

export async function soundEffectsCollection(): Promise<Collection<SoundEffectDoc>> {
  const db = await getDb();
  return db.collection<SoundEffectDoc>("soundEffects");
}
