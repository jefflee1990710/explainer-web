// De-plastic light & camera capture rules for Cinematic realistic (and user forks of it) only.
// Flat, outlined, or chalk styles must not get grazing light or film grain.

export function isRealisticStyle(style?: { id?: string; baseStyleId?: string } | null) {
  if (!style) return false;
  return style.id === "realistic" || style.baseStyleId === "realistic";
}

const SELF_SHOT_CREATOR_SKILLS = new Set([
  "talking-head-director",
  "full-body-talking-head-director",
  "surprise-interview-director",
]);

// Talking-head and surprise-hook videos are self-recorded creator / vlog captures
// (iPhone 16 Pro / Sony ZV-E1 / DJI Osmo Pocket 3) rather than vintage 35mm cinema film.
export function isSelfShotCreatorSkill(skillSlug?: string | null) {
  return Boolean(skillSlug && SELF_SHOT_CREATOR_SKILLS.has(skillSlug));
}

// Canonical Mongo fields for `realistic` style so ensureCatalogStyles keeps DB in sync.
export const REALISTIC_STYLE_FIELDS = {
  name: "Cinematic realistic",
  description: "真實光影。每段在 24mm f/1.2、35mm f/1.4、50mm f/1.4、80mm f/1.4 裡選鏡頭。",
  canvas:
    "real-world physical environment with lived-in everyday clutter and surface wear, lit by honest motivated practical light or overcast daylight with natural depth and surface micro-texture",
  canvasColor: "#d9d6d0",
  look: "authentic candid 35mm film capture (shot on Kodak Gold 200, Ektachrome, or Ilford HP5 with Ricoh GR III or Canon AE-1 optics, never AI beauty-mode or glossy studio stock): natural skin pores, peach-fuzz, and fabric micro-relief sculpted by grazing directional key light from the visible light-source side with negative fill on the shadow side (clear directional light-to-shadow falloff and nose-bridge shadow across the face, matte-natural skin finish with zero oily or plastic specular sheen, never flat front beauty light, never even front fill, never unmotivated rim light from the dark shadow side), honest optical imperfections (subtle film grain, slight chromatic aberration, gentle vignetting, subtle halation around bright practical lights, soft highlight roll-off keeping glowing sources below pure-white clipping, slightly lifted shadow blacks so 35mm film grain is never swallowed by crushed zero-blacks), candid unposed framing with natural lived-in background details, no illustration. Match real camera optics from the scene: shot size (full shot / medium shot / close-up / extreme close-up), focal length (24mm wide-angle lens / 35mm lens / 50mm lens / 85mm portrait lens), and aperture (deep focus, f/11 for environment; shallow depth of field, f/4; or f/1.4, creamy bokeh background to isolate the subject).",
  palette:
    "scene-motivated honest colour and contrast per shot on Kodak Gold 200 or Ektachrome film stock with concrete light and shadow tones (e.g. warm amber light, muted teal shadows, cool overhead shop fluorescents, or flat overcast daylight; never vague beautiful colors or forced uniform LUT across different settings): neutral or cool highlights by default, reserving warm highlights strictly for shots with a visible practical warm lamp, fire, or sunset in frame; in extreme dark scenes, keep 90% of shadow areas neutral-desaturated and put chroma only on the light source; lift the black point in underwater, fog, or smoke scenes (with blue-shifted underwater shadows and neutral-black night shadows)",
  typography:
    "text appears only as physical used objects in the scene: smudged hand-chalked boards, worn printed signs, labels, sticky notes, or screens with natural perspective, surface wear, and lighting; never floating graphic overlays",
  motion:
    "Gimbal-smooth or organic handheld micro-drift with natural human weight transfer, cloth physics, and restrained real-person facial and mouth articulation (small natural ~30–40% jaw opening when speaking, clean lip closure on pauses, never exaggerated wide-open mouth or rubbery cheeks). One clean continuous shot per beat, no repeats. A clip may hold one prime, or move from one prime to another, such as 35mm f/1.4 to 80mm f/1.4, or 50mm f/1.4 back to 24mm f/1.2. No cartoon whip or snap zoom.",
  negatives:
    "cartoon, outlines, flat colour, illustration, 3D toon shading, 8K, ultra-realistic, hyperrealistic, masterpiece, flat front-lit lighting, even beauty fill light, waxy airbrushed plastic skin, oily specular forehead sheen, sterile AI-clean noise-free skin, glamour model face, exaggerated wide-open mouth, excessive jaw swing, rubbery cheeks, changing teeth, symmetrical sterile room, vague beautiful colors, unmotivated warm orange tint, blown-out pure white highlights, neon oversaturated shadows, crushed zero blacks swallowing grain, floating UI text, watermarks, uncanny faces",
} as const;

