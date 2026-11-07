// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import {
  dialogueOnlyDirectorBlock,
  surpriseInterviewDirectorBlock,
} from "@/service/director/skill-rules";
import {
  SURPRISE_VARIETY_VIDEO_RULES,
  surpriseVideoMotionRules,
} from "@/service/director/surprise-interview";
import {
  SELF_SHOT_LIGHT_DIRECTOR_RULE,
  SELF_SHOT_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

export const surpriseInterviewDirectorRules: DirectorRuleModule = {
  slug: "surprise-interview-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (speaker expression, pose, eyeline to lens), 2) Set (location), 3) Light (natural light), 4) Camera (overhead hook drop on clip 1; locked angle on clip 2+).",
      ...(options.realistic ? [SELF_SHOT_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the hook camera drop on clip 1 and the locked-angle speaking performance on later clips.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "Clip 1 drops from overhead onto the face; Clip 2+ copies the previous end still's angle and pose.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS): Stage ONLY the interview lines and setting without invented symbolic props.",
      dialogueOnlyDirectorBlock(),
      surpriseInterviewDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules(options) {
    if (options.clipNumber != null) {
      return surpriseVideoMotionRules(options.clipNumber, options.place);
    }
    return SURPRISE_VARIETY_VIDEO_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: describe the motion as timed beats across the clip, naming the speaker's expression and lip-sync. Never re-describe a character's appearance or outfit.";
    if (!options.realistic) return base;
    return `${base} ${SELF_SHOT_VIDEO_DETAIL_RULE}`;
  },
};
