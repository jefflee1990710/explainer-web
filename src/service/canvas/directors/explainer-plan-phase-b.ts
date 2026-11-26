// Phase B for every clip of a Canvas Explainer plan (same inputs as task-senders' clip video).

import type { PhaseBPrompt, Project } from "@/model/project";
import { withCurrentCharacterVoices } from "@/service/character/voice-cast";
import { loadStoredSkill } from "@/service/director/load-skill";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { resolveRunSkill } from "@/service/director/run-skill";
import { resolveSceneText } from "@/service/director/scene-text";
import { withWrittenCanvas } from "@/service/director/written-chinese";
import { frameSubmitPlan, IMAGE_PROMPT_MAX_CHARS } from "@/service/higgsfield/frame-prompts";
import {
  ensureTextStylePlaceholder,
  MAX_TEXT_STYLE_LINE_CHARS,
  templateTextStyleLine,
  TEXT_STYLE_VAR,
} from "@/service/canvas/core/settings/explainer-text-style";
import { promptPlaceholder } from "@/service/canvas/core/settings/template";
import { isDiagramExplainerSkill } from "@/service/director/explainer-family";
import { ensureFramePromptFits } from "@/service/higgsfield/shorten-frame-prompt";
import { heyGenAvatarIvMotionPrompt } from "@/service/openrouter/generate";
import { loadRenderableStyle } from "@/service/style/renderable-style";

// Full canvas plan: every clip's video prompt plus its start-still prompt.
export async function planCanvasExplainer(project: Project) {
  const prompts = await runCanvasPlanPhaseB(project);
  const framePrompts = await buildCanvasPlanFramePrompts(project);
  return { prompts, framePrompts };
}

// Talking Head plan: HeyGen motion prompt per clip (same text the director pipeline submits).
export function talkingHeadPlanPrompts(project: Project): PhaseBPrompt[] {
  return (project.phaseA?.clips ?? []).map((clip) => ({
    clipNumber: clip.clipNumber,
    durationSeconds: clip.durationSeconds,
    prompt: heyGenAvatarIvMotionPrompt(project.talkingHeadPoseId, {
      spokenScript: clip.englishVo,
      directorMotionNote: clip.motionCamera,
      motionPrompt: clip.motionPrompt,
      language: project.language,
    }),
  }));
}

// One opening still is shared by every Talking Head clip, so only Clip 1 needs a frame prompt.
export async function planCanvasTalkingHead(project: Project) {
  const framePrompts = (await buildCanvasPlanFramePrompts(project)).filter(
    (frame) => frame.clipNumber === 1,
  );
  return { prompts: talkingHeadPlanPrompts(project), framePrompts };
}

// Same prompt regenerateFrames would build (written-Chinese labels, style), so prefilled text matches the director.
export async function buildCanvasPlanFramePrompts(project: Project) {
  const written = await withWrittenCanvas(project);
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const look = project.onScreenTextStyleId || project.subtitleLook;
  return Promise.all(
    (written.phaseA?.clips ?? []).map(async (clip) => {
      const built = frameSubmitPlan(written, clip.clipNumber, "start", undefined, style).prompt;
      // Explainer lettering becomes `{{text_style}}`, filled by the wired Setting at run time.
      const templated =
        look && isDiagramExplainerSkill(project.skillSlug)
          ? templateTextStyleLine(built, look)
          : { prompt: built, templated: false };
      // The image node sends this text as-is, so shorten it here like sendFrame does,
      // leaving room for the longest text style line.
      const budget = templated.templated
        ? IMAGE_PROMPT_MAX_CHARS - MAX_TEXT_STYLE_LINE_CHARS + promptPlaceholder(TEXT_STYLE_VAR).length
        : IMAGE_PROMPT_MAX_CHARS;
      const fitted = await ensureFramePromptFits(templated.prompt, undefined, budget).catch(() => templated.prompt);
      const prompt = templated.templated ? ensureTextStylePlaceholder(fitted) : fitted;
      return { clipNumber: clip.clipNumber, prompt };
    }),
  );
}

// Runs one Phase B call per clip with bounded concurrency; results stay in clip order.
export async function collectPhaseBPrompts(
  clipNumbers: number[],
  runClip: (clipNumber: number) => Promise<PhaseBPrompt>,
  concurrency = 3,
): Promise<PhaseBPrompt[]> {
  const results = new Map<number, PhaseBPrompt>();
  const queue = [...clipNumbers];
  const worker = async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      results.set(next, await runClip(next));
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, queue.length)) }, worker),
  );
  return clipNumbers.map((n) => results.get(n)!);
}

export async function runCanvasPlanPhaseB(project: Project): Promise<PhaseBPrompt[]> {
  if (!project.phaseA) throw new Error("尚未有分鏡");
  const stored = await loadStoredSkill(project.skillId);
  if (!stored) throw new Error("找不到風格");
  const skill = await resolveRunSkill(stored);
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const cast = await withCurrentCharacterVoices(project.cast);
  const phaseA = project.phaseA;
  return collectPhaseBPrompts(
    phaseA.clips.map((clip) => clip.clipNumber),
    (clipNumber) =>
      runPhaseBForClip({
        skill,
        style,
        phaseA,
        clipNumber,
        language: project.language,
        narrationEnabled: project.narrationEnabled,
        voiceGender: project.voiceGender,
        speechPace: project.speechPace,
        characterImageUrl: project.characterImageUrl,
        cast,
        sceneTextOff: !resolveSceneText(project).enabled,
        directorBackgroundId: project.directorBackgroundId,
        backgroundImageUrls: project.backgroundImageUrls,
      }),
  );
}