// Phase A: how each scene's Light and Camera parts are written for realistic style.
export const REALISTIC_LIGHT_DIRECTOR_RULE =
  "Realistic light & camera: describe the physical camera capture rather than beauty or quality buzzwords (never write 8K, ultra-realistic, hyperrealistic, or masterpiece; prompt honest light direction rather than exaggerated colour-grading intensity). In every Character and Set part, direct candid, unposed in-between expressions, matte-natural skin with visible pores and peach-fuzz (zero oily or plastic specular sheen), and concrete lived-in details (everyday workbench clutter, worn textures, slight asymmetry) so the model never fills gaps with sterile defaults. In every Light part, set contrast and black point per shot from that shot's own scene light (never force one uniform grading across different settings): name a grazing directional key from the side or three-quarter angle with negative fill on the shadow side so faces and surfaces fall off from light to shadow (never flat front light or even beauty fill), and name honest, concrete light and shadow colours (e.g. warm amber light, muted teal shadows, harsh cool shop fluorescents, or overcast window daylight; never vague phrases like beautiful colors). Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible in frame. In extreme dark scenes, keep 90% of shadow areas neutral-desaturated and put chroma only on the light source (no neon shadows). Keep glowing objects below pure-white clipping with subtle halation and no blown-out glare. Lift the black point in underwater, fog, or smoke scenes (underwater shadows stay blue-shifted; night shadows stay neutral black), and keep shadow blacks slightly lifted whenever film grain is present so crushed blacks never swallow the grain. In every Camera part, name the exact shot size (full shot / medium shot / close-up / extreme close-up), humble camera or film stock (Ricoh GR III / Canon AE-1 / Kodak Gold 200 / Ektachrome), focal length (24mm wide-angle lens / 35mm lens / 50mm lens / 85mm portrait lens — use 50mm or 85mm for portraits), aperture and depth of field (deep focus, f/11 to show the environment; shallow depth of field, f/4; or f/1.4, creamy bokeh background to isolate the subject from a busy background), optical flaws (slight chromatic aberration, gentle vignetting, slightly off-center candid framing), and sensor grain / ISO (clean image, ISO 100 / subtle film grain / high ISO noise, grainy low-light photo so the image is never sterile AI-clean).";

// Each realistic still: rendered after the scene's own Light and Camera parts.
export const REALISTIC_FRAME_RENDER_RULE =
  "Realistic light & camera: sculpt faces and surfaces with grazing directional light, negative fill on the shadow side (1.4:1 to 1.8:1 cheek-to-cheek contrast ratio, re-lighting any attached character blueprint from the scene's light source and overriding flat reference-sheet lighting), and concrete light/shadow colour contrast (e.g. warm amber light, muted teal shadows, cool shop fluorescents, or overcast window light; never flat front beauty light, waxy airbrushed skin, oily specular sheen, or vague 'beautiful colors'). Keep highlights neutral or cool by default, reserving warm highlights strictly for shots with a visible warm practical lamp, fire, or sunset in frame; in extreme dark scenes keep 90% of shadows neutral-desaturated with colour only on the light source; lift the black point in underwater, fog, or smoke scenes (with blue-shifted underwater shadows and neutral night shadows). Describe the physical capture on 35mm film (Kodak Gold 200 or Ektachrome on Canon AE-1 / Ricoh GR III optics; never 8K, hyperrealistic, or beauty-filter aesthetics) showing visible skin pores, fine peach-fuzz, and matte-natural skin micro-relief. Match real camera optics from the Scene (24mm / 35mm / 50mm / 85mm portrait lens; deep focus f/11 for environment or f/4 to f/1.4 creamy bokeh background for subject isolation; full shot / medium shot / close-up / extreme close-up). Add subtle film grain or natural ISO sensor noise (clean image, ISO 100 / subtle film grain / high ISO noise, grainy low-light photo), slight chromatic aberration, subtle halation on bright sources, and gentle vignetting so the still looks genuinely photographed, keep glowing objects below pure-white clipping, and keep shadow blacks slightly lifted so film grain is never swallowed by crushed zero-blacks.";

