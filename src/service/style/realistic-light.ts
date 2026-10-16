// De-plastic light rules for Cinematic realistic (and user forks of it) only.
// Flat, outlined, or chalk styles must not get grazing light or film grain.

export function isRealisticStyle(style?: { id?: string; baseStyleId?: string } | null) {
  if (!style) return false;
  return style.id === "realistic" || style.baseStyleId === "realistic";
}

// Phase A: how each scene's Light and Camera parts are written for realistic style.
export const REALISTIC_LIGHT_DIRECTOR_RULE =
  "Realistic light & camera: in every Light part, name a grazing directional key from the side or three-quarter angle with negative fill on the shadow side, so faces and surfaces fall off from light to shadow (never flat front light or even fill), and name concrete light and shadow colours (e.g. warm amber light, muted teal shadows; never vague phrases like beautiful colors). Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible in frame. Keep glowing objects below clipping, with no pure-white glare. Lift the black point in underwater, fog, or smoke scenes. In every Camera part, name the exact shot size (full shot / medium shot / close-up / extreme close-up), focal length (24mm wide-angle lens / 35mm lens / 50mm lens / 85mm portrait lens — use 50mm or 85mm for portraits), aperture and depth of field (deep focus, f/11 to show the environment; shallow depth of field, f/4; or f/1.4, creamy bokeh background to isolate the subject from a busy background), and sensor grain / ISO (clean image, ISO 100 / subtle film grain / high ISO noise, grainy low-light photo so the image is never sterile AI-clean).";

// Each realistic still: rendered after the scene's own Light and Camera parts.
export const REALISTIC_FRAME_RENDER_RULE =
  "Realistic light & camera: sculpt faces and surfaces with grazing directional light, negative fill on the shadow side, and concrete light/shadow colour contrast (e.g. warm amber light, muted teal shadows; never flat front beauty light, waxy airbrushed skin, or vague 'beautiful colors'). Match real camera optics from the Scene (24mm / 35mm / 50mm / 85mm portrait lens; deep focus f/11 for environment or f/4 to f/1.4 creamy bokeh background for subject isolation; full shot / medium shot / close-up / extreme close-up). Add subtle film grain or natural ISO sensor noise (clean image, ISO 100 / subtle film grain / high ISO noise, grainy low-light photo) so the still looks photographed, keep glowing objects below pure-white clipping, and never crush blacks to zero.";

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
