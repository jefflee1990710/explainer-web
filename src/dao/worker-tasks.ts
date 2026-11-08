import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { WorkerTask } from "@/model/worker-task";

export async function workerTasksCollection(): Promise<
  Collection<OptionalId<WorkerTask>>
> {
  const db = await getDb();
  return db.collection<OptionalId<WorkerTask>>("workerTasks");
}
