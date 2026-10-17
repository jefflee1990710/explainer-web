import { isTalkingHeadSkill } from "@/service/director/talking-head";

// Style does not change the storyboard.
export function usesSteadyStills(
  _skillSlug?: string,
  _style?: { id?: string; name?: string },
) {
  return false;
}

// Except talking-head directors, all directors skip the end still and generate video from start still + camera motion.
export function clipSkipsEndStill(project: { skillSlug?: string; styleId?: string }) {
  if (!project.skillSlug) return true;
  return !isTalkingHeadSkill(project.skillSlug);
}

type StoryboardOwner = {
  skillSlug?: string;
  styleId?: string;
  phaseA?: { clips: Array<{ clipNumber: number }> };
};

// Talking-head clip with a later clip: its video lands on that clip's start still.
export function clipEndIsNextStart(project: StoryboardOwner, clipNumber: number) {
  if (!isTalkingHeadSkill(project.skillSlug)) return false;
  return Boolean(project.phaseA?.clips.some((clip) => clip.clipNumber === clipNumber + 1));
}

// This clip draws no end still of its own. Talking-head draws one for the last clip only.
export function clipDrawsNoEndStill(project: StoryboardOwner, clipNumber: number) {
  return clipSkipsEndStill(project) || clipEndIsNextStart(project, clipNumber);
}
