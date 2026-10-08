import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { surpriseTypeLines, surpriseVarietyPlan } from "@/service/director/surprise-interview";
import { subtitleText } from "@/service/director/spoken-line";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { hydrateStyles } from "@/service/style/load-style";

loadEnvConfig(process.cwd());

const VIDEO_ID = new ObjectId("6ac5b890490814ffcb2396e1");

async function main() {
  await hydrateStyles();
  const videos = await videosCollection();
  const video = await videos.findOne({ _id: VIDEO_ID });
  if (!video?.phaseA) throw new Error("missing");
  const fresh = buildFramePrompt(video, 2, "start");
  const variety = surpriseVarietyPlan(video.phaseA);
  console.log(
    JSON.stringify(
      {
        skillSlug: video.skillSlug,
        freshClip2StartHead: fresh.slice(0, 400),
        freshHasShock: fresh.includes("shock poster"),
        freshHasWhiteBand: fresh.includes("white band"),
        styleId: video.styleId,
        sceneTextEnabled: video.sceneTextEnabled,
        sceneTextLanguage: video.sceneTextLanguage,
        refs: (video.referenceImages || []).map((item) => ({
          id: item.id,
          description: item.description,
          url: item.url,
        })),
        clips: video.phaseA.clips.map((clip) => ({
          n: clip.clipNumber,
          vo: clip.englishVo,
          poster: surpriseTypeLines({
            line: subtitleText(clip.englishVo) || clip.englishVo,
            place: variety.find((item) => item.clipNumber === clip.clipNumber)?.place ?? "top",
          }),
        })),
        frames: (video.frames || []).map((frame) => ({
          n: frame.clipNumber,
          p: frame.position,
          status: frame.status,
          url: frame.blobUrl || frame.outputUrl,
          promptHead: (frame.prompt || "").slice(0, 500),
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
