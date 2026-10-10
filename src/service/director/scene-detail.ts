// Shared detail contract for every director: Phase A writes concrete scenes,
// stills and clip videos carry that detail through. Character look always
// comes from the cast reference, never from scene text.

export function sceneDetailDirectorBlock() {
  return [
    "Scene detail: write every explainerScene (and startScene / endScene when used) as four concrete parts, in this order:",
    "1) Character: expression, pose, action, and eyeline of each on-screen character.",
    "2) Set: location, set dressing, props, foreground / midground / background.",
    "3) Light: light direction, colour temperature, mood.",
    "4) Camera: shot size, camera angle, composition, and where each character sits in frame (left / centre / right, near / far).",
    "Never describe a character's appearance, hair, or outfit — that always follows the character reference.",
    "Be specific (a chipped blue mug, warm side light from a window on the left), not generic (a nice room).",
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

// Phase B system rule so each video prompt is a precise motion brief.
export const PHASE_B_DETAIL_RULES =
  "Detail: describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), each naming the action, the expression change, and the camera start and end framing. Name which hand, which direction, and which prop. The lighting stays constant and matches both keyframes. Never re-describe a character's appearance or outfit; it follows the keyframes.";
