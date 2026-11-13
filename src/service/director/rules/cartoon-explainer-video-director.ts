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

const EXPLAINER_DUAL_KEYFRAME_MOTION_RULES = [
  "Both START (State A) and END (State B) storyboard images for this clip are attached as first/last frames to MiniMax H3. Never call those stills a reference image.",
  "CAMERA LOCK (2D PLANAR): keep the 2D planar camera locked and steady on the canvas/board across the whole clip — never tilt into 3D perspective, never orbit, and never zoom onto the character's face.",
  "CONCRETE PHYSICAL TRANSFORMATION (State A -> State B): animate element-by-element across the FULL duration so State A transforms cleanly into State B — do not hold State A frozen and snap to State B on the final frames.",
  "Use crisp physical transitions every 1.0–1.5 seconds: elements slide briskly in/out of frame (滑入／滑出), folded cards unfold flat (摺開), cover strips tear or peel open (撕開), arrows/lines/circles draw stroke-by-stroke (畫出), two-sided cards flip cleanly (翻轉), and meters fill or drain.",
  "Use at most ONE directional arrow per clip (never stack multiple arrows or spawn extra flying arrows), and never slide blank grey slash strips or masking-tape stickers over headers.",
  "Whiteboard cardboard physics: every prop, card, diagram block, arrow, chart bar, shape, and tag moves as a single rigid flat piece without melting or dissolving. Background and set layers stay 100% stationary.",
  "Character acting: keep the character in their presenter corner at the same scale and screen position while briskly pointing/demonstrating toward each active focus point with vivid brow and eye focus. Eyes and hands stay on the teaching element on every clip, including Clip 1. Lips and jaw stay sealed (no lip-sync, no look into the lens).",
  "Concise on-canvas labels: keep the concise 「」 keyword labels and optional short beat headline sharp and readable as drawn in the first and last frames. Never morph, scramble, or invent extra full-sentence text or Subtitle:.",
].join(" ");

export const cartoonExplainerVideoDirectorRules: DirectorRuleModule = {
  slug: "cartoon-explainer-video-director",
  allowsInventedProps: true,
  phaseASceneDetailBlock(options) {
    return [
      "Scene detail: write every explainerScene (and startScene / endScene when used) as four concrete parts, in this order:",
      options.realistic
        ? "1) Character: expression, pose, action, and eyeline of each on-screen character — whenever a character is present, give them a calm, relaxed, unforced real-person facial expression matching the beat (attentive focused eyes and softly closed lips at natural rest; never write a forced closed-lip smile or smirk; never a blank, deadpan, or expressionless stare; never exaggerated cartoon grimaces, wide saucer eyes, or puffed cheeks)."
        : "1) Character: expression, pose, action, and eyeline of each on-screen character — whenever a character is present, keep their lips sealed and put their eyes and hands on the element they are handling (active eyebrows and expressive eyes, never a blank or neutral face, never a talking mouth).",
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
        : "Each beat states: time window → who or what moves → from where to where → how (picked up, set down, slid in from the frame edge, written on, wiped off) → the hands working that element, with lips sealed and no speech (vivid brow and eye focus when a character is present) and the camera framing.",
      "Every difference between the start and end still gets a beat that shows its cause on camera: pose, each hand, eyeline, expression, and every prop or label that moves, appears, disappears, or changes state.",
      "A prop that is in the end still but not in the start still is either added to the start still, or enters on camera in a beat (placed by a hand, slides in from the frame edge).",
      "A prop that is in the start still but not in the end still leaves on camera in a beat (put away, moved off frame, covered).",
      "Name each hand by the character's own left or right, and keep the same hand on the same prop from the start still through motionCamera to the end still.",
      "The start and end still of one clip share the same light and the same place. endScene is the opening still after motionCamera has finished: its Camera line is the landed shot size, angle, and where subjects sit. If motionCamera keeps the camera locked, keep that Camera line. Write the landed picture, not the in-between path.",
      "Before returning, compare each clip's start and end still item by item: every difference appears in motionCamera, and every object motionCamera touches already exists in the start still or enters in a beat.",
      "Concise On-Canvas Text Budget: englishVo is spoken ONLY by the off-screen narrator — NEVER dump full voiceover sentences, paragraphs, or Subtitle: onto startScene or endScene. Keep on-canvas text strictly concise inside 「」 in the configured scene-text language: at most 1 short beat takeaway/headline (2–6 English words / 4–10 CJK chars; on Clip 1 the Big Bold Hook Title is the sole headline) plus 2–3 short node/object labels (1–3 words / 2–6 CJK chars). Stage startScene as State A (initial problem / folded card / low meter) and endScene as State B (landed outcome / unfolded card / filled meter), with motionCamera physically animating State A into State B. On every clip, including Clip 1, eyes and hands stay on the teaching element. Lips and jaw stay sealed. No lip-sync, no look into the lens, and no greeting wave.",
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
    return EXPLAINER_DUAL_KEYFRAME_MOTION_RULES;
  },
  phaseBDetailRules(options) {
    const base = options.realistic
      ? "Detail: ALWAYS state camera details, pointing direction, and camera motion FIRST, then describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), each naming the action with directions relative to the teaching element (e.g. the hand moving toward that element, the element sliding to the left of the frame, a card entering from the right of the frame). Never walk the character toward the camera and never turn the face toward the lens, a calm, relaxed, unforced real-person facial expression (lips softly closed at natural rest with zero mouth or jaw speech articulation, natural blinks, and attentive eye focus on the element they are handling; the character never speaks and never lip-syncs, and every beat is an interaction with an on-screen element (point, tap, place, slide, flip, or pick up) rather than a performance to the camera; never write a forced closed-lip smile or tight smirk; never a blank or deadpan stare; never exaggerated cartoon grimaces), and the camera start and end framing. Name which hand, which direction relative to the teaching element, and which prop. The lighting stays constant and matches both keyframes. Never re-describe a character's appearance or outfit; it follows the keyframes."
      : "Detail: ALWAYS state camera details, pointing direction, and camera motion FIRST, then describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), each naming the action with directions relative to the teaching element (e.g. the hand moving toward that element, the element sliding to the left of the frame, a card entering from the right of the frame). Never walk the character toward the camera and never turn the face toward the lens, the expression change, and the camera start and end framing. Whenever a character is on screen, they only interact with an on-screen element (point, tap, place, slide, flip, or pick up). Lips and jaw stay sealed and motionless — no lip-sync, no mouth shapes, and no talking to the camera. Eyes and hands stay on that element. Name which hand, which direction relative to the teaching element, and which prop. The lighting stays constant and matches both keyframes. Never re-describe a character's appearance or outfit; it follows the keyframes.";
    if (!options.realistic) return base;
    return `${base} ${options.narratorOnly ? REALISTIC_NARRATOR_VIDEO_DETAIL_RULE : REALISTIC_VIDEO_DETAIL_RULE}`;
  },
};
