import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";

loadEnvConfig(process.cwd());

async function main() {
  const videos = await videosCollection();
  const row = await videos.findOne({ _id: new ObjectId("6aca25d0aee1e0adb1d53a01") });
  if (!row) {
    console.log("missing");
    process.exit(0);
  }
  const clips = row.phaseA?.clips || [];
  const frames = row.frames || [];
  const videosOut = row.clips || [];
  console.log(
    JSON.stringify(
      {
        skillSlug: row.skillSlug,
        language: row.language,
        sceneTextEnabled: row.sceneTextEnabled,
        sceneTextLanguage: row.sceneTextLanguage,
        subtitleLook: row.subtitleLook,
        clips: clips.map((c) => ({
          n: c.clipNumber,
          englishVo: c.englishVo,
          startVo: c.startVo,
          endVo: c.endVo,
          startScene: c.startScene,
          endScene: c.endScene,
          explainerScene: c.explainerScene,
          motionCamera: c.motionCamera,
        })),
        frames: frames.map((f) => ({
          n: f.clipNumber,
          pos: f.position,
          status: f.status,
          promptEdited: f.promptEdited,
          subtitleLines: (f.prompt || "")
            .split(/\n|(?<=\.)\s+/)
            .filter((l) => /subtitle|spell exactly|spoken line/i.test(l))
            .slice(0, 16),
        })),
        videos: videosOut.map((c) => ({
          n: c.clipNumber,
          status: c.status,
          prompt: c.prompt || "",
        })),
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
