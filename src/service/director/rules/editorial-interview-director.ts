// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { editorialInterviewDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with authentic live-action physics, natural human timing, and composed editorial camera movement.",
].join(" ");

export const editorialInterviewDirectorRules: DirectorRuleModule = {
  slug: "editorial-interview-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (composed editorial expression, posture, 15-degree off-camera eyeline on interview-a-roll or silent craft action on lifestyle-b-roll), 2) Set (architectural suite/studio or lifestyle location from the source), 3) Light (directional natural daylight), 4) Camera (rule-of-thirds editorial framing).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the composed interview delivery or tactile lifestyle B-roll action across timed beats.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the t=0s editorial frame, and motionCamera describes the composed action across durationSeconds. Exactly one instance of the protagonist per frame.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS, ZERO INVENTED PLOTS): Stage ONLY the craft, product, and locations from the user's source and attached product references. NEVER invent unrelated symbolic props.",
      editorialInterviewDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: describe the motion as timed beats across the clip, naming the composed action, expression, and editorial camera framing.";
    if (!options.realistic) return base;
    return `${base} ${REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
