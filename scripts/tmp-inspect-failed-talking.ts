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
        updatedAt: row.updatedAt,
        phaseA: row.phaseA
          ? {
              title: row.phaseA.localizedTitle,
              clipCount: row.phaseA.clipCount,
              clips: row.phaseA.clips.map((clip) => ({
                n: clip.clipNumber,
                seconds: clip.durationSeconds,
                vo: clip.englishVo.slice(0, 80),
              })),
            }
          : null,
        frames: (row.frames || []).map((frame) => ({
          clip: frame.clipNumber,
          position: frame.position,
          status: frame.status,
        })),
        source: row.source,
        scriptLen: (row.spokenScript || "").length,
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
