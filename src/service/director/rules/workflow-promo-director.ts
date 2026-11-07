// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { workflowPromoDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), animating the workflow step or ROI reveal cleanly.",
].join(" ");

export const workflowPromoDirectorRules: DirectorRuleModule = {
  slug: "workflow-promo-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene (and startScene / endScene) as four concrete parts: 1) Character (expression, pose, workflow interaction), 2) Set (workflow step or device frame from the source), 3) Light (light direction, colour temperature, mood), 4) Camera (shot size, angle, composition).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the timed beats transitioning from Beat 1 to Beat 2.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "startScene is Beat 1 at t=0s and endScene is Beat 2 at t=N. Exactly one instance of each character per frame.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS): Stage ONLY the workflow steps, metrics, and deliverables from the user's source.",
      workflowPromoDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: describe the motion as timed beats across the clip, naming the workflow interaction and camera framing.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
