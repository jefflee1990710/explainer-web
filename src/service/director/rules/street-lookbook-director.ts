// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { streetLookbookDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with authentic live-action physics, natural cloth drape, composed editorial micro-actions, and steady or gentle gimbal framing.",
].join(" ");

export const streetLookbookDirectorRules: DirectorRuleModule = {
  slug: "street-lookbook-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (cool contemplative editorial demeanour, closed mouth, composed pose wearing the assigned reference outfit), 2) Set (textured urban architectural location in natural daylight), 3) Light (natural daylight), 4) Camera (full-body-silhouette, medium-garment-detail, or back-over-shoulder framing).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Clothes follow that clip's assigned clothing reference 100%; face and hair follow the character blueprint.",
      "motionCamera describes composed editorial micro-actions with closed mouth across timed beats.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the t=0s street lookbook frame in the assigned reference outfit, and motionCamera describes the composed editorial micro-action across durationSeconds.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS): Stage ONLY the character wearing the reference garments in clean urban architectural settings without extra handheld props.",
      streetLookbookDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: describe the composed editorial micro-action and natural garment drape across timed beats with closed mouth.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
