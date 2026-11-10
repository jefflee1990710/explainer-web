// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { talkingBrollDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with authentic live-action physics, natural human timing, and camera movement matching motionCamera.",
].join(" ");

export const talkingBrollDirectorRules: DirectorRuleModule = {
  slug: "talking-broll-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (on-camera speaker or absent on b-roll), 2) Set (consistent room for on-camera; concrete subject for b-roll), 3) Light (light direction, colour temperature, mood), 4) Camera (medium close-up for on-camera; cutaway framing for b-roll).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the speaker's delivery on on-camera clips and the cutaway motion on b-roll clips.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the t=0s frame for this on-camera or b-roll clip, and motionCamera describes the continuous action across durationSeconds.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS, ZERO INVENTED PLOTS): Stage ONLY the subjects and facts from the user's source. NEVER invent unrelated symbolic props.",
      talkingBrollDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: ALWAYS state camera details, pointing direction, and camera motion FIRST (e.g. '24mm camera pointing to character from low level, ...'), then describe the motion as timed beats across the clip, naming the action, expression change, and camera framing, with all directions relative to the camera (toward camera, walking to left side of camera, leaving camera from right side). Never re-describe a character's appearance or outfit.";
    if (!options.realistic) return base;
    return `${base} ${REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
