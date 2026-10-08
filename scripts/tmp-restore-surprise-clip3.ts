import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

const url =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/6ac5b890490814ffcb2396e1/frames/bc6d34d1-a930-45c0-8d0b-4c5abcd0eb3b";

async function main() {
  const videos = await videosCollection();
  const result = await videos.updateOne(
    { _id: new ObjectId("6ac5b890490814ffcb2396e1") },
    {
      $set: {
        "frames.$[frame].status": "completed",
        "frames.$[frame].blobUrl": url,
        "frames.$[frame].outputUrl": url,
        updatedAt: new Date(),
      },
    },
    { arrayFilters: [{ "frame.clipNumber": 3, "frame.position": "start" }] },
  );
  console.log("matched", result.matchedCount, "modified", result.modifiedCount);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
