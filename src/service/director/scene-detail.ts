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
    "Write motionCamera as a timed beat list across the clip (e.g. 0–2s …; 2–5s …), naming the action, the expression change, and the camera move with its start and end framing.",
    "Be specific (a chipped blue mug, warm side light from a window on the left), not generic (a nice room).",
  ].join(" ");
}

// Appended to every still so the image model renders, not sketches, the scene.
export const FRAME_RENDER_DETAIL =
  "Render detail: follow the Scene's shot size, angle, and composition exactly; give props and surfaces clear material and texture; keep light direction, shadows, and depth consistent with the Scene; never restyle the character's look or outfit beyond the attached reference.";

// Phase B system rule so each video prompt is a precise motion brief.
export const PHASE_B_DETAIL_RULES =
  "Detail: describe the motion as timed beats across the clip (e.g. 0–2s …; 2–5s …), each naming the action, the expression change, and the camera start and end framing. Name which hand, which direction, and which prop. The lighting stays constant and matches both keyframes. Never re-describe a character's appearance or outfit; it follows the keyframes.";
