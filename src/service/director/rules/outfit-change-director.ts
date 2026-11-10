// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { outfitChangeDirectorBlock } from "@/service/director/skill-rules";
import { OUTFIT_CHANGE_VIDEO_MOTION_RULES } from "@/service/director/outfit-change";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

export const outfitChangeDirectorRules: DirectorRuleModule = {
  slug: "outfit-change-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (calm editorial expression, planted pose in that clip's complete reference outfit), 2) Set (empty cream-white room, plain wall, no props), 3) Light (soft even studio daylight), 4) Camera (locked eye-level three-quarter waist-up to mid-thigh crop).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Clothes follow that clip's assigned clothing reference 100%; face and hair follow the character blueprint.",
      "motionCamera describes one small breath or subtle weight shift on a 100% locked camera.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "Every clip stays in the exact same empty cream-white room on a locked camera; each clip hard-cuts to a new complete outfit from the assigned clothing reference.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS): Empty cream-white room with zero furniture and zero props.",
      outfitChangeDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules() {
    return OUTFIT_CHANGE_VIDEO_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: ALWAYS state the locked camera details and pointing direction FIRST; keep the camera 100% locked and play only a subtle editorial breath and weight shift with closed mouth, with all directions relative to the camera.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
