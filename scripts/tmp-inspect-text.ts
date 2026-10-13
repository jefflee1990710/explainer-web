import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";

loadEnvConfig(process.cwd());

async function main() {
  const { videosCollection } = await import("@/dao");
  const project = await (await videosCollection()).findOne({
    _id: new ObjectId("6aca6751dd3c6940db9226b7"),
  });
  if (!project) throw new Error("missing");
  const clips = (project.phaseA?.clips || []).map((clip) => {
    const start = clip.startScene || "";
    const sub = start.match(/Subtitle[^.]*/)?.[0] || "";
    return { n: clip.clipNumber, subtitle: sub.slice(0, 500) };
  });
  const frame = (project.frames || []).find((item) => item.clipNumber === 1 && item.position === "start");
  const prompt = frame?.prompt || "";
  const scene = prompt.match(/Scene: [\s\S]*?(?=\n[A-Z][^:\n]{0,40}:|\n9:16|\nAspect ratio|$)/)?.[0] || "";
  const frames = [
    {
      promptLen: prompt.length,
      hasSubtitleWords: prompt.includes("Four lighting techniques"),
      hasSubtitleLabel: /Subtitle/i.test(prompt),
      sceneLen: scene.length,
      sceneTail: scene.slice(-800),
    },
  ];
  console.log(
    JSON.stringify(
      {
        skillSlug: project.skillSlug,
        styleId: project.styleId,
        subtitleLook: project.subtitleLook,
        hasTextStyleImage: Boolean(project.textStyleImageUrl),
        sceneTextEnabled: project.sceneTextEnabled,
        sceneTextLanguage: project.sceneTextLanguage,
        frames,
        clips,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
