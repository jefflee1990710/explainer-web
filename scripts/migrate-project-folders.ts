import { loadEnvConfig } from "@next/env";
import { projectsCollection, videosCollection } from "../src/lib/collections";
import { folderNameFromVideo, looksLikeLegacyVideo } from "../src/lib/folder";
import type { Folder } from "../src/types/folder";
import type { Project } from "../src/types/project";

loadEnvConfig(process.cwd());

const dryRun = process.argv.includes("--dry-run");

// Legacy rows live in `projects` but are really videos: skillSlug set, no folder name.
const LEGACY_QUERY = {
  skillSlug: { $exists: true },
  name: { $exists: false },
};

async function main() {
  const projects = await projectsCollection();
  const videos = await videosCollection();

  const candidates = await projects.find(LEGACY_QUERY).toArray();

  let wrapped = 0;
  let skipped = 0;

  for (const doc of candidates) {
    if (!looksLikeLegacyVideo(doc)) {
      continue;
    }

    const exists = await videos.findOne({ _id: doc._id });
    if (exists) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      wrapped += 1;
      continue;
    }

    const now = new Date();
    const legacy = doc as typeof doc & Omit<Project, "projectId">;

    const folder = await projects.insertOne({
      userId: legacy.userId,
      clerkUserId: legacy.clerkUserId,
      name: folderNameFromVideo(legacy),
      createdAt: legacy.createdAt || now,
      updatedAt: now,
    } satisfies Omit<Folder, "_id">);

    const { _id, ...rest } = legacy;
    await videos.insertOne({
      _id,
      ...rest,
      projectId: folder.insertedId,
    } as Project);

    await projects.deleteOne({ _id: legacy._id });
    wrapped += 1;
  }

  const result = { wrapped, skipped };
  console.log(dryRun ? { dryRun: true, ...result } : result);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
