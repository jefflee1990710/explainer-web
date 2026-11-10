// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { papercraftDioramaDirectorBlock } from "@/service/director/skill-rules";
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
  "Animate one physical papercraft mechanism with tactile cardstock weight and rigid paper geometry; cardstock pieces never morph, melt, or dissolve.",
  "Follow the camera movement described in motionCamera with shallow macro tabletop depth of field. Layer diegetic paper/craft sound effects matched to each physical action in the beats.",
].join(" ");

export const papercraftDioramaDirectorRules: DirectorRuleModule = {
  slug: "papercraft-diorama-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene (and startScene / endScene) as four concrete parts: 1) Character (none — pure 3D cardstock diorama), 2) Set (miniature cardstock set and mechanisms from the topic), 3) Light (soft tabletop studio lighting), 4) Camera (macro angle and composition).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "motionCamera describes the physical papercraft mechanism across timed beats.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return "startScene is the t=0 miniature cardstock still and endScene is the t=N landed cardstock state. Keep cardstock geometry rigid across the clip.";
  },
  phaseADirectorBlock() {
    return [
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS): Stage the miniature cardstock sets around the user's source topic without unrelated filler objects.",
      papercraftDioramaDirectorBlock(),
    ].join(" ");
  },
  phaseBMotionRules() {
    return SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base =
      "Detail: ALWAYS state macro camera details, pointing direction, and camera motion FIRST, then describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), naming the cardstock mechanism and camera framing, with all directions relative to the camera.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
