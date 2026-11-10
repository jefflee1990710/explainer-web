// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import {
  dialogueOnlyDirectorBlock,
  dialogueQaDirectorBlock,
} from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with one clean continuous shot per beat.",
  "Play body and conversational gesture motion with authentic live-action physics and natural human timing: genuine weight transfer, natural blinks, and expressive facial acting synced to the dialogue line while the listener reacts with closed mouth.",
  "Follow the camera movement described in motionCamera with natural optical depth of field.",
].join(" ");

export const dialogueQaDirectorRules: DirectorRuleModule = {
  slug: "dialogue-qa-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (both ASKER and ANSWERER expressions, poses, and eyelines), 2) Set (shared conversational setting), 3) Light (light direction, colour temperature, mood), 4) Camera (shot size, angle, fixed left/right screen sides).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the speaker's conversational gesture and lip-sync and the listener's silent reaction across timed beats.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "explainerScene describes the t=0s still with both characters on their fixed screen sides. Exactly one instance of each character per frame. No side swap or jump cut.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS, ZERO INVENTED PLOTS): Stage ONLY the conversational Q&A and facts from the user's source. NEVER invent random props or extra objects unless explicitly written in the source.",
      dialogueOnlyDirectorBlock(),
      dialogueQaDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: ALWAYS state camera details, pointing direction, and camera motion FIRST (e.g. '24mm camera pointing to character from low level, ...'), then describe the motion as timed beats across the clip, naming the speaker's conversational gesture and the listener's reaction, with all directions relative to the camera (toward camera, walking to left side of camera, leaving camera from right side). Never re-describe a character's appearance or outfit.";
    if (!options.realistic) return base;
    return `${base} ${REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
