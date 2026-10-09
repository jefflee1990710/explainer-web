import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

async function main() {
  const videos = await videosCollection();
  const row = await videos.findOne({ _id: new ObjectId("6ac78edcc542118f53c3b142") });
  if (!row) {
    console.log("missing");
    process.exit(0);
  }
  console.log(
    JSON.stringify(
      {
        status: row.status,
        error: row.error,
        clips: (row.clips || []).map((c) => ({
          n: c.clipNumber,
          status: c.status,
          error: c.error,
          hasVideo: Boolean(c.blobUrl || c.outputUrl),
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
