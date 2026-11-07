// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with one clean continuous shot per beat and no repeats.",
  "Play hands-on step demonstration motion with authentic live-action physics and natural human timing, following the camera movement in motionCamera.",
].join(" ");

export const tutorialDirectorRules: DirectorRuleModule = {
  slug: "tutorial-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (instructor expression, hands-on step action, eyeline), 2) Set (locked workspace and only the tools/inputs named in the source), 3) Light (light direction, colour temperature, mood), 4) Camera (shot size, angle, composition).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the timed beats performing this tutorial step.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the t=0s state before the step action, and motionCamera describes the step being performed across durationSeconds. Exactly one instance of each character per frame.";
  },
  phaseADirectorBlock() {
    return "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS, ZERO INVENTED PLOTS): Stage ONLY the exact steps, tools, and workspace items explicitly written in the user's source. NEVER invent unrelated symbolic props or extra objects.";
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: describe the motion as timed beats across the clip, naming the hands-on step action, facial expression, and camera framing. Never re-describe a character's appearance or outfit.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
