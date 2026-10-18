import type { Collection, ObjectId, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { PhaseBPrompt, Project } from "@/model/project";

// Video explainer jobs (model `Project`) are stored in the MongoDB `videos` collection.
export async function videosCollection(): Promise<
  Collection<OptionalId<Project>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Project>>("videos");
}

// Semantic alias for `videosCollection` matching the `Project` video model.
export const videoProjectsCollection = videosCollection;

// Atomically persists the Phase B video prompt and duration onto a single clip row.
export async function saveClipPhaseBPrompt(
  videoId: ObjectId,
  clipNumber: number,
  prompt: Pick<PhaseBPrompt, "prompt" | "durationSeconds">,
) {
  const videos = await videosCollection();
  await videos.updateOne(
    { _id: videoId },
    {
      $set: {
        "clips.$[clip].prompt": prompt.prompt,
        "clips.$[clip].durationSeconds": prompt.durationSeconds,
        updatedAt: new Date(),
      },
    },
    { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
  );
}