// Phase B: the director keeps this light and live-action physiology in every realistic video prompt.
export const REALISTIC_VIDEO_DETAIL_RULE =
  "Realistic light & live-action capture: one clean continuous shot per beat, no repeats. The video keeps the keyframes' grazing directional light, negative fill on the shadow side, matte-natural skin pores, peach-fuzz (zero oily or plastic specular sheen), and fabric micro-texture, subtle film grain with slightly lifted shadow blacks, neutral/cool highlights (warm only when a practical warm source is in frame), and unclipped glowing sources. Animate real human micro-physiology (natural blinks, subtle ocular micro-saccades, small breaths lifting the chest and shoulders, genuine muscle weight transfer, natural cloth drape, and restrained real-person lip and jaw articulation whenever a character speaks — ~30–40% conversational mouth opening, clean lip closure on bilabial m/b/p sounds and pauses, zero exaggerated wide-open mouth, zero excessive jaw swing, and zero rubbery cheeks) plus diegetic environmental sound effects synced to each physical action. No cartoon snap verbs. No flat front fill and no waxy plastic skin.";

// Appended at send time so even a stored or model-written prompt carries it.
export const REALISTIC_VIDEO_LIGHT_LOCK =
  "Light lock: one clean shot per beat, no repeats; keep the first frame's grazing directional side light, negative-fill shadow falloff, and subtle film grain with slightly lifted shadow blacks for the whole clip; natural skin pores, peach-fuzz, matte-natural skin with zero oily or plastic sheen, natural blinks, breathing chest movement, restrained natural mouth and jaw articulation when speaking (no exaggerated mouth opening, no excessive jaw swing, no rubbery cheeks), and real fabric texture; highlights stay below pure-white clipping; no flat front fill, no waxy or airbrushed skin.";

// Self-shot creator / vlog capture rules (Talking Head & Surprise Hook) — modern human camera
// equipment (iPhone 16 Pro / Sony ZV-E1 / DJI Osmo Pocket 3) with clean true-to-life digital sensor
// colour and available room light, without heavy vintage 35mm film grain or moody cinema LUTs.
export const SELF_SHOT_LIGHT_DIRECTOR_RULE =
  "Real human creator camera capture: describe authentic everyday recording on modern creator camera equipment (iPhone 16 Pro 24mm f/1.8 main camera on a tripod, Sony ZV-E1 full-frame vlog camera, or DJI Osmo Pocket 3 1-inch CMOS sensor; never heavy vintage 35mm film stock, never 8K/hyperrealistic buzzwords, never AI beauty-mode). In every Character and Set part, direct candid, unposed human expressions, unfiltered real skin with visible pores and fine peach-fuzz (zero oily or plastic specular sheen, zero beauty-filter smoothing), and lived-in everyday room details. In every Light part, use honest available room light (soft directional window daylight from one side mixed with natural indoor room light, giving a clean, bright, dimensional 1.2:1 to 1.5:1 natural facial shading on the far cheek and nose bridge — never dark moody cinema blackouts, never flat beauty-ring front fill). Keep highlights neutral or cool unless a warm practical lamp is visible in frame, and keep bright windows below pure-white clipping. In every Camera part, name the modern creator camera and optics (24mm f/1.8 smartphone/vlog lens or 35mm f/1.8 mirrorless lens, natural shallow depth of field with tack-sharp face and soft background bokeh, clean modern digital CMOS sensor readout with subtle natural ISO 100–400 sensor micro-texture, zero heavy vintage film grain or retro colour filter).";

