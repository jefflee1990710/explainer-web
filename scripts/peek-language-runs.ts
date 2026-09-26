import { loadEnvConfig } from "@next/env";
import { videosCollection } from "@/dao";
import type { Project } from "@/model/project";

loadEnvConfig(process.cwd());

async function main() {
  const videos = await videosCollection();
  const rows = (await videos
    .find({
      source: { $exists: true },
      language: { $in: ["en", "yue"] },
    })
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray()) as Project[];
  console.log(
    JSON.stringify(
      rows.map((p) => ({
        id: p._id.toHexString(),
        language: p.language,
        sceneTextLanguage: p.sceneTextLanguage,
        status: p.status,
        createdAt: p.createdAt,
        title: p.phaseA?.localizedTitle,
        clipCount: p.phaseA?.clips?.length,
        vos: p.phaseA?.clips?.map((c) => c.englishVo),
        frames: p.frames?.map((f) => ({
          c: f.clipNumber,
          p: f.position,
          status: f.status,
        })),
        clips: p.clips?.map((c) => ({ n: c.clipNumber, status: c.status })),
        error: p.error,
      })),
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
