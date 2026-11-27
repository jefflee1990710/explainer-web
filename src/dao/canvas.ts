import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { CanvasAgentMessage, CanvasFolder, CanvasJob, CanvasProject } from "@/model/canvas";

let projectsIndexed = false;
let jobsIndexed = false;
let agentMessagesIndexed = false;
let foldersIndexed = false;

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

// Typed MongoDB accessor for canvas library folders (`canvas_folders`).
export async function canvasFoldersCollection(): Promise<Collection<CanvasFolder>> {
  const db = await getDb();
  const collection = db.collection<CanvasFolder>("canvas_folders");
  if (!foldersIndexed) {
    foldersIndexed = true;
    await collection.createIndex({ clerkUserId: 1, updatedAt: -1 }).catch(() => {
      foldersIndexed = false;
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
      // ArgoLink webhook looks up the running job by the provider request id.
      collection.createIndex({ provider: 1, externalJobId: 1 }),
    ]).catch(() => {
      jobsIndexed = false;
    });
  }
  return collection;
}

// Typed MongoDB accessor for canvas agent chat history (`canvas_agent_messages`).
export async function canvasAgentMessagesCollection(): Promise<Collection<CanvasAgentMessage>> {
  const db = await getDb();
  const collection = db.collection<CanvasAgentMessage>("canvas_agent_messages");
  if (!agentMessagesIndexed) {
    agentMessagesIndexed = true;
    await collection
      .createIndex({ canvasId: 1, clerkUserId: 1, createdAt: 1 })
      .catch(() => {
        agentMessagesIndexed = false;
      });
  }
  return collection;
}
