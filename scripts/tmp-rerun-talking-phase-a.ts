import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { runPhaseAJob } from "@/service/director/jobs";

loadEnvConfig(process.cwd());

async function main() {
  const id = new ObjectId("6ac78edcc542118f53c3b142");
  await runPhaseAJob(id);
  const videos = await videosCollection();
  const row = await videos.findOne({ _id: id });
  console.log(
    JSON.stringify(
      {
        status: row?.status,
        error: row?.error,
        clipCount: row?.phaseA?.clipCount,
        title: row?.phaseA?.localizedTitle,
        frames: row?.frames?.length ?? 0,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