export const SELF_SHOT_FRAME_RENDER_RULE =
  "Real human camera capture: shot on modern creator camera equipment (iPhone 16 Pro 24mm f/1.8 main camera, Sony ZV-E1 mirrorless vlog camera, or DJI Osmo Pocket 3 CMOS sensor; never vintage 35mm film filter, never 8K/hyperrealistic buzzwords, never AI beauty-mode). Light faces and surfaces with honest available daylight from the visible window side mixed with natural indoor room light, sculpting a clean, bright, dimensional 1.2:1 to 1.5:1 cheek-to-cheek portrait contrast with soft natural shadow roll-off on the far cheek and a clear nose-bridge shadow (override any flat lighting from the character reference sheet; never flat front beauty light, never dark theatrical cinema shadows). Keep highlights neutral or cool unless a warm practical lamp is visible in frame, and keep glowing windows below pure-white clipping. Show unfiltered human skin with visible pores, fine peach-fuzz, and matte-natural skin micro-relief (zero oily, waxy, or plastic specular sheen), tack-sharp focus on the eyes with natural optical background bokeh, and clean modern CMOS sensor color with subtle natural ISO micro-texture (no heavy 35mm film grain or retro LUT).";

export const SELF_SHOT_VIDEO_DETAIL_RULE =
  "Real human camera & live-action capture: one clean continuous shot per beat, no repeats, filmed on a modern smartphone or mirrorless creator camera (iPhone 16 Pro / Sony ZV-E1 / DJI Osmo Pocket 3). Keep the keyframes' clean available window daylight, soft dimensional facial shading, unfiltered matte-natural skin pores and peach-fuzz (zero oily or plastic specular sheen), clean modern digital sensor color (no heavy film grain or vintage color cast), and unclipped window highlights. Animate real human micro-physiology (natural blinks, subtle ocular micro-saccades, small breaths lifting the chest and shoulders, genuine weight transfer, natural cloth drape, and restrained real-person lip and jaw articulation whenever a character speaks — ~30–40% conversational mouth opening, clean lip closure on bilabial m/b/p sounds and pauses, zero exaggerated wide-open mouth, zero excessive jaw swing, and zero rubbery cheeks). No flat beauty-filter fill and no waxy plastic skin.";

export const SELF_SHOT_VIDEO_LIGHT_LOCK =
  "Light lock: one clean shot per beat, no repeats; keep the first frame's clean modern creator-camera look (iPhone 16 Pro / Sony ZV-E1 CMOS sensor), natural available window light, and soft dimensional facial shading for the whole clip; unfiltered skin pores, peach-fuzz, matte-natural skin with zero oily or plastic sheen, natural blinks, breathing chest movement, restrained natural mouth and jaw articulation when speaking (no exaggerated mouth opening, no excessive jaw swing, no rubbery cheeks), and real fabric texture; clean true-to-life digital color with no heavy film grain or vintage tint; highlights stay below pure-white clipping; no flat beauty-filter fill, no waxy or airbrushed skin.";

export function styleForSelfShotSkill<
  T extends { id?: string; baseStyleId?: string; look: string; palette: string; negatives: string },
