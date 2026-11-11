import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import type { Project } from "@/model/project";
import { enqueueOpencutOnScreenText } from "@/service/opencut/on-screen-text";

export type AutoOnScreenTextTarget = {
  clipIndex: number;
  text: string;
  playheadSeconds: number;
};

// Extract clean hook headline from quotes 「...」 or fallback to title/voiceover
export function extractCleanHookText(input: {
  sceneText?: string;
  fallbackTitle?: string;
  fallbackVo?: string;
}): string {
  const { sceneText, fallbackTitle, fallbackVo } = input;
  if (sceneText) {
    const quoteMatch = sceneText.match(/[「"“]([^」"”]+)[」"”]/);
    if (quoteMatch?.[1]?.trim()) {
      return quoteMatch[1].trim();
    }
  }
  const cleanTitle = (fallbackTitle ?? "")
    .replace(/[「」"“”]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanTitle) {
    return cleanTitle.length > 40 ? `${cleanTitle.slice(0, 38).trim()}…` : cleanTitle;
  }
  const cleanVo = (fallbackVo ?? "")
    .replace(/[「」"“”]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanVo) {
    return cleanVo.length > 40 ? `${cleanVo.slice(0, 38).trim()}…` : cleanVo;
  }
  return "Hook";
}

// Resolve target clips and texts for Explainer auto on-screen text
export function resolveExplainerAutoOnScreenTextTargets(
  project: Project,
): AutoOnScreenTextTarget[] {
  if (project.skillSlug !== "explainer" && !project.skillSlug?.includes("explainer")) {
    return [];
  }
  if (!project.onScreenTextStyleId) {
    return [];
  }

  const coverage = project.onScreenTextCoverage || "hook";
  const storyboard = project.phaseA?.clips || (project.phaseA as any)?.storyboard || [];
  const clips = project.clips || [];

  if (coverage === "hook") {
    const firstScene = storyboard[0]?.startScene || (storyboard[0] as any)?.explainerScene;
    const text = extractCleanHookText({
      sceneText: firstScene,
      fallbackTitle: project.phaseA?.localizedTitle,
      fallbackVo: storyboard[0]?.startVo,
    });
    return [{ clipIndex: 0, text, playheadSeconds: 0 }];
  }

  const count = Math.max(storyboard.length, clips.length, 1);
  const targets: AutoOnScreenTextTarget[] = [];
  let currentSeconds = 0;

  for (let i = 0; i < count; i++) {
    const sb = storyboard[i];
    const clip = clips[i];
    const sceneText = sb?.startScene || (sb as any)?.explainerScene;
    const text = extractCleanHookText({
      sceneText,
      fallbackTitle: i === 0 ? project.phaseA?.localizedTitle : undefined,
      fallbackVo: sb?.startVo,
    });

    targets.push({
      clipIndex: i,
      text,
      playheadSeconds: Math.round(currentSeconds * 10) / 10,
    });

    const dur = clip?.durationSeconds ?? 5;
    currentSeconds += dur;
  }

  return targets;
}

// Background orchestrator that enqueues on-screen text jobs for Explainer videos
export async function triggerExplainerAutoOnScreenText(
  projectId: string | ObjectId,
): Promise<{ ok: boolean; enqueuedCount: number; error?: string }> {
  try {
    const id = typeof projectId === "string" ? new ObjectId(projectId) : projectId;
    const projects = await videosCollection();
    const project = await projects.findOne({ _id: id });
    if (!project) {
      return { ok: false, enqueuedCount: 0, error: "專案不存在" };
    }

    const targets = resolveExplainerAutoOnScreenTextTargets(project);
    if (targets.length === 0) {
      return { ok: true, enqueuedCount: 0 };
    }

    const existingClipIndices = new Set(
      (project.onscreenTexts || []).map((item) => item.clipIndex ?? 0),
    );

    let enqueuedCount = 0;
    for (const target of targets) {
      if (existingClipIndices.has(target.clipIndex)) {
        continue;
      }
      const res = await enqueueOpencutOnScreenText({
        videoId: project._id.toHexString(),
        textStyleId: project.onScreenTextStyleId!,
        text: target.text,
        clipIndex: target.clipIndex,
        playheadSeconds: target.playheadSeconds,
      });
      if (res.ok) {
        enqueuedCount++;
      }
    }

    return { ok: true, enqueuedCount };
  } catch (error) {
    return {
      ok: false,
      enqueuedCount: 0,
      error: error instanceof Error ? error.message : "自動產生畫面文字失敗",
    };
  }
}
