// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { talkingHeadDirectorBlock } from "@/service/director/talking-head";
import { talkingVideoMotionRules } from "@/service/director/talking-performance";
import { resolvePerformance } from "@/service/director/performance";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

export const fullBodyTalkingHeadDirectorRules: DirectorRuleModule = {
  slug: "full-body-talking-head-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (standing speaker expression, gesture, eyeline to lens), 2) Set (consistent room), 3) Light (natural room light), 4) Camera (locked full-body framing).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the speaker's delivery and hand gestures on a locked full-body camera.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the locked full-body talking framing. Keep the same room, light, and crop across clips.";
  },
  phaseADirectorBlock(options) {
    return talkingHeadDirectorBlock(
      "full-body-talking-head-director",
      options.aspectRatio ?? "9:16",
      options.performance ?? resolvePerformance(undefined, "full-body", "en"),
      Boolean(options.subtitleOverlay),
      options.sceneTextEnabled === false,
      Boolean(options.realistic),
    );
  },
  phaseBMotionRules(options) {
    return talkingVideoMotionRules("full-body", options.performance);
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: describe the motion as timed beats across the clip, naming the full-body speaker's gesture and expression on a locked camera. Never re-describe a character's appearance or outfit.";
    if (!options.realistic) return base;
    return `${base} ${REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
