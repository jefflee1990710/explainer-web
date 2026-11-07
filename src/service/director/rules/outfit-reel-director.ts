// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { outfitReelDirectorBlock } from "@/service/director/skill-rules";
import { OUTFIT_VIDEO_MOTION_RULES } from "@/service/director/outfit-reel";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

export const outfitReelDirectorRules: DirectorRuleModule = {
  slug: "outfit-reel-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (radiant smile, planted full-body pose), 2) Set (one consistent room), 3) Light (even daylight), 4) Camera (full-body head-to-shoes framing and gimbal rotation axis).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Clothes follow the attached clothing reference 100%; face and hair follow the character blueprint.",
      "motionCamera describes one slow single-axis gimbal rotation around the planted character.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the full-body outfit framing in one room, and motionCamera describes the single-axis gimbal rotation. Head and shoes stay in frame.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS): Stage ONLY the character wearing the reference outfit in one clean room with zero extra props.",
      outfitReelDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules() {
    return OUTFIT_VIDEO_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: describe the slow gimbal camera rotation around the planted character with silent closed-mouth smile. Never re-describe appearance.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