>(style: T): T {
  if (!isRealisticStyle(style)) return style;
  return {
    ...style,
    look: "authentic self-recorded creator video & photograph shot on modern human camera equipment (iPhone 16 Pro 24mm f/1.8 main camera on a tripod, Sony ZV-E1 full-frame mirrorless vlog camera, or DJI Osmo Pocket 3 1-inch CMOS sensor; never AI beauty-mode, glossy studio stock, or heavy vintage 35mm film filter): unfiltered natural skin pores, fine peach-fuzz, and fabric micro-relief lit by honest available window daylight and indoor room light with soft dimensional facial shading (clear natural nose-bridge and far-cheek shadow roll-off, matte-natural skin finish with zero oily or plastic specular sheen, never flat front beauty-ring light, never dark moody cinema shadows), clean modern digital CMOS sensor readout with subtle natural ISO 100–400 micro-texture, gentle highlight roll-off keeping bright windows below pure-white clipping, candid unposed framing with lived-in everyday background details, and natural optical shallow depth of field (24mm f/1.8 or 35mm f/1.8, tack-sharp face with soft optical background bokeh).",
    palette:
      "true-to-life modern digital camera color (natural Rec.709 / iPhone 16 Pro / Sony ZV-E1 color science) with honest mixed available light (soft daylight from a side window balanced with natural indoor room tone; never heavy vintage film LUT, never muddy yellow-green film cast, never vague beautiful colors): neutral or cool daylight highlights by default, reserving warm highlights strictly for visible warm indoor lamps; clean, natural shadow tones with full detail.",
    negatives: `${style.negatives}, heavy 35mm film grain, vintage film stock filter, retro Kodak LUT, muddy faded blacks, dark moody cinema lighting`,
  };
}

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

export function lockRealisticVideoLight(prompt: string, options?: { selfShot?: boolean }) {
  const text = prompt.trim();
  const lock = options?.selfShot ? SELF_SHOT_VIDEO_LIGHT_LOCK : REALISTIC_VIDEO_LIGHT_LOCK;
  if (!text || text.includes(REALISTIC_VIDEO_LIGHT_LOCK) || text.includes(SELF_SHOT_VIDEO_LIGHT_LOCK)) {
    return text;
  }
  return `${text}\n${lock}`;
}

// Shared by every realistic reference image the scene still copies from.
// A smooth blueprint, prop tile, or empty set is what the still then copies.
const REALISTIC_SURFACE =
  "Realistic texture: captured on 35mm film (Kodak Gold 200 / Ektachrome) with a grazing directional key light from the side or three-quarter angle, and negative fill on the shadow side, so the subject falls off from light to shadow. Never flat front beauty light, even fill, waxy airbrushed surfaces, glamour retouching, or sterile AI-clean surfaces. Use concrete light and shadow colour (warm amber light, muted teal shadows; never vague beautiful colors) and keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible. Add subtle film grain (clean image, ISO 100 / subtle film grain / high ISO noise, grainy low-light photo) and slight optical chromatic aberration. Keep highlights below pure-white clipping, and keep shadow blacks slightly lifted so film grain is never swallowed by crushed zero-blacks.";

// Character sheet, identity portrait, and full-body figure.
export const REALISTIC_CHARACTER_RENDER_RULE = [
  "Realistic texture: captured on 35mm film (Kodak Gold 200 / Ektachrome) with a directional three-quarter window key light and a dimensional 1.4:1 to 1.8:1 portrait contrast ratio (25–40% natural shadow falloff with negative fill on the far cheek and side of the nose bridge that sculpts facial bone structure, visible pores, peach-fuzz, and skin micro-relief while keeping both eyes clearly readable — never flat front beauty light, never harsh split blackouts, and never waxy plastic skin). Add subtle film grain (ISO 100) and slight optical chromatic aberration, keeping highlights unclipped and shadow blacks slightly lifted.",
  "Cast a believable everyday non-model person with authentic, unretouched human skin texture (even if the source photo has phone beauty-filter smoothing or flash glare, reconstruct real organic skin micro-relief): show real skin pores, peach-fuzz, natural skin micro-texture, fine lines, natural subsurface scattering with a soft matte-natural finish (zero oily or plastic specular sheen on forehead, nose, or cheeks), loose flyaway hair strands, and real fabric weave — never over-smooth or airbrush.",
  "Camera: an identity portrait is a close-up on an 85mm portrait lens at f/1.8 with creamy background falloff; a full-body figure is a full shot on a 50mm lens at f/4; a turnaround sheet keeps that same 50mm lens and the same soft directional light in every pose.",
  "The empty sheet ground stays one flat light colour with no room. Soft directional light and real skin texture stay on the person.",
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
