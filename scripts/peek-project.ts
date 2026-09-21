import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "../src/lib/collections";

loadEnvConfig(process.cwd());

async function main() {
  const id = process.argv[2] || "6aae09120d76b8b8baa76aaa";
  const p = await videosCollection().then((c) => c.findOne({ _id: new ObjectId(id) }));
  console.log(
    JSON.stringify(
      {
        status: p?.status,
        error: p?.error,
        language: p?.language,
        sceneTextEnabled: p?.sceneTextEnabled,
        sceneTextLanguage: p?.sceneTextLanguage,
        durationPreset: p?.durationPreset,
        hasPhaseA: Boolean(p?.phaseA),
        clipCount: p?.phaseA?.clips?.length,
        castLen: p?.cast?.length,
        sourceLen: p?.source?.length,
        clips: p?.phaseA?.clips?.map((c) => ({
          n: c.clipNumber,
          sec: c.durationSeconds,
          scene: c.explainerScene,
          vo: c.englishVo,
        })),
        frames: p?.frames?.map((f) => ({
          c: f.clipNumber,
          p: f.position,
          status: f.status,
          url: f.blobUrl || f.outputUrl,
        })),
      },
      null,
      2,
    ),
  );
}
main();
