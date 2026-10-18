// De-plastic light & camera capture rules for Cinematic realistic (and user forks of it) only.
// Flat, outlined, or chalk styles must not get grazing light or film grain.

export function isRealisticStyle(style?: { id?: string; baseStyleId?: string } | null) {
  if (!style) return false;
  return style.id === "realistic" || style.baseStyleId === "realistic";
}

// Canonical Mongo fields for `realistic` style so ensureCatalogStyles keeps DB in sync.
export const REALISTIC_STYLE_FIELDS = {
  name: "Cinematic realistic",
  description: "真實光影。每段在 24mm f/1.2、35mm f/1.4、50mm f/1.4、80mm f/1.4 裡選鏡頭。",
  canvas:
    "real-world physical environment with lived-in everyday clutter and surface wear, lit by honest motivated practical light or overcast daylight with natural depth and surface micro-texture",
  canvasColor: "#d9d6d0",
  look: "authentic candid 35mm film capture (shot on Kodak Gold 200, Ektachrome, or Ilford HP5 with Ricoh GR III or Canon AE-1 optics, never AI beauty-mode or glossy studio stock): natural skin pores, peach-fuzz, and fabric micro-relief sculpted by grazing directional key light strictly from the visible light-source side with deep negative fill on the shadow side away from the light source (clear light-to-shadow falloff across the face, visible nose-bridge and eye-socket shadows, never flat front beauty light, never unmotivated rim light from the dark shadow side, and never copy studio lighting direction from a character blueprint), honest optical imperfections (subtle film grain, slight chromatic aberration, gentle vignetting, subtle halation around bright practical lights, soft highlight roll-off below clipping, slightly lifted shadow blacks so dark textures are never crushed flat), candid unposed framing with natural lived-in background details, no illustration. Match real camera optics from the scene: shot size (full shot / medium shot / close-up / extreme close-up), focal length (24mm wide-angle lens / 35mm lens / 50mm lens / 85mm portrait lens), and aperture (deep focus, f/11 for environment; shallow depth of field, f/4; or f/1.4, creamy bokeh background to isolate the subject).",
  palette:
    "scene-motivated honest colour and contrast per shot on Kodak Gold 200 or Ektachrome film stock with concrete light and shadow tones (e.g. warm amber light, muted teal shadows, cool overhead shop fluorescents, or flat overcast daylight; never vague beautiful colors): neutral or cool highlights by default, reserving warm highlights strictly for shots with a visible practical warm lamp, fire, or sunset in frame; in dark scenes, keep 90% of shadow areas neutral-desaturated and put chroma only on the light source; lift the black point in underwater, fog, or smoke scenes",
  typography:
    "text appears only as physical used objects in the scene: smudged hand-chalked boards, worn printed signs, labels, sticky notes, or screens with natural perspective, surface wear, and lighting; never floating graphic overlays",
  motion:
    "Gimbal-smooth or organic handheld micro-drift with natural human weight transfer and cloth physics. One clean continuous shot per beat, no repeats. A clip may hold one prime, or move from one prime to another, such as 35mm f/1.4 to 80mm f/1.4, or 50mm f/1.4 back to 24mm f/1.2. No cartoon whip or snap zoom.",
  negatives:
    "cartoon, outlines, flat colour, illustration, 3D toon shading, 8K, ultra-realistic, hyperrealistic, masterpiece, flat front-lit lighting, even beauty fill light, waxy airbrushed plastic skin, sterile AI-clean noise-free skin, glamour model face, symmetrical sterile room, vague beautiful colors, blown-out pure white highlights, neon oversaturated shadows, crushed flat blacks, floating UI text, watermarks, uncanny faces",
} as const;

// Phase A: how each scene's Light and Camera parts are written for realistic style.
export const REALISTIC_LIGHT_DIRECTOR_RULE =
  "Realistic light & camera: describe the physical camera capture rather than beauty or quality buzzwords (never write 8K, ultra-realistic, hyperrealistic, or masterpiece). In every Character and Set part, direct candid, unposed in-between expressions and concrete lived-in details (everyday workbench clutter, worn textures, slight asymmetry) so the model never fills gaps with sterile defaults. In every Light part, name a grazing directional key from the side or three-quarter angle with negative fill on the shadow side, so faces and surfaces fall off from light to shadow (never flat front light or even fill), and name honest, concrete light and shadow colours (e.g. warm amber light, muted teal shadows, harsh cool shop fluorescents, or overcast window daylight; never vague phrases like beautiful colors). Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible in frame. Keep glowing objects below clipping with subtle halation and no pure-white glare. Lift the black point in underwater, fog, or smoke scenes. In every Camera part, name the exact shot size (full shot / medium shot / close-up / extreme close-up), humble camera or film stock (Ricoh GR III / Canon AE-1 / Kodak Gold 200 / Ektachrome), focal length (24mm wide-angle lens / 35mm lens / 50mm lens / 85mm portrait lens — use 50mm or 85mm for portraits), aperture and depth of field (deep focus, f/11 to show the environment; shallow depth of field, f/4; or f/1.4, creamy bokeh background to isolate the subject from a busy background), optical flaws (slight chromatic aberration, gentle vignetting, slightly off-center candid framing), and sensor grain / ISO (clean image, ISO 100 / subtle film grain / high ISO noise, grainy low-light photo so the image is never sterile AI-clean).";

