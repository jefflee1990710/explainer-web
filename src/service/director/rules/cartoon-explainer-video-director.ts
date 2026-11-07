// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.

import type { DirectorRuleModule } from "@/service/director/rules/types";
import { cartoonExplainerDirectorBlock } from "@/service/director/skill-rules";
import { keyframeDeltaDirectorBlock } from "@/service/director/keyframe-delta";
import {
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_NARRATOR_VIDEO_DETAIL_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

const SIGHTLINE_RULE =
  "Sightline: show only what this camera can see. A working face (a person's face, a screen, a page, a sign, a dial, a label) stays aimed at whoever uses it. Draw that content only on that side. If this camera cannot see that side, draw the blank side it does see. Never turn a person or a prop around, and never move the content onto the blank side, just to make it visible.";

const EXPLAINER_GLIDE_MOTION_RULES = [
  "Only the START storyboard image is attached, as the first frame. There is no end image and no last frame.",
  "Never call that still a reference image.",
  "Reply with the start scene and the motion. endScene is where this clip's action lands: write that landing into the motion. Do not ask the video to match a second picture.",
  "CAMERA LOCK (NO ZOOM-IN / NO PUSH-IN): keep the camera 100% locked and stationary square-on to the board for the entire clip — NEVER zoom in, push in, pull out, or pan the camera.",
  "FAST, ACCELERATED, TIGHT PACING (NO SLOW MOTION): play all character gestures and on-board element transitions at a brisk, accelerated, high-energy pace (1.3x–1.5x snappy stop-motion / kinetic explainer speed) with zero sluggish glides and zero dead holds. Pack the clip with rapid-fire visual beats every 1.0–1.5 seconds (0.0–1.2s, 1.2–2.5s, 2.5–4.0s, 4.0–end): elements whip/slide in and out at high speed (快速滑入／滑出), folded paper cards snap and unfold flat in under 0.5s (快速摺開), top cover strips tear or peel away briskly to reveal the card underneath (快速撕開), connecting arrows/lines/circles draw themselves rapidly stroke-by-stroke across the board (快速畫出), two-sided cards flip briskly through their edge (快速翻轉), and takeaway badges stamp down with crisp impact while the character briskly points their hand and gaze from Focus Point 1 → Focus Point 2 → Focus Point 3.",
  "Use at most ONE directional arrow per clip (never stack multiple arrows or spawn extra flying arrows if one is already on screen), and never slide blank grey slash strips or masking-tape stickers over headers.",
  "Whiteboard cardboard physics: every prop, card, diagram block, arrow, chart bar, shape, and tag moves as a single rigid flat cardboard/paper cutout piece in one piece. Elements slide briskly in and out of the screen, unfold, tear open, or snap into place without bending, melting, dissolving, or morphing into another shape. Background and set layers stay 100% stationary and rigid.",
  "Write high-velocity speed into every verb (whips in, snaps open, tears away briskly, zips across, flips rapidly, stamps down, points sharply). Never use slow, gentle, gradual, or leisurely verbs, and never leave the character or diagram holding still. Never skip a frame and never cut.",
  "The character stays in their presenter corner keeping the same screen position and scale while pointing briskly at each active focus point.",
].join(" ");

export const cartoonExplainerVideoDirectorRules: DirectorRuleModule = {
  slug: "cartoon-explainer-video-director",
  allowsInventedProps: true,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene (and startScene / endScene when used) as four concrete parts, in this order:",
      options.realistic
        ? "1) Character: expression, pose, action, and eyeline of each on-screen character — whenever a character is present, give them a calm, relaxed, unforced real-person facial expression matching the beat (attentive focused eyes and softly closed lips at natural rest; never write a forced closed-lip smile or smirk; never a blank, deadpan, or expressionless stare; never exaggerated cartoon grimaces, wide saucer eyes, or puffed cheeks)."
        : "1) Character: expression, pose, action, and eyeline of each on-screen character — whenever a character is present, give them a vivid, specific facial expression (active eyebrows, expressive eyes, and a clear mouth/cheek emotion matching the beat, never a blank or neutral face).",
      "2) Set: location, set dressing, props, foreground / midground / background.",
      "3) Light: light direction, colour temperature, mood.",
      "4) Camera: shot size, camera angle, composition, and where each character sits in frame (left / centre / right, near / far).",
      ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
      "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
      "Be specific (a chipped blue mug, warm side light from a window on the left), not generic (a nice room).",
      SIGHTLINE_RULE,
      "motionCamera is the transition script from the start still to the end still, written as timed beats across the clip (e.g. 0–2s …; 2–5s …).",
      options.realistic
        ? "Each beat states: time window → who or what moves → from where to where → how (picked up, set down, slid in from the frame edge, written on, wiped off) → the normal, alive facial expression shift (engaged real-person brow and eye focus when a character is present; never a blank or deadpan stare; never exaggerated cartoon faces) and the camera framing."
        : "Each beat states: time window → who or what moves → from where to where → how (picked up, set down, slid in from the frame edge, written on, wiped off) → the expression change (vivid brow, eye, and mouth shifts when a character is present) and the camera framing.",
      "Every difference between the start and end still gets a beat that shows its cause on camera: pose, each hand, eyeline, expression, and every prop or label that moves, appears, disappears, or changes state.",
      "A prop that is in the end still but not in the start still is either added to the start still, or enters on camera in a beat (placed by a hand, slides in from the frame edge).",
      "A prop that is in the start still but not in the end still leaves on camera in a beat (put away, moved off frame, covered).",
      "Name each hand by the character's own left or right, and keep the same hand on the same prop from the start still through motionCamera to the end still.",
      "The start and end still of one clip share the same light and the same place. endScene is the opening still after motionCamera has finished: its Camera line is the landed shot size, angle, and where subjects sit. If motionCamera keeps the camera locked, keep that Camera line. Write the landed picture, not the in-between path.",
      "Before returning, compare each clip's start and end still item by item: every difference appears in motionCamera, and every object motionCamera touches already exists in the start still or enters in a beat.",
    ].join(" ");
  },
  phaseAKeyframeDeltaBlock(options) {
    return keyframeDeltaDirectorBlock({
      separateStills: true,
      language: options.language,
      performance: Boolean(options.hasCharacter),
      steadyStills: options.steadyStills ?? true,
    });
  },
  phaseADirectorBlock(options) {
    return cartoonExplainerDirectorBlock({
      hasCharacter: options.hasCharacter,
      smoothMotion: options.smoothMotion ?? true,
      canvas: "whiteboard",
      backgroundId: options.backgroundId,
      customBackground: options.customBackground,
      realistic: options.realistic,
    });
  },
  phaseBMotionRules() {
    return EXPLAINER_GLIDE_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base = options.realistic
      ? "Detail: describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), each naming the action, a calm, relaxed, unforced real-person facial expression (lips softly closed at natural rest with zero mouth or jaw speech articulation, natural blinks, and attentive eye focus; never write a forced closed-lip smile or tight smirk; never a blank or deadpan stare; never exaggerated cartoon grimaces), and the camera start and end framing. Name which hand, which direction, and which prop. The lighting stays constant and matches both keyframes. Never re-describe a character's appearance or outfit; it follows the keyframes."
      : "Detail: describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), each naming the action, the expression change, and the camera start and end framing. Whenever a character is on screen, animate rich, expressive facial changes across the beats (lively eyebrows, expressive eyes, cheek and mouth reactions synced to the beat, never a frozen or deadpan face). Name which hand, which direction, and which prop. The lighting stays constant and matches both keyframes. Never re-describe a character's appearance or outfit; it follows the keyframes.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
