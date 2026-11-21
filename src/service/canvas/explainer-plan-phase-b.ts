// Phase B for every clip of a Canvas Explainer plan (same inputs as task-senders' clip video).

import type { PhaseBPrompt, Project } from "@/model/project";
import { withCurrentCharacterVoices } from "@/service/character/voice-cast";
import { loadStoredSkill } from "@/service/director/load-skill";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { resolveRunSkill } from "@/service/director/run-skill";
import { resolveSceneText } from "@/service/director/scene-text";
import { loadRenderableStyle } from "@/service/style/renderable-style";

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
