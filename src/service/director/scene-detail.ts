import {
  REALISTIC_FRAME_RENDER_RULE,
  REALISTIC_LIGHT_DIRECTOR_RULE,
  REALISTIC_VIDEO_DETAIL_RULE,
} from "@/service/style/realistic-light";

// Shared detail contract for every director: Phase A writes concrete scenes,
// stills and clip videos carry that detail through. Character look always
// comes from the cast reference, never from scene text.

// What this camera can see. One sentence so storyboard, rewrites, and stills stay aligned.
// The image model will rotate a person or a prop so hidden content faces the lens.
// This forbids that move for every working face, not for one kind of object.
export const SIGHTLINE_RULE =
  "Sightline: show only what this camera can see. A working face (a person's face, a screen, a page, a sign, a dial, a label) stays aimed at whoever uses it. Draw that content only on that side. If this camera cannot see that side, draw the blank side it does see. Never turn a person or a prop around, and never move the content onto the blank side, just to make it visible.";

// Written into a scene that asks the camera to see a side and the content of the opposite side.
export const SIGHTLINE_HOLD =
  "Do not turn anyone or anything around. A face, screen, page, sign, dial, or label stays on the side that faces its user. Draw only the side this camera already sees.";

const SEES_HIDDEN_SIDE =
  /\b(from behind|seen from behind|back to (?:the )?camera|over[- ]the[- ]shoulder|(?:her|his|their) back|rear view|back view|back of the)\b|從背後|看背|背面|過肩/i;

const DEMANDS_HIDDEN_CONTENT =
  /\b(clearly visible|displaying|readable|glowing|we can see|in front of (?:her|him|them|the camera|the lens))\b|看得到|清楚看見|顯示/i;

// A scene may name only the side this camera sees. Content on the other side stays there.
export function reconcileSightline(scene: string) {
  const text = scene.trim();
  if (!text || text.includes(SIGHTLINE_HOLD)) return text;
  if (!SEES_HIDDEN_SIDE.test(text) || !DEMANDS_HIDDEN_CONTENT.test(text)) return text;
  const softened = text
    .replace(/\bclearly visible\b/gi, "")
    .replace(/\bclearly readable\b/gi, "")
    .replace(/\bglowing\b/gi, "")
    .replace(/\bin front of (?:her|him|them|the camera|the lens)\b/gi, "on the side facing its user")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
  return `${softened} ${SIGHTLINE_HOLD}`;
}

export function sceneDetailDirectorBlock(options: { realistic?: boolean } = {}) {
  return [
    "Scene detail: write every explainerScene (and startScene / endScene when used) as four concrete parts, in this order:",
    "1) Character: expression, pose, action, and eyeline of each on-screen character.",
    "2) Set: location, set dressing, props, foreground / midground / background.",
    "3) Light: light direction, colour temperature, mood.",
    "4) Camera: shot size, camera angle, composition, and where each character sits in frame (left / centre / right, near / far).",
    ...(options.realistic ? [REALISTIC_LIGHT_DIRECTOR_RULE] : []),
    "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
    "Be specific (a chipped blue mug, warm side light from a window on the left), not generic (a nice room).",
    SIGHTLINE_RULE,
    motionTransitionContract(),
  ].join(" ");
}

// motionCamera (鏡頭動作) must explain how the start still becomes the end still,
// otherwise first/last-frame video has nothing to interpolate and morphs or freezes.
export function motionTransitionContract() {
  return [
    "motionCamera is the transition script from the start still to the end still, written as timed beats across the clip (e.g. 0–2s …; 2–5s …).",
    "Each beat states: time window → who or what moves → from where to where → how (picked up, set down, slid in from the frame edge, written on, wiped off) → the expression change and the camera framing.",
    "Every difference between the start and end still gets a beat that shows its cause on camera: pose, each hand, eyeline, expression, and every prop or label that moves, appears, disappears, or changes state.",
    "A prop that is in the end still but not in the start still is either added to the start still, or enters on camera in a beat (placed by a hand, slides in from the frame edge).",
    "A prop that is in the start still but not in the end still leaves on camera in a beat (put away, moved off frame, covered).",
    "Name each hand by the character's own left or right, and keep the same hand on the same prop from the start still through motionCamera to the end still.",
    "The start and end still of one clip share the same light and the same place. endScene is the opening still after motionCamera has finished: its Camera line is the landed shot size, angle, and where subjects sit. If motionCamera keeps the camera locked, keep that Camera line. Write the landed picture, not the in-between path.",
    "Before returning, compare each clip's start and end still item by item: every difference appears in motionCamera, and every object motionCamera touches already exists in the start still or enters in a beat.",
  ].join(" ");
}

// Appended to every still so the image model renders, not sketches, the scene.
export const FRAME_RENDER_DETAIL =
  "Render detail: follow the Scene's shot size, angle, and composition exactly; give props and surfaces clear material and texture; keep light direction, shadows, and depth consistent with the Scene; never copy a scene reference's person, face, or hairstyle — those stay on the character blueprint.";

export function frameRenderDetail(options: { realistic?: boolean } = {}) {
  return options.realistic ? `${FRAME_RENDER_DETAIL} ${REALISTIC_FRAME_RENDER_RULE}` : FRAME_RENDER_DETAIL;
}

// Phase B system rule so each video prompt is a precise motion brief.
export const PHASE_B_DETAIL_RULES =
  "Detail: describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), each naming the action, the expression change, and the camera start and end framing. Name which hand, which direction, and which prop. The lighting stays constant and matches both keyframes. Never re-describe a character's appearance or outfit; it follows the keyframes.";

export function phaseBDetailRules(options: { realistic?: boolean } = {}) {
  return options.realistic ? `${PHASE_B_DETAIL_RULES} ${REALISTIC_VIDEO_DETAIL_RULE}` : PHASE_B_DETAIL_RULES;
}
