import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { characterReferenceUrls } from "@/service/character/cast-prompt";
import { clipEndScene, clipStartScene } from "@/service/director/dual-beat";
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
      skillSlug: p.skillSlug,
      cast: p.cast?.map((m) => ({
        name: m.name,
        blueprintUrl: m.blueprintUrl,
        prompt: m.prompt?.slice(0, 180),
      })),
      characterImageUrl: p.characterImageUrl,
      characterStillUrl: p.characterStillUrl,
      lockRefs: characterReferenceUrls(p),
      characterLock: p.phaseA?.characterLock,
      clips: (p.phaseA?.clips || []).map((row) => ({
        n: row.clipNumber,
        explainerScene: row.explainerScene,
        startScene: clipStartScene(row),
        endScene: clipEndScene(row),
        startHasLily: /Lily/i.test(clipStartScene(row)),
        endHasLily: /Lily/i.test(clipEndScene(row)),
        bothMomentsInScene: /起始/.test(clipStartScene(row)) && /結尾/.test(clipStartScene(row)),
      })),
      frames: (p.frames || []).map((f) => ({
        c: f.clipNumber,
        p: f.position,
        url: mediaSrc(f),
        promptHasLilyCount: (f.prompt?.match(/Lily/g) || []).length,
        promptHead: f.prompt?.slice(0, 400),
      })),
    });
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
