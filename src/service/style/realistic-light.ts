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

// Flare rejects a blueprint once the style look and this rule are both written out.
export const REFERENCE_PROMPT_BUDGET = 4200;

// Keep the realistic rule. Shorten the catalog style lines first; they repeat it.
export function fitReferencePrompt(lines: string[], budget = REFERENCE_PROMPT_BUDGET) {
  const kept = lines.map((line) => line.trim()).filter(Boolean);
  const size = () => kept.join("\n").length;
  if (size() <= budget) return kept.join("\n");
  for (let i = 0; i < kept.length; i++) {
    if (/^(Background|Rendering|Palette|Never):/.test(kept[i]) && kept[i].length > 220) {
      kept[i] = `${kept[i].slice(0, 219)}…`;
    }
  }
  const text = kept.join("\n");
  return text.length <= budget ? text : text.slice(0, budget);
}

export function lockRealisticVideoLight(prompt: string) {
  const text = prompt.trim();
  if (!text || text.includes(REALISTIC_VIDEO_LIGHT_LOCK)) return text;
  return `${text}\n${REALISTIC_VIDEO_LIGHT_LOCK}`;
}

// Shared by every realistic reference image the scene still copies from.
// A smooth blueprint, prop tile, or empty set is what the still then copies.
const REALISTIC_SURFACE =
  "Realistic texture: a grazing directional key light from the side or three-quarter angle, with negative fill on the shadow side, so the subject falls off from light to shadow. Never flat front beauty light, even fill, waxy airbrushed surfaces, or sterile AI-clean surfaces. Use concrete light and shadow colour (warm amber light, muted teal shadows; never vague beautiful colors). Add subtle film grain (clean image, ISO 100 / subtle film grain / high ISO noise, grainy low-light photo). Keep highlights below pure-white clipping, and do not crush shadow blacks to zero.";

// Character sheet, identity portrait, and full-body figure.
export const REALISTIC_CHARACTER_RENDER_RULE = [
  REALISTIC_SURFACE,
  "Show real skin pores, fine hair strands, and fabric weave.",
  "Camera: an identity portrait is a close-up on an 85mm portrait lens at f/1.8 with creamy background falloff; a full-body figure is a full shot on a 50mm lens at f/4; a turnaround sheet keeps that same 50mm lens and the same light direction in every pose.",
  "The empty sheet ground stays one flat light colour with no room. Directional light and texture stay on the person.",
].join(" ");

// Prop contact sheet. White grid stays; each object is photographed, not illustrated.
export const REALISTIC_PROP_RENDER_RULE = [
  REALISTIC_SURFACE,
  "Each prop shows its real material grain: metal, glass, fabric weave, wood, or matte paint.",
  "Camera: 50mm lens at f/8, three-quarter view, the whole prop in deep focus.",
  "A short soft shadow may sit inside the tile. Keep the plain white background and the grid. No room, no floor, no people.",
].join(" ");

// Product sheet is always a photograph of the real object, in every video style.
export const REALISTIC_PRODUCT_RENDER_RULE = [
  REALISTIC_SURFACE,
  "Keep the real material from the photos: metal grain, glass, fabric, printed ink, logo, and packaging. Do not airbrush, beautify, illustrate, or restyle.",
  "Camera: 50mm lens; the front view at f/8 so logo and packaging text stay sharp; the three-quarter and side views at f/5.6.",
].join(" ");

// Empty-set contact sheet. One light direction, optics named per cell.
export const REALISTIC_SET_RENDER_RULE = [
  REALISTIC_SURFACE,
  "Every cell shares that one light direction. Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible in the set.",
  "A glowing fixture stays below clipping. Lift the black point in fog, smoke, or underwater. In a dark set, keep shadow chroma low and put colour only on the light source.",
  "Architecture and set dressing keep real material texture.",
  "Camera by cell: the wide establishing cell is a full shot on a 24mm wide-angle lens at f/11, deep focus; the medium and angled cells are a medium shot on a 35mm or 50mm lens at f/4; the architecture detail cell is a close-up on an 85mm portrait lens at f/1.4 with a creamy bokeh background.",
].join(" ");
