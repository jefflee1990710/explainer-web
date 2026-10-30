import { getDirectorBySlug } from "@/service/director/catalog";
import { isDiagramExplainerSkill } from "@/service/director/explainer-family";
import { isTalkingHeadSkill } from "@/service/director/talking-head";

// Concept explainers (whiteboard & paper-cutout) always use steady 2D planar stills
// (locked angle & crop inside a clip; gentle parallax push-in/pull-out only) so single-frame
// I2V never warps or morphs a flat 2D diagram canvas.
export function usesSteadyStills(
  skillSlug?: string,
  style?: { id?: string; name?: string },
) {
  void style;
  return isDiagramExplainerSkill(skillSlug);
}

// Driven by `IDirector.behavior.keyframeMode`: start-only directors skip the end still.
export function clipSkipsEndStill(project: { skillSlug?: string; styleId?: string }) {
  if (!project.skillSlug) return true;
  const director = getDirectorBySlug(project.skillSlug);
  if (director) return director.behavior.keyframeMode === "start-only";
  return !isTalkingHeadSkill(project.skillSlug);
}

type StoryboardOwner = {
  skillSlug?: string;
  styleId?: string;
  phaseA?: { clips: Array<{ clipNumber: number }> };
};

// Driven by `IDirector.behavior.keyframeMode === "end-is-next-start"`: a clip with a later clip lands on that clip's start still.
export function clipEndIsNextStart(project: StoryboardOwner, clipNumber: number) {
  const director = getDirectorBySlug(project.skillSlug);
  const usesNextStart = director
    ? director.behavior.keyframeMode === "end-is-next-start"
    : isTalkingHeadSkill(project.skillSlug);
  if (!usesNextStart) return false;
  return Boolean(project.phaseA?.clips.some((clip) => clip.clipNumber === clipNumber + 1));
}

// This clip draws no end still of its own. Talking-head draws one for the last clip only.
export function clipDrawsNoEndStill(project: StoryboardOwner, clipNumber: number) {
  return clipSkipsEndStill(project) || clipEndIsNextStart(project, clipNumber);
}
