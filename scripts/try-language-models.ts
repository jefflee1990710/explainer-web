/**
 * One-off: render this video's clip-1 start prompt on the three language models.
 * Does not write back to the video.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { frameLockReferenceUrls } from "@/service/character/cast-prompt";
import { buildFramePrompt } from "@/service/higgsfield/frame-prompts";
import { fetchHiggsfieldStatus, submitImage } from "@/service/higgsfield/generate";
import { imageModelForSubmit, imageRouteForSceneText } from "@/service/generation/image-backend";
import type { Project, SceneTextLanguage } from "@/model/project";

loadEnvConfig(process.cwd());

const VIDEO_ID = "6ab75151c354e3123aea517e";
const OUT = "/tmp/explainer-model-compare";

const VO: Record<SceneTextLanguage, { startVo: string; endVo: string }> = {
  en: {
    startVo: "Think large language models have",
    endVo: "a giant thinking brain inside?",
  },
  "zh-Hant": {
    startVo: "你以為大型語言模型",
    endVo: "裡面有一顆巨大的思考腦？",
  },
  "zh-Hans": {
    startVo: "你以为大语言模型",
    endVo: "里面有一颗巨大的思考脑？",
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const base = (await videosCollection().then((c) =>
    c.findOne({ _id: new ObjectId(VIDEO_ID) }),
  )) as Project | null;
  if (!base?.phaseA) throw new Error("找不到分鏡");
  const refs = frameLockReferenceUrls(base);
  const results: Array<Record<string, string>> = [];

  for (const language of ["en", "zh-Hant", "zh-Hans"] as const) {
    const project: Project = {
      ...base,
      sceneTextEnabled: true,
      sceneTextLanguage: language,
      phaseA: {
        ...base.phaseA,
        clips: base.phaseA.clips.map((clip) =>
          clip.clipNumber === 1
            ? {
                ...clip,
                startVo: VO[language].startVo,
                endVo: VO[language].endVo,
                englishVo: `${VO[language].startVo} ${VO[language].endVo}`,
              }
            : clip,
        ),
      },
    };
    const prompt = buildFramePrompt(project, 1, "start");
    const route = imageRouteForSceneText(language);
    const model = imageModelForSubmit(route, refs.length > 0);
    writeFileSync(`${OUT}/${language}.prompt.txt`, prompt);
    console.log("submit", language, model);
    const submitted = await submitImage(
      {
        model,
        prompt,
        aspectRatio: base.aspectRatio,
        quality: "medium",
        resolution: "1k",
        sceneTextLanguage: language,
        referenceImageUrls: refs,
      },
      { webhook: false },
    );
    const started = Date.now();
    let status = submitted;
    while (!["completed", "failed", "nsfw"].includes(status.status || "")) {
      if (Date.now() - started > 8 * 60_000) throw new Error(`${language} timeout`);
      await sleep(8000);
      status = await fetchHiggsfieldStatus(status.status_url);
      console.log(language, status.status);
    }
    if (status.status !== "completed") {
      throw new Error(`${language} ${status.status}`);
    }
    const url = status.images?.[0]?.url;
    if (!url) throw new Error(`${language} no image url`);
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    const file = `${OUT}/${language}.png`;
    writeFileSync(file, bytes);
    results.push({ language, model, file, url, text: `${VO[language].startVo} / ${VO[language].endVo}` });
    console.log("saved", file);
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
