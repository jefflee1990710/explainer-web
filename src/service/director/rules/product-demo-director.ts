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
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with one clean continuous shot per beat and no repeats (never flash the same object or action twice).",
  "Play body and object motion with authentic live-action physics and natural human timing: genuine weight transfer, natural inertia, subtle breathing, natural blinks, real cloth drape, and expressive facial acting synced to the beat.",
  "Follow the camera movement described in motionCamera with natural optical depth of field. Layer diegetic sound effects matched to each physical product action in the beats.",
].join(" ");

export const productDemoDirectorRules: DirectorRuleModule = {
  slug: "product-demo-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (expression, pose, product interaction, eyeline), 2) Set (location and the locked product), 3) Light (light direction, colour temperature, mood), 4) Camera (shot size, angle, composition).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the timed beats of the character demonstrating the product and the camera framing.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the opening frame at t=0s showing the product in use, and motionCamera describes the continuous product demonstration action across durationSeconds. Exactly one instance of each character per frame.";
  },
  phaseADirectorBlock() {
    return "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS, ZERO INVENTED PLOTS): Stage ONLY the product, features, locations, and actions explicitly written in the user's source or attached product references. NEVER invent unrelated symbolic props or extra objects.";
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: ALWAYS state camera details, pointing direction, and camera motion FIRST (e.g. '24mm camera pointing to character from low level, ...'), then describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), naming the product interaction, facial expression, and camera framing, with all movement directions relative to the camera (toward camera, walking to left side of camera, leaving camera from right side). Never re-describe a character's appearance or outfit.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
