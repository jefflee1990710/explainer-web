// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { talkingHeadDirectorBlock } from "@/service/director/talking-head";
import { talkingVideoMotionRules } from "@/service/director/talking-performance";
import { resolvePerformance } from "@/service/director/performance";
import {
  SELF_SHOT_LIGHT_DIRECTOR_RULE,
  SELF_SHOT_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

export const talkingHeadDirectorRules: DirectorRuleModule = {
  slug: "talking-head-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (seated speaker expression, head angle, eyeline to lens), 2) Set (consistent indoor room corner), 3) Light (warm natural indoor/window light), 4) Camera (locked selfie/tripod close-up).",
      ...(options.realistic ? [SELF_SHOT_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes natural talking-head delivery and subtle expression shifts.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the locked seated talking-head framing. Keep the same room, light, and crop across clips.";
  },
  phaseADirectorBlock(options) {
    return talkingHeadDirectorBlock(
      "talking-head-director",
      options.aspectRatio ?? "9:16",
      options.performance ?? resolvePerformance(undefined, "face", "en"),
      Boolean(options.subtitleOverlay),
      options.sceneTextEnabled === false,
      Boolean(options.realistic),
    );
  },
  phaseBMotionRules(options) {
    return talkingVideoMotionRules("face", options.performance);
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: ALWAYS state camera details, pointing direction, and locked framing FIRST, then describe the motion as timed beats across the clip, naming the talking expression and head/eye focus relative to the camera. Never re-describe a character's appearance or outfit.";
    if (!options.realistic) return base;
    return `${base} ${SELF_SHOT_VIDEO_DETAIL_RULE}`;
  },
};
