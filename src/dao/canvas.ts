import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { CanvasJob, CanvasProject } from "@/model/canvas";

let projectsIndexed = false;
let jobsIndexed = false;

// Typed MongoDB accessor for multi-project canvas graphs (`canvas_projects`).
export async function canvasProjectsCollection(): Promise<
  Collection<CanvasProject>
> {
  const db = await getDb();
  const collection = db.collection<CanvasProject>("canvas_projects");
  if (!projectsIndexed) {
    projectsIndexed = true;
    await collection
      .createIndex({ clerkUserId: 1, updatedAt: -1 })
      .catch(() => {
        projectsIndexed = false;
      });
  }
  return collection;
}

// Typed MongoDB accessor for canvas node execution & billing records (`canvas_jobs`).
export async function canvasJobsCollection(): Promise<Collection<CanvasJob>> {
  const db = await getDb();
  const collection = db.collection<CanvasJob>("canvas_jobs");
  if (!jobsIndexed) {
    jobsIndexed = true;
    await Promise.all([
      collection.createIndex({ clerkUserId: 1, updatedAt: -1 }),
      collection.createIndex({ canvasId: 1, createdAt: -1 }),
    ]).catch(() => {
      jobsIndexed = false;
    });
  }
  return collection;
}
