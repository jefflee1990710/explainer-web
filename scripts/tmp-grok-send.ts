import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { queueAutoClipVideos } from "@/service/clip/auto-video";

const VIDEO_ID = "6ac8f30a969a0d0a6433ec1c";

async function main() {
  const projects = await videosCollection();
  const id = new ObjectId(VIDEO_ID);
  await projects.updateOne(
    { _id: id },
    { $addToSet: { autoVideoClips: { $each: [1, 2, 3, 4] } } },
  );
  await queueAutoClipVideos(id);
  const project = await projects.findOne({ _id: id });
  console.log(
    JSON.stringify({
      auto: project?.autoVideoClips ?? [],
      clips: (project?.clips || []).map((clip) => ({
        n: clip.clipNumber,
        status: clip.status,
        at: clip.submittedAt,
        charged: clip.creditsCharged,
      })),
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
