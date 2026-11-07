// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { styleSwitchDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), playing the character's action and camera movement in that clip's assigned visual style.",
].join(" ");

export const styleSwitchDirectorRules: DirectorRuleModule = {
  slug: "style-switch-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (expression, pose, action, eyeline), 2) Set (location from the source), 3) Light (light direction, colour temperature, mood), 4) Camera (shot size, angle, composition).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the timed beats for this clip.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the opening still at t=0s in that clip's assigned styleId, and motionCamera describes the continuous action across durationSeconds.";
  },
  phaseADirectorBlock(options) {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS, ZERO INVENTED PLOTS): Stage ONLY the actions and locations from the user's source.",
      styleSwitchDirectorBlock(options.styles ?? []),
    ].join(" ");
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: describe the motion as timed beats across the clip, naming the action, expression, and camera framing.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
