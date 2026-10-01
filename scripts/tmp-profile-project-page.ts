import { loadEnvConfig } from "@next/env";
import { performance } from "node:perf_hooks";
import { ObjectId } from "mongodb";

loadEnvConfig(process.cwd());

const id = process.argv[2] || "6abb5c80b510ba3a41dd5fed";

async function time<T>(label: string, fn: () => Promise<T>) {
  const t0 = performance.now();
  const result = await fn();
  const ms = (performance.now() - t0).toFixed(0);
  const count = Array.isArray(result) ? result.length : undefined;
  console.log(`${label}: ${ms}ms${count !== undefined ? ` count=${count}` : ""}`);
  return result;
}

async function main() {
  const { projectsCollection, videosCollection, skillsCollection, charactersCollection } = await import(
    "@/dao"
  );
  const { VIDEO_LIST_PROJECTION } = await import("@/presentation/serialize");
  const { listTasks } = await import("@/service/generation/task-list");
  const { getActiveSubscription } = await import("@/service/billing/credits");

  const folders = await projectsCollection();
  const folder = await folders.findOne({ _id: new ObjectId(id) });
  if (!folder) {
    console.error("folder not found");
    process.exit(1);
  }
  console.log("folder:", folder.name);

  const videos = await videosCollection();
  const docs = await time("videos (VIDEO_LIST_PROJECTION)", () =>
    videos
      .find({ projectId: folder._id }, { projection: VIDEO_LIST_PROJECTION })
      .sort({ createdAt: -1 })
      .toArray(),
  );
  const payload = JSON.stringify(docs);
  console.log(`  list payload ~${payload.length} bytes (${docs.length} videos)`);

  await time("skills", async () =>
    (await skillsCollection()).find({ isActive: true }).sort({ sortOrder: 1 }).toArray(),
  );
  await time("all characters", async () =>
    (await charactersCollection()).find({ clerkUserId: folder.clerkUserId }).sort({ updatedAt: -1 }).toArray(),
  );
  await time("getActiveSubscription", () => getActiveSubscription(folder.clerkUserId));
  await time("listTasks (app layout)", () => listTasks(folder.clerkUserId, { limit: 200 }));

  if (docs[0]) {
    const full = await time("one full video (editor open)", () => videos.findOne({ _id: docs[0]._id }));
    console.log(`  full doc ~${JSON.stringify(full).length} bytes`);
  }
}

void main();
