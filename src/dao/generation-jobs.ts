import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { GenerationJob } from "@/model/generation-job";

export async function generationJobsCollection(): Promise<
  Collection<OptionalId<GenerationJob>>
> {
  const db = await getDb();
  return db.collection<OptionalId<GenerationJob>>("generationJobs");
}