// Each realistic still: rendered after the scene's own Light and Camera parts.
export const REALISTIC_FRAME_RENDER_RULE =
  "Realistic light & camera: sculpt faces and surfaces with grazing directional light, negative fill on the shadow side, and concrete light/shadow colour contrast (e.g. warm amber light, muted teal shadows, cool shop fluorescents, or overcast window light; never flat front beauty light, waxy airbrushed skin, or vague 'beautiful colors'). Describe the physical capture on 35mm film (Kodak Gold 200 or Ektachrome on Canon AE-1 / Ricoh GR III optics; never 8K, hyperrealistic, or beauty-filter aesthetics). Match real camera optics from the Scene (24mm / 35mm / 50mm / 85mm portrait lens; deep focus f/11 for environment or f/4 to f/1.4 creamy bokeh background for subject isolation; full shot / medium shot / close-up / extreme close-up). Add subtle film grain or natural ISO sensor noise (clean image, ISO 100 / subtle film grain / high ISO noise, grainy low-light photo), slight chromatic aberration, subtle halation on bright sources, and gentle vignetting so the still looks genuinely photographed, keep glowing objects below pure-white clipping, and never crush blacks to zero.";

// Phase B: the director keeps this light and live-action physiology in every realistic video prompt.
export const REALISTIC_VIDEO_DETAIL_RULE =
  "Realistic light & live-action capture: one clean continuous shot per beat, no repeats. The video keeps the keyframes' grazing directional light, negative fill on the shadow side, natural skin pores, peach-fuzz, and fabric micro-texture, subtle film grain, and unclipped highlights. Animate real human micro-physiology (natural blinks, subtle ocular micro-saccades, small breaths lifting the chest and shoulders, genuine muscle weight transfer, and natural cloth drape) plus diegetic environmental sound effects synced to each physical action. No cartoon snap verbs. No flat front fill and no waxy plastic skin.";

// Appended at send time so even a stored or model-written prompt carries it.
export const REALISTIC_VIDEO_LIGHT_LOCK =
  "Light lock: one clean shot per beat, no repeats; keep the first frame's directional side light, shadow-side falloff, and subtle film grain for the whole clip; natural skin pores, peach-fuzz, natural blinks, breathing chest movement, and real fabric texture; highlights never blow out to pure white; no flat front fill, no waxy or airbrushed skin.";

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
  "Realistic texture: captured on 35mm film (Kodak Gold 200 / Ektachrome) with a grazing directional key light from the side or three-quarter angle, and negative fill on the shadow side, so the subject falls off from light to shadow. Never flat front beauty light, even fill, waxy airbrushed surfaces, glamour retouching, or sterile AI-clean surfaces. Use concrete light and shadow colour (warm amber light, muted teal shadows; never vague beautiful colors). Add subtle film grain (clean image, ISO 100 / subtle film grain / high ISO noise, grainy low-light photo) and slight optical chromatic aberration. Keep highlights below pure-white clipping, and do not crush shadow blacks to zero.";

// Character sheet, identity portrait, and full-body figure.
export const REALISTIC_CHARACTER_RENDER_RULE = [
  REALISTIC_SURFACE,
  "Cast a believable everyday non-model person and focus on the source image's skin texture: show real skin pores, peach-fuzz, natural skin micro-texture, fine lines, slight asymmetry, surface finish, loose flyaway hair strands, and real fabric weave faithfully matched to the source photo — never over-smooth, beautify, or airbrush.",
  "Camera: an identity portrait is a close-up on an 85mm portrait lens at f/1.8 with creamy background falloff; a full-body figure is a full shot on a 50mm lens at f/4; a turnaround sheet keeps that same 50mm lens and the same light direction in every pose.",
  "The empty sheet ground stays one flat light colour with no room. Directional light and texture stay on the person.",
].join(" ");

// Prop contact sheet. White grid stays; each object is photographed, not illustrated.
export const REALISTIC_PROP_RENDER_RULE = [
  REALISTIC_SURFACE,
  "Each prop is a real, used physical object showing authentic material grain and lived-in wear: brushed metal, glass smudges, fabric weave, wood grain, chalk dust, or matte paint — never a brand-new sterile CGI render or impossible geometry.",
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
  "Every cell shares that one light direction (practical room fixtures, overcast window daylight, or street bounce). Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible in the set.",
  "A glowing fixture stays below clipping with subtle halation. Lift the black point in fog, smoke, or underwater. In a dark set, keep shadow chroma low and put colour only on the light source.",
  "Architecture and set dressing keep real material texture and authentic lived-in details (worn surfaces, natural clutter, cables, or smudges — never a sterile symmetrical stock room).",
  "Camera by cell: the wide establishing cell is a full shot on a 24mm wide-angle lens at f/11, deep focus; the medium and angled cells are a medium shot on a 35mm or 50mm lens at f/4; the architecture detail cell is a close-up on an 85mm portrait lens at f/1.4 with a creamy bokeh background.",
].join(" ");
