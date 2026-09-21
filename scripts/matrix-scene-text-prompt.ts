/**
 * All scene-text settings × clip frame prompts (no API).
 * Usage: npx tsx scripts/matrix-scene-text-prompt.ts <videoId> [clip=1]
 */
import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import {
  resolveSceneText,
  sceneTextNegativePrompt,
  sceneTextFrameLines,
} from "../src/lib/director/scene-text";
import { buildFramePrompt } from "../src/lib/higgsfield/frame-prompts";
import { sceneTextPromptSummary } from "../src/components/project/frame-prompt-panel";
import { videosCollection } from "../src/lib/collections";
import type { Project, SceneTextLanguage } from "../src/types/project";

loadEnvConfig(process.cwd());

const LANGS: SceneTextLanguage[] = ["en", "zh-Hant", "zh-Hans"];

async function main() {
  const videoId = process.argv[2];
  const clip = Number(process.argv[3] || "1");
  if (!videoId || !ObjectId.isValid(videoId)) {
    throw new Error("用法: npx tsx scripts/matrix-scene-text-prompt.ts <videoId> [clip]");
  }

  const videos = await videosCollection();
  const base = (await videos.findOne({ _id: new ObjectId(videoId) })) as Project | null;
  if (!base?.phaseA) throw new Error("專案缺少分鏡");

  const row = base.phaseA.clips.find((c) => c.clipNumber === clip);
  if (!row) throw new Error(`找不到 clip ${clip}`);

  type Case = {
    label: string;
    sceneTextEnabled: boolean;
    sceneTextLanguage?: SceneTextLanguage;
  };
  const cases: Case[] = [
    { label: "關閉", sceneTextEnabled: false },
    ...LANGS.map((lang) => ({
      label: `開啟 · ${lang}`,
      sceneTextEnabled: true,
      sceneTextLanguage: lang,
    })),
  ];

  const stored = {
    start: base.frames?.find((f) => f.clipNumber === clip && f.position === "start"),
    end: base.frames?.find((f) => f.clipNumber === clip && f.position === "end"),
  };

  const results = cases.map((c) => {
    const project: Project = {
      ...base,
      sceneTextEnabled: c.sceneTextEnabled,
      ...(c.sceneTextLanguage ? { sceneTextLanguage: c.sceneTextLanguage } : {}),
    };
    const resolved = resolveSceneText(project);
    const startPrompt = buildFramePrompt(project, clip, "start");
    const endPrompt = buildFramePrompt(project, clip, "end");
    const quotedMatch = startPrompt.match(
      /Exact text to render \(only writing allowed in the image\): "([^"]*)"/,
    );
    return {
      case: c.label,
      resolved,
      negativePrompt: sceneTextNegativePrompt(resolved.enabled) ?? null,
      start: {
        hasMandatory: /MANDATORY ON-CANVAS TEXT/.test(startPrompt),
        hasNoText: /No on-canvas text/.test(startPrompt),
        hasLettering: /Lettering:/.test(startPrompt),
        quotedVoiceover: quotedMatch?.[1] ?? null,
        frameLine0: sceneTextFrameLines(resolved.enabled, resolved.language, row.englishVo)[0],
        promptChars: startPrompt.length,
      },
      end: {
        hasMandatory: /MANDATORY ON-CANVAS TEXT/.test(endPrompt),
        hasNoText: /No on-canvas text/.test(endPrompt),
        promptChars: endPrompt.length,
      },
    };
  });

  console.log(
    JSON.stringify(
      {
        projectId: videoId,
        title: base.phaseA.localizedTitle,
        clip,
        englishVo: row.englishVo,
        db: {
          sceneTextEnabled: base.sceneTextEnabled,
          sceneTextLanguage: base.sceneTextLanguage,
          storedStart: stored.start
            ? sceneTextPromptSummary(stored.start.prompt)
            : null,
          storedEnd: stored.end ? sceneTextPromptSummary(stored.end.prompt) : null,
        },
        matrix: results,
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
