// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SIGHTLINE_RULE =
  "Sightline: show only what this camera can see. A working face (a person's face, a screen, a page, a sign, a dial, a label) stays aimed at whoever uses it. Draw that content only on that side. If this camera cannot see that side, draw the blank side it does see. Never turn a person or a prop around, and never move the content onto the blank side, just to make it visible.";

const ONE_TAKE_SINGLE_FRAME_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "This is a SINGLE CONTINUOUS ONE-TAKE SHOT (一鏡到底) with ZERO cuts, ZERO camera resets, and ZERO spoken dialogue (`(no dialogue)`).",
  "Direct the entire clip in sequential ~6-second continuous time windows across the full `durationSeconds` (e.g. `0–6s …; 6–12s …; 12–18s …` up to 60s), where each 6s window seamlessly continues the physical momentum, camera trajectory, and environment of the previous window.",
  "Play body and object motion with authentic live-action physics and natural human timing: genuine weight transfer, full-body locomotion (running downhill, sprinting, striding, skating, climbing, or dodging obstacles), natural inertia, subtle chest/shoulder breathing, natural blinks, real cloth and hair movement in the wind, and focused closed-lip facial expression.",
  "Never use whiteboard cardboard cutout physics or cartoon snap/whip verbs for realistic people and sets. Background architecture and terrain scroll naturally past the moving camera without warping or morphing.",
  "Follow the continuous camera movement described in motionCamera (smooth gimbal tracking shot, follow shot, lead shot, or side-tracking shot) with natural optical depth of field. Layer diegetic environmental sound effects (footsteps, wind, gravel, ambient air) matched to each physical movement beat.",
  "The opening frame has no big title, headline plate, or title card. Do not add, hold, or animate one.",
].join(" ");

export const oneTakeDirectorRules: DirectorRuleModule = {
  slug: "one-take-director",
  allowsInventedProps: false,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write explainerScene (and startScene) of the single continuous clip as four concrete parts, in this order:",
      options.realistic
        ? "1) Character: expression, dynamic mid-action pose at t=0s, physical action, and eyeline — give the character a calm, focused, unforced real-person facial expression matching the physical effort (attentive focused eyes; lips naturally closed or breathing softly with ZERO spoken dialogue and ZERO lip-sync; never a blank stare; never exaggerated cartoon grimaces)."
        : "1) Character: expression, dynamic mid-action pose at t=0s, physical action, and eyeline — give the character a vivid, focused facial expression matching the physical action (lips closed with ZERO spoken dialogue and ZERO lip-sync).",
      "2) Set: location, terrain, foreground / midground / background from the user's source.",
      "3) Light: light direction, colour temperature, mood.",
      "4) Camera: continuous tracking camera framing (gimbal follow shot, lead tracking shot, low-angle tracking, or side tracking) and where the character sits in frame.",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      SIGHTLINE_RULE,
      "CAMERA-FIRST & CAMERA-RELATIVE DIRECTION: Always state camera details, pointing direction, and camera motion FIRST (e.g. '24mm camera pointing to character from low level, tracking forward...'), then start other details; all directions given by the director MUST be relative to the camera (e.g. toward camera, walking to left side of camera, leaving camera from right side).",
      "motionCamera is the uninterrupted one-take camera and physical locomotion script across the full clip duration (up to 60s), written as sequential ~6-second time windows (`0–6s …; 6–12s …; 12–18s …`). Each 6s window states: time window → camera details, pointing direction & camera tracking motion first → continuous physical movement progression relative to the camera → diegetic environmental sound.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock() {
    return [
      "Produce EXACTLY 1 CLIP (`clipCount = 1`) covering the entire video duration (6–60 seconds).",
      "explainerScene describes the opening still at t=0s of Clip 1: already mid-action in the user's setting.",
      "Each still shows exactly ONE instance of each named character — never two bodies of the same character in one frame.",
      "motionCamera describes the continuous physical locomotion and uninterrupted camera tracking that plays out from t=0s across the full `durationSeconds` in ~6-second beats. Zero cuts or scene resets.",
    ].join("\n");
  },
  phaseADirectorBlock() {
    return [
      "This is a ONE-TAKE CONTINUOUS MOTION FILM (一鏡到底無旁白長鏡頭), not an explainer.",
      "EXACTLY 1 CLIP (`clipCount = 1`): You MUST output only 1 single clip in `clips` (`clipNumber: 1`). Never split the storyboard into Clip 2, Clip 3, etc. Put the entire video duration (`durationSeconds` from 6 to 60 seconds, matching the user's duration preset or explicit duration request such as 15s, 30s, or 60s / 1 min) into `Clip 1`.",
      "STRICT SOURCE FIDELITY (ZERO INVENTED PROPS, ZERO INVENTED PLOTS): Stage ONLY the exact movement, terrain, locations, and objects explicitly written in the user's source prompt. NEVER invent symbolic props, metaphors, or extra objects. If the user asks for running down a mountain hill, stage ONLY that continuous downhill run.",
      'PURE MOTION, NO VO, NO DIALOGUE: There is NO narrator, NO voiceover, and NO spoken dialogue. `narrator` MUST be "No narrator — pure continuous motion and ambient sound." `englishVo` on Clip 1 MUST be "(no dialogue)". Keep the character\'s mouth naturally closed (zero lip-sync).',
      "CONTINUOUS 6-SECOND BEAT PROGRESSION: In `Clip 1.motionCamera`, break the full `durationSeconds` into sequential ~6-second windows (e.g. `0–6s: ...; 6–12s: ...; 12–18s: ...` up to `durationSeconds`) so the MiniMax H3 `ref2va` latent-extension loop can seamlessly chain each 6-second stage of the one-take camera and body movement without any cut.",
      "FIRST FRAME: Clip 1's opening still has no big title, no headline plate, and no title card. localizedTitle and englishTitle stay in the proposal fields and are never painted on the image.",
    ].join(" ");
  },
  phaseBMotionRules() {
    return ONE_TAKE_SINGLE_FRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base = options.realistic
      ? "Detail: ALWAYS state camera details, pointing direction, and camera motion FIRST (e.g. '24mm camera pointing to character from low level, ...'), then describe the continuous one-take motion as sequential ~6-second beats across the full clip duration (e.g. 0–6s …; 6–12s …), each naming the continuous physical locomotion with all directions relative to the camera (e.g. toward camera, walking to left side of camera, leaving camera from right side), a calm, focused real-person facial expression (natural blinks and focused eyes; lips naturally closed with zero spoken dialogue and zero lip-sync), and the continuous tracking camera movement. The lighting stays consistent. Never re-describe a character's appearance or outfit; it follows the keyframe."
      : "Detail: ALWAYS state camera details, pointing direction, and camera motion FIRST (e.g. '24mm camera pointing to character from low level, ...'), then describe the continuous one-take motion as sequential ~6-second beats across the full clip duration (e.g. 0–6s …; 6–12s …), each naming the continuous physical locomotion with all directions relative to the camera (e.g. toward camera, walking to left side of camera, leaving camera from right side), the focused closed-lip facial expression, and the continuous tracking camera movement. The lighting stays consistent. Never re-describe a character's appearance or outfit; it follows the keyframe.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
