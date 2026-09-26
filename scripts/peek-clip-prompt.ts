/**
 * Dump stored Phase B video prompt for one clip.
 * Usage: npx tsx scripts/peek-clip-prompt.ts [videoId] [clipNumber=1]
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import type { Project } from "@/model/project";

loadEnvConfig(process.cwd());

async function main() {
  const videoId = process.argv[2] || "6aae09120d76b8b8baa76aaa";
  const clipNumber = Number(process.argv[3] || "1");
  const project = (await videosCollection().then((col) =>
    col.findOne({ _id: new ObjectId(videoId) }),
  )) as Project | null;
  if (!project) throw new Error("找不到專案");

  const row = project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber);
  const clip = (project.clips || []).find((item) => item.clipNumber === clipNumber);
  const prompt = clip?.prompt || "";

  const audioHits = prompt.match(
    /audio|voiceover|narrat|spoken|dialogue|旁白|說|講|voice|BGM|SFX|「[^」]+」|"[^"]+"/gi,
  );

  console.log(
    JSON.stringify(
      {
        language: project.language,
        sceneTextEnabled: project.sceneTextEnabled,
        sceneTextLanguage: project.sceneTextLanguage,
        narrator: project.phaseA?.narrator,
        englishVo: row?.englishVo,
        bgmSfx: row?.bgmSfx,
        clipStatus: clip?.status,
        promptChars: prompt.length,
        hasQuotedVo: Boolean(row?.englishVo && prompt.includes(row.englishVo)),
        audioKeywordHits: [...new Set(audioHits || [])].slice(0, 40),
        prompt,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
