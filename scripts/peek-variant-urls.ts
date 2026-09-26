import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { mediaSrc } from "@/util/media-src";
import type { Project } from "@/model/project";

loadEnvConfig(process.cwd());

async function main() {
  const ids = process.argv.slice(2);
  const videos = await videosCollection();
  const out = [];
  for (const id of ids) {
    const p = (await videos.findOne({ _id: new ObjectId(id) })) as Project | null;
    if (!p) continue;
    out.push({
      id,
      language: p.language,
      sceneTextLanguage: p.sceneTextLanguage,
      status: p.status,
      title: p.phaseA?.localizedTitle,
      englishTitle: p.phaseA?.englishTitle,
      narrator: p.phaseA?.narrator,
      clips: (p.phaseA?.clips || []).map((row) => {
        const start = p.frames?.find((f) => f.clipNumber === row.clipNumber && f.position === "start");
        const end = p.frames?.find((f) => f.clipNumber === row.clipNumber && f.position === "end");
        const video = p.clips?.find((c) => c.clipNumber === row.clipNumber);
        return {
          clipNumber: row.clipNumber,
          durationSeconds: row.durationSeconds,
          englishVo: row.englishVo,
          startFrameUrl: mediaSrc(start),
          endFrameUrl: mediaSrc(end),
          videoStatus: video?.status,
          videoUrl: mediaSrc(video),
        };
      }),
    });
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
