// Reference images and resolution for a canvas plan's start stills, matching sendFrame in the director pipeline.

import type { Project } from "@/model/project";
import { TALKING_HEAD_SKILL_SLUG } from "@/service/director/talking-head";
import { loadStoredSkill } from "@/service/director/load-skill";
import { resolveRunSkill } from "@/service/director/run-skill";
import { frameSubmitPlan } from "@/service/higgsfield/frame-prompts";
import { frameLockReferenceUrls } from "@/service/character/cast-prompt";
import { withSceneCharacterLocks } from "@/service/higgsfield/scene-character-lock";
import { isRealisticStyle } from "@/service/style/realistic-light";
import { loadRenderableStyle } from "@/service/style/renderable-style";

export type CanvasPlanFrameInputs = {
  refsByClip: Map<number, string[]>;
  resolution: "1k" | "2k" | "4k";
  // Character lock still. The plan turns this into a character node; clip refs stay.
  characterImageUrl?: string;
  characterLabel?: string;
};

export async function canvasPlanFrameInputs(
  project: Project,
  clipNumbers: number[],
): Promise<CanvasPlanFrameInputs> {
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const realistic = isRealisticStyle(style);
  const stored = await loadStoredSkill(project.skillId);
  const skill = stored ? await resolveRunSkill(stored) : null;
  const refsByClip = new Map<number, string[]>();
  for (const clipNumber of clipNumbers) {
    const refs = frameSubmitPlan(project, clipNumber, "start", undefined, style).refs;
    refsByClip.set(
      clipNumber,
      project.cast && project.cast.length > 0
        ? await withSceneCharacterLocks(project.cast, refs, {
            includeOriginalPhoto: realistic || project.skillSlug === TALKING_HEAD_SKILL_SLUG,
          })
        : refs,
    );
  }
  const characterImageUrl = frameLockReferenceUrls(project)[0];
  const characterLabel = project.cast?.[0]?.name?.trim();
  return {
    refsByClip,
    resolution: realistic ? "2k" : skill?.higgsfieldDefaults.imageResolution || "1k",
    ...(characterImageUrl ? { characterImageUrl } : {}),
    ...(characterLabel ? { characterLabel } : {}),
  };
}
