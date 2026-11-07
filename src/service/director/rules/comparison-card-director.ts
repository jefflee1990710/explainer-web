// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { comparisonCardDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), keeping the split comparison layout clear while animating the contrast inside both panels.",
].join(" ");

export const comparisonCardDirectorRules: DirectorRuleModule = {
  slug: "comparison-card-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (host expression and pose if present), 2) Set (split Panel A and Panel B views from the source), 3) Light (contrasting or balanced light), 4) Camera (split-frame composition).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the timed beats contrasting Panel A and Panel B.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the split Panel A | Panel B comparison frame at t=0s, and motionCamera describes the contrast action across durationSeconds.";
  },
  phaseADirectorBlock(options) {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS): Stage ONLY the comparison panels and subjects from the user's source.",
      options.sceneTextEnabled !== false
        ? comparisonCardDirectorBlock(options.aspectRatio ?? "9:16")
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: describe the motion as timed beats across the clip, naming the action in Panel A and Panel B. Never re-describe a character's appearance or outfit.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
