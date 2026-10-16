// De-plastic light rules for Cinematic realistic (and user forks of it) only.
// Flat, outlined, or chalk styles must not get grazing light or film grain.

export function isRealisticStyle(style?: { id?: string; baseStyleId?: string } | null) {
  if (!style) return false;
  return style.id === "realistic" || style.baseStyleId === "realistic";
}

// Phase A: how each scene's Light part is written.
export const REALISTIC_LIGHT_DIRECTOR_RULE =
  "Realistic light: in every Light part, name a grazing directional key from the side or three-quarter angle with negative fill on the shadow side, so faces and surfaces fall off from light to shadow (never flat front light or even fill). Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible in frame. Keep glowing objects below clipping, with no pure-white glare. Lift the black point in underwater, fog, or smoke scenes.";

// Each realistic still: rendered after the scene's own Light part.
export const REALISTIC_FRAME_RENDER_RULE =
  "Realistic light: sculpt faces and surfaces with grazing directional light and negative fill on the shadow side; never flat front beauty light or waxy airbrushed skin. Keep glowing objects below pure-white clipping, and keep fine shadow grain without crushing blacks to zero.";

// Phase B: the director keeps this light in every realistic video prompt.
export const REALISTIC_VIDEO_DETAIL_RULE =
  "Realistic light: the video keeps the keyframes' grazing directional light, negative fill on the shadow side, natural skin and fabric micro-texture, and unclipped highlights. No flat front fill and no waxy plastic skin.";

// Appended at send time so even a stored or model-written prompt carries it.
export const REALISTIC_VIDEO_LIGHT_LOCK =
  "Light lock: keep the first frame's directional side light and shadow-side falloff for the whole clip; natural skin pores and fabric texture; highlights never blow out to pure white; no flat front fill, no waxy or airbrushed skin.";

export function lockRealisticVideoLight(prompt: string) {
  const text = prompt.trim();
  if (!text || text.includes(REALISTIC_VIDEO_LIGHT_LOCK)) return text;
  return `${text}\n${REALISTIC_VIDEO_LIGHT_LOCK}`;
}
