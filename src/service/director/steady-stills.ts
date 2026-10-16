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
