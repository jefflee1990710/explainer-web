// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { followShotDirectorBlock } from "@/service/director/skill-rules";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the camera motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "Direct in timed beats across the full duration (see the clip's durationSeconds), with one clean continuous third-person follow shot per beat.",
  "Play body locomotion and gesture motion with authentic live-action physics and natural human timing: genuine weight transfer, natural inertia, real cloth drape, and expressive facial acting.",
  "Follow the camera movement described in motionCamera with natural optical depth of field.",
].join(" ");

export const followShotDirectorRules: DirectorRuleModule = {
  slug: "follow-shot-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene as four concrete parts: 1) Character (expression, third-person motion pose, eyeline), 2) Set (consistent location from the source), 3) Light (light direction, colour temperature, mood), 4) Camera (locked-angle third-person follow framing).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "motionCamera describes the one continuous third-person movement beat.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "Clip 2+ copies the previous endScene's place, camera angle, and body position. One continuous third-person beat per clip.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS, ZERO INVENTED PLOTS): Stage ONLY the exact movement and setting from the user's source. NEVER invent extra symbolic props.",
      followShotDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: ALWAYS state camera details, pointing direction, and camera motion FIRST (e.g. '24mm camera pointing to character from low level, ...'), then describe the motion as timed beats across the clip, naming the physical step/turn, facial expression, and follow camera framing, with all directions relative to the camera (toward camera, walking to left side of camera, leaving camera from right side).";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
