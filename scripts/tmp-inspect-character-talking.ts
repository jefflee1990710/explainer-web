import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import type { ProjectClip, StoryboardRow } from "@/model/project";

loadEnvConfig(process.cwd());

async function main() {
  const videos = await videosCollection();
  const characterId = new ObjectId("6ac1f809f8be1df00d3c6d47");
  const rows = await videos
    .find({
      $or: [
        { "cast.characterId": characterId },
        { skillSlug: { $in: ["talking-head-director", "full-body-talking-head-director"] } },
      ],
    })
    .project({
      skillSlug: 1,
      source: 1,
      spokenScript: 1,
      "phaseA.clips": 1,
      "phaseA.characterLock": 1,
      clips: 1,
      createdAt: 1,
    })
    .sort({ createdAt: -1 })
    .limit(12)
    .toArray();

  console.log(
    JSON.stringify(
      rows.map((row) => ({
        id: String(row._id),
        skillSlug: row.skillSlug,
        source: row.source?.slice(0, 160),
        spokenScript: row.spokenScript?.slice(0, 200),
        clipCount: row.phaseA?.clips?.length,
        talkingRows: row.phaseA?.clips
          ?.filter((clip: StoryboardRow) => clip.englishVo && !/no dialogue/i.test(clip.englishVo))
          .slice(0, 2)
          .map((clip: StoryboardRow) => ({
            n: clip.clipNumber,
            vo: clip.englishVo,
            motion: clip.motionCamera,
          })),
        videos: row.clips
          ?.filter((clip: ProjectClip) => clip.status === "completed")
          .map((clip: ProjectClip) => ({ n: clip.clipNumber, url: clip.blobUrl || clip.outputUrl })),
      })),
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
