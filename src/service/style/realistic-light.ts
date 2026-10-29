// De-plastic light & camera capture rules for Cinematic realistic (and user forks of it) only.
// Flat, outlined, or chalk styles must not get grazing light or film grain.

import { getDirectorBySlug } from "@/service/director/catalog";
import type { IStyleBehavior } from "@/model/style";

export function isRealisticStyle(
  style?: { id?: string; baseStyleId?: string; behavior?: IStyleBehavior } | null,
) {
  if (!style) return false;
  if (style.id === "realistic" || style.baseStyleId === "realistic") return true;
  if (style.behavior) return style.behavior.realistic;
  return false;
}

const SELF_SHOT_CREATOR_SKILLS = new Set([
  "talking-head-director",
  "full-body-talking-head-director",
  "surprise-interview-director",
]);

// Talking-head and surprise-hook videos are self-recorded creator / vlog captures
// (iPhone 16 Pro / Sony ZV-E1 / DJI Osmo Pocket 3) rather than vintage 35mm cinema film.
export function isSelfShotCreatorSkill(skillSlug?: string | null) {
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.selfShotCreatorCamera;
  return Boolean(skillSlug && SELF_SHOT_CREATOR_SKILLS.has(skillSlug));
}

// Canonical Mongo fields for `realistic` style so ensureCatalogStyles keeps DB in sync.
export const REALISTIC_STYLE_FIELDS = {
  name: "Cinematic realistic",
  description: "真實光影。每段在 24mm f/1.2、35mm f/1.4、50mm f/1.4、80mm f/1.4 裡選鏡頭。",
  canvas:
    "real-world physical environment with lived-in everyday clutter and surface wear, lit by honest motivated practical light or overcast daylight with natural depth and surface micro-texture",
  canvasColor: "#d9d6d0",
  look: "authentic candid photographic capture as a clean modern digital photograph (full-frame camera, true-to-life colour, no film stock, no Kodak Portra, no film LUT, never AI beauty-mode or glossy studio stock): natural skin pores, peach-fuzz, and fabric micro-relief lit by soft diffused ambient room light or gentle window daylight with a low, gradual tonal transition across the face (soft lifted shadows under the chin and around the eyes, non-reflective diffuse matte-natural skin finish with zero skin reflectivity, zero specular hot spots on forehead/nose/cheeks, and zero oily, waxy, metallic, or plastic specular sheen; never harsh dramatic side-light contrast, never a half-dark face, never flat beauty-ring front fill, never sharp rim-light outlines), gentle optical character (clean digital sensor with no film grain, clean edges with no vignetting, chromatic aberration, or halation glow, soft highlight roll-off keeping glowing sources below pure-white clipping, clean neutral shadow blacks with full shadow detail, never faded, milky, or crushed), candid unposed framing with natural lived-in background details, no illustration. Match real camera optics from the scene: shot size (full shot / medium shot / close-up / extreme close-up), focal length (24mm wide-angle lens / 35mm lens / 50mm lens / 85mm portrait lens), and aperture (deep focus, f/11 for environment; shallow depth of field, f/4; or f/1.4, creamy bokeh background to isolate the subject).",
  palette:
    "scene-motivated honest colour and contrast per shot in clean, true-to-life colour (clean digital camera colour, no Kodak Portra, no film LUT, never a warm amber vintage cast) with concrete light and shadow tones (e.g. soft neutral daylight with gently cooler shadows, cool overhead shop fluorescents, flat overcast daylight, or warm lamp light only when the lamp is in frame; never vague beautiful colors or forced uniform LUT across different settings): neutral or cool highlights by default, reserving warm highlights strictly for shots with a visible practical warm lamp, fire, or sunset in frame; in extreme dark scenes, keep 90% of shadow areas neutral-desaturated and put chroma only on the light source; lift the black point in underwater, fog, or smoke scenes (with blue-shifted underwater shadows and neutral-black night shadows)",
  typography:
    "text appears only as physical used objects in the scene: smudged hand-chalked boards, worn printed signs, labels, sticky notes, or screens with natural perspective, surface wear, and lighting; never floating graphic overlays",
  motion:
    "Gimbal-smooth or organic handheld micro-drift with natural human weight transfer, cloth physics, and restrained real-person facial and mouth articulation (small natural ~30–40% jaw opening when speaking, clean lip closure on pauses, never exaggerated wide-open mouth or rubbery cheeks). One clean continuous shot per beat, no repeats. A clip may hold one prime, or move from one prime to another, such as 35mm f/1.4 to 80mm f/1.4, or 50mm f/1.4 back to 24mm f/1.2. No cartoon whip or snap zoom.",
  negatives:
    "cartoon, outlines, flat colour, illustration, 3D toon shading, 8K, ultra-realistic, hyperrealistic, masterpiece, flat front-lit lighting, even beauty fill light, harsh dramatic side-light contrast, half-dark face, waxy airbrushed plastic skin, reflective skin, shiny forehead or nose hot spots, oily specular forehead sheen, sterile AI-clean noise-free skin, glamour model face, exaggerated wide-open mouth, excessive jaw swing, rubbery cheeks, changing teeth, symmetrical sterile room, vague beautiful colors, unmotivated warm orange tint, blown-out pure white highlights, neon oversaturated shadows, crushed zero blacks, film grain, film stock, Kodak Portra, film LUT, filmic colour grade, faded milky blacks, amber vintage film cast, heavy vignetting, halation glow, floating UI text, watermarks, uncanny faces",
} as const;

// Phase A: how each scene's Light and Camera parts are written for realistic style.
export const REALISTIC_LIGHT_DIRECTOR_RULE =
  "Realistic light & camera: describe the physical camera capture rather than beauty or quality buzzwords (never write 8K, ultra-realistic, hyperrealistic, or masterpiece; prompt honest light direction rather than exaggerated colour-grading intensity). Keep daytime and indoor scenes brightly and naturally well-exposed with clear midtones and readable room detail (never dim, murky, or underexposed unless the scene is explicitly set at night). In every Character and Set part, direct candid, unposed in-between expressions, non-reflective diffuse matte-natural skin with visible pores and peach-fuzz (because real porous skin diffuses light rather than reflecting it: zero skin reflectivity, zero shiny hot spots on forehead/nose/cheeks, and zero oily, waxy, metallic, or plastic specular sheen), and concrete lived-in details (everyday workbench clutter, worn textures, slight asymmetry) so the model never fills gaps with sterile defaults. In every Light part, set contrast and black point per shot from that shot's own scene light (never force one uniform grading across different settings): use soft diffused ambient room light or gentle window daylight with a low, gradual tonal transition across the face (soft lifted shadows under the chin and around the eyes, never harsh dramatic side-light contrast, never a half-dark face, never flat beauty-ring front fill), and name honest, concrete light and shadow colours (e.g. soft neutral daylight with gently cooler shadows, cool shop fluorescents, overcast window daylight, or warm lamp light only when the lamp is visible; never vague phrases like beautiful colors). Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible in frame. In extreme dark scenes, keep 90% of shadow areas neutral-desaturated and put chroma only on the light source (no neon shadows). Keep glowing objects below pure-white clipping with soft roll-off and no blown-out glare or halation glow. Lift the black point in underwater, fog, or smoke scenes (underwater shadows stay blue-shifted; night shadows stay neutral black); elsewhere keep shadow blacks clean and neutral with full detail (never faded, milky, or crushed). In every Camera part, name the exact shot size (full shot / medium shot / close-up / extreme close-up), a modern full-frame digital camera (Sony A7 IV / Canon EOS R5 / Leica Q3, true-to-life colour, no film stock, no Kodak Portra, no film LUT), focal length (24mm wide-angle lens / 35mm lens / 50mm lens / 85mm portrait lens — use 50mm or 85mm for portraits), aperture and depth of field (deep focus, f/11 to show the environment; shallow depth of field, f/4; or f/1.4, creamy bokeh background to isolate the subject from a busy background), candid framing (slightly off-center, clean edges with no vignetting or chromatic aberration), and a clean digital capture (ISO 100 in normal light, no film grain, no film LUT; low light may show faint digital sensor noise only).";

// Each realistic still: rendered after the scene's own Light and Camera parts.
export const REALISTIC_FRAME_RENDER_RULE =
  "Realistic light & camera: light faces and surfaces with soft diffused ambient room light or gentle window daylight and a low, gradual tonal transition across the face (soft natural shadows under the chin and around the eyes, re-lighting any attached character blueprint to match the scene's ambient light; never harsh dramatic side-light contrast, never a half-dark face, never flat beauty-ring front fill), and concrete light/shadow colour contrast (e.g. soft neutral daylight with gently cooler shadows, cool shop fluorescents, overcast window light, or warm lamp light only when the lamp is in frame; never waxy airbrushed skin, reflective skin hot spots, oily specular sheen, or vague 'beautiful colors'). Keep daytime and indoor scenes brightly and naturally well-exposed with clear midtones and readable room detail (never dim, murky, or underexposed unless the scene is explicitly set at night). Keep highlights neutral or cool by default, reserving warm highlights strictly for shots with a visible warm practical lamp, fire, or sunset in frame; in extreme dark scenes keep 90% of shadows neutral-desaturated with colour only on the light source; lift the black point in underwater, fog, or smoke scenes (with blue-shifted underwater shadows and neutral night shadows). Describe the physical capture on a modern full-frame digital camera (true-to-life colour, no film stock, no Kodak Portra, no film LUT; never 8K, hyperrealistic, or beauty-filter aesthetics) showing visible skin pores, fine peach-fuzz, and non-reflective diffuse matte-natural skin micro-relief (human skin is never reflective: zero shiny hot spots on the forehead, nose bridge, or cheeks, and zero oily, waxy, or metallic sheen). Match real camera optics from the Scene (24mm / 35mm / 50mm / 85mm portrait lens; deep focus f/11 for environment or f/4 to f/1.4 creamy bokeh background for subject isolation; full shot / medium shot / close-up / extreme close-up). Keep a clean digital capture with no film grain so the still looks genuinely photographed, with clean edges and no vignetting, chromatic aberration, or halation glow; keep glowing objects below pure-white clipping, and keep shadow blacks clean and neutral with full detail (never faded, milky, or crushed).";

// Phase B: the director keeps this light and live-action physiology in every realistic video prompt.
export const REALISTIC_VIDEO_DETAIL_RULE =
  "Realistic light & live-action capture: one clean continuous shot per beat, no repeats. The video keeps the keyframes' soft diffused ambient light with low, gradual tonal transitions across the face (never harsh side-light contrast or half-dark faces), non-reflective diffuse matte-natural skin pores, peach-fuzz (zero skin reflectivity, zero shiny forehead/nose/cheek hot spots, zero oily or plastic specular sheen), and fabric micro-texture, no film grain and clean neutral shadow blacks, neutral/cool highlights (warm only when a practical warm source is in frame), and unclipped glowing sources. Animate real human micro-physiology (natural blinks, subtle ocular micro-saccades, small breaths lifting the chest and shoulders, genuine muscle weight transfer, natural cloth drape, and restrained real-person lip and jaw articulation whenever a character speaks — ~30–40% conversational mouth opening, clean lip closure on bilabial m/b/p sounds and pauses, zero exaggerated wide-open mouth, zero excessive jaw swing, and zero rubbery cheeks). Clean spoken voice only — no sound effects (no dings, chimes, whooshes, pops, or Foley SFX). No cartoon snap verbs. No flat beauty-filter fill and no waxy or reflective plastic skin.";

export const REALISTIC_NARRATOR_VIDEO_DETAIL_RULE =
  "Realistic light & live-action capture: one clean continuous shot per beat, no repeats. The video keeps the keyframes' soft diffused ambient light with low, gradual tonal transitions across the face (never harsh side-light contrast or half-dark faces), non-reflective diffuse matte-natural skin pores, peach-fuzz (zero skin reflectivity, zero shiny forehead/nose/cheek hot spots, zero oily or plastic specular sheen), and fabric micro-texture, no film grain and clean neutral shadow blacks, neutral/cool highlights (warm only when a practical warm source is in frame), and unclipped glowing sources. Animate real human micro-physiology (natural blinks, subtle ocular micro-saccades, small breaths lifting the chest and shoulders, genuine muscle weight transfer, natural cloth drape, and a normal, alive, engaged facial expression with lips firmly closed and zero mouth or jaw speech articulation — the on-screen character never speaks or lip-syncs). Clean spoken voice only — no sound effects (no dings, chimes, whooshes, pops, or Foley SFX). No cartoon snap verbs. No flat beauty-filter fill and no waxy or reflective plastic skin.";

// Appended at send time so even a stored or model-written prompt carries it.
export const REALISTIC_VIDEO_LIGHT_LOCK =
  "Light lock: one clean shot per beat, no repeats; keep the first frame's soft diffused ambient light, low gradual tonal roll-off (no harsh shadows or half-dark face), and no film grain and clean neutral shadow blacks for the whole clip; non-reflective diffuse matte-natural skin pores and peach-fuzz with zero skin reflectivity, zero shiny forehead/nose/cheek hot spots, and zero oily or plastic sheen, natural blinks, breathing chest movement, restrained natural mouth and jaw articulation when speaking (no exaggerated mouth opening, no excessive jaw swing, no rubbery cheeks), and real fabric texture; highlights stay below pure-white clipping; no flat beauty-filter fill, no waxy or airbrushed skin.";

export const REALISTIC_NARRATOR_VIDEO_LIGHT_LOCK =
  "Light lock: one clean shot per beat, no repeats; keep the first frame's soft diffused ambient light, low gradual tonal roll-off (no harsh shadows or half-dark face), and no film grain and clean neutral shadow blacks for the whole clip; non-reflective diffuse matte-natural skin pores and peach-fuzz with zero skin reflectivity, zero shiny forehead/nose/cheek hot spots, and zero oily or plastic sheen, natural blinks, breathing chest movement, normal, alive, engaged facial expression with lips firmly closed and zero mouth or jaw speech movement (the on-screen character is silent and never lip-syncs to the off-screen narrator), and real fabric texture; highlights stay below pure-white clipping; no flat beauty-filter fill, no waxy or airbrushed skin.";

// Self-shot creator / vlog capture rules (Talking Head & Surprise Hook) — modern human camera
// equipment (iPhone 16 Pro / Sony ZV-E1 / DJI Osmo Pocket 3) with clean true-to-life digital sensor
// colour and soft even ambient room light, without harsh contrast or reflective skin.
export const SELF_SHOT_LIGHT_DIRECTOR_RULE =
  "Real human creator camera capture: describe authentic everyday recording on modern creator camera equipment (iPhone 16 Pro 24mm f/1.8 main camera on a tripod, Sony ZV-E1 full-frame vlog camera, or DJI Osmo Pocket 3 1-inch CMOS sensor; never heavy vintage 35mm film stock, never 8K/hyperrealistic buzzwords, never AI beauty-mode). In every Character and Set part, direct candid, unposed human expressions, raw unretouched non-reflective diffuse matte real skin with visible pores, fine peach-fuzz, and subtle under-eye/nasolabial micro-texture (zero skin reflectivity, zero shiny forehead/nose/cheek hot spots, zero oily, waxy, metallic, or plastic specular sheen, zero beauty-filter smoothing), and lived-in everyday room details. In every Light part, use soft, even, diffused ambient indoor light or gentle window daylight with a low, gradual tonal transition across the face (soft minimal shadows under the chin and around the eyes — never harsh dramatic side-light contrast, never a half-dark face, never sharp rim light, never flat beauty-ring glare). Keep highlights neutral or warm-natural and below pure-white clipping. In every Camera part, name the modern creator camera and optics (24mm f/1.8 or 50mm f/1.8 lens, natural shallow depth of field with tack-sharp face and soft background bokeh, clean modern digital CMOS sensor readout with subtle natural ISO 100–400 sensor micro-texture, zero heavy vintage film grain or retro colour filter).";

export const SELF_SHOT_FRAME_RENDER_RULE =
  "Real human camera capture: shot on modern creator camera equipment (iPhone 16 Pro 24mm f/1.8 camera or Sony ZV-E1 / DJI Osmo Pocket 3 CMOS capture; never vintage 35mm film filter, never 8K/hyperrealistic buzzwords, never AI beauty-mode). Match the exact camera framing and indoor setting from the Scene (never a blank seamless studio wall). Light faces and surfaces with soft, even, diffused ambient indoor room light or gentle window daylight so transitions between light and shadow on the face are subtle, low-contrast, and gradual (soft minimal shadows under the chin and around the eyes — NEVER harsh high-contrast side lighting, NEVER a half-dark face, NEVER sharp rim-light hair outlines, NEVER studio hot spots). Keep highlights soft and below pure-white clipping. Faithfully preserve the attached character portrait's raw unretouched human skin with non-reflective diffuse matte pore texture across cheeks, nose, forehead, chin, and temples (because real porous skin diffuses light rather than reflecting it: ZERO skin reflectivity, ZERO shiny hot spots on the forehead, nose bridge, or cheekbones, and ZERO oily, waxy, glossy, metallic, or plastic specular sheen), fine peach-fuzz, natural under-eye / laugh-line / cheek micro-relief with subtle uneven tone, loose flyaway hair strands, real fabric weave, tack-sharp focus on the eyes with a natural un-squeezed portrait scale (zero vertical stretching or horizontal compression) and creamy optical background bokeh, and clean modern CMOS sensor color with natural ISO micro-texture that keeps skin pores readable (no heavy 35mm film grain or retro LUT).";

export const SELF_SHOT_VIDEO_DETAIL_RULE =
  "Real human camera & live-action capture: one clean continuous shot per beat, no repeats, filmed as a real creator camera capture (iPhone / Sony ZV-E1 / DJI Osmo Pocket 3) with organic 1–2° micro-sway. Keep the keyframes' soft, even, low-contrast diffused ambient indoor light (gradual, subtle facial shading with no harsh shadows or bright hot spots), lived-in room depth, and unfiltered non-reflective diffuse matte skin pores, peach-fuzz, and cheek micro-relief (zero skin reflectivity, zero shiny forehead/nose/cheek glow, zero oily, airbrushed, or plastic specular sheen), clean modern digital sensor color (no heavy film grain or vintage color cast), and unclipped highlights. Animate real human micro-physiology (natural blinks, subtle ocular micro-saccades, small breaths lifting the chest and shoulders, genuine weight transfer, natural cloth drape, and natural, lifelike speech-synced mouth articulation whenever a character speaks — smooth conversational mouth shapes, clean bilabial m/b/p closure on pauses, zero frozen presenter half-smile, zero closed mouth while audio speaks, zero cartoon O-mouth, zero excessive jaw swing, and zero rubbery cheeks). No flat beauty-filter glare and no waxy or reflective plastic skin.";

export const SELF_SHOT_VIDEO_LIGHT_LOCK =
  "Light lock: one clean shot per beat with organic 1–2° micro-sway, no repeats; keep the first frame's clean modern creator-camera look (iPhone 16 Pro / Sony ZV-E1 CMOS sensor) and soft, even, low-contrast diffused ambient indoor light for the whole clip (no harsh side shadows, no bright hot spots); non-reflective diffuse matte skin pores, peach-fuzz, and cheek micro-relief with ZERO skin reflectivity and ZERO oily, glossy, or plastic sheen, natural blinks, breathing chest movement, natural conversational mouth and jaw articulation when speaking (no frozen presenter smile, no closed mouth while audio speaks, no cartoon O-mouth, no excessive jaw swing, no rubbery cheeks), and real fabric texture; clean true-to-life digital color with no heavy film grain or vintage tint; highlights stay below pure-white clipping; no waxy or airbrushed skin.";

export function styleForSelfShotSkill<
  T extends { id?: string; baseStyleId?: string; look: string; palette: string; negatives: string },
>(style: T): T {
  if (!isRealisticStyle(style)) return style;
  return {
    ...style,
    look: "authentic self-recorded creator video & photograph shot on modern human camera equipment (iPhone 16 Pro 24mm f/1.8 main camera on a tripod, Sony ZV-E1 full-frame mirrorless vlog camera, or DJI Osmo Pocket 3 1-inch CMOS sensor; never AI beauty-mode, glossy studio stock, or heavy vintage 35mm film filter): unfiltered non-reflective diffuse matte skin pores, fine peach-fuzz, and fabric micro-relief lit by soft, even, diffused ambient indoor light or gentle window daylight with subtle, gradual, low-contrast facial transitions (soft minimal shadows under the chin and around the eyes, ZERO skin reflectivity, ZERO shiny hot spots on forehead/nose/cheeks, ZERO oily or plastic specular sheen, never harsh dramatic side-light contrast, never dark moody cinema shadows), clean modern digital CMOS sensor readout with subtle natural ISO 100–400 micro-texture, gentle highlight roll-off keeping bright windows below pure-white clipping, candid unposed framing with lived-in everyday background details, and natural optical shallow depth of field (24mm f/1.8 or 35mm f/1.8, tack-sharp face with soft optical background bokeh).",
    palette:
      "true-to-life modern digital camera color (natural Rec.709 / iPhone 16 Pro / Sony ZV-E1 color science) with honest soft ambient indoor light (soft diffused daylight balanced with warm-natural indoor room tone; never heavy vintage film LUT, never muddy yellow-green film cast, never harsh high-contrast shadows): soft, even highlights and clean, natural shadow tones with full detail.",
    negatives: `${style.negatives}, heavy 35mm film grain, vintage film stock filter, retro Kodak LUT, muddy faded blacks, dark moody cinema lighting, harsh half-face shadows, reflective shiny skin`,
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

export function lockRealisticVideoLight(
  prompt: string,
  options?: { selfShot?: boolean; narratorOnly?: boolean },
) {
  const text = prompt.trim();
  const lock = options?.selfShot
    ? SELF_SHOT_VIDEO_LIGHT_LOCK
    : options?.narratorOnly
      ? REALISTIC_NARRATOR_VIDEO_LIGHT_LOCK
      : REALISTIC_VIDEO_LIGHT_LOCK;
  if (
    !text ||
    text.includes(REALISTIC_VIDEO_LIGHT_LOCK) ||
    text.includes(REALISTIC_NARRATOR_VIDEO_LIGHT_LOCK) ||
    text.includes(SELF_SHOT_VIDEO_LIGHT_LOCK)
  ) {
    return text;
  }
  return `${text}\n${lock}`;
}

// Shared by every realistic reference image the scene still copies from.
// A smooth blueprint, prop tile, or empty set is what the still then copies.
const REALISTIC_SURFACE =
  "Realistic texture: captured on a modern full-frame digital camera (true-to-life colour, no film stock, no Kodak Portra, no film LUT) with soft, even, diffused ambient light and a low, gradual tonal transition from light to soft shadow (never harsh dramatic side-light contrast, never flat beauty-ring glare, never waxy airbrushed surfaces, glamour retouching, or sterile AI-clean surfaces). Use concrete light and shadow colour (soft neutral daylight with gently cooler shadows; never vague beautiful colors or an amber vintage cast) and keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible. Clean digital capture with no film grain, clean edges, and no vignetting or halation. Keep highlights below pure-white clipping, and keep shadow blacks clean and neutral with full detail (never faded, milky, or crushed).";

// Character sheet, identity portrait, and full-body figure.
export const REALISTIC_CHARACTER_RENDER_RULE = [
  "Realistic texture: captured on a modern full-frame digital camera (true-to-life colour, no film stock, no Kodak Portra, no film LUT, no film grain) with soft, even, diffused ambient daylight and a low, gradual tonal transition across the face (subtle natural shading under the chin and around the eyes that reveals visible pores, peach-fuzz, and skin micro-relief while keeping the whole face and both eyes evenly and naturally lit — never harsh side-light contrast, never a half-dark face, never flat beauty-ring glare, and never waxy or reflective plastic skin). Clean digital capture with no film grain, keeping highlights unclipped and shadow blacks clean and neutral.",
  "Cast a believable everyday non-model person with authentic, unretouched non-reflective diffuse matte human skin texture (even if the source photo has phone beauty-filter smoothing or flash glare, reconstruct real organic skin micro-relief): show real skin pores, peach-fuzz, natural skin micro-texture, fine lines, and a soft diffuse matte-natural finish (because porous human skin diffuses light rather than reflecting it: ZERO skin reflectivity, ZERO shiny hot spots on forehead, nose, or cheeks, and ZERO oily, waxy, glossy, or plastic specular sheen), loose flyaway hair strands, and real fabric weave — never over-smooth or airbrush.",
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
  "Keep daytime and indoor rooms brightly and naturally well-exposed with clear midtones and readable architectural detail (never dim, murky, or underexposed unless the location is explicitly set at night).",
  "Every cell shares that one light direction (practical room fixtures, overcast window daylight, or street bounce). Keep highlights neutral or cool unless a warm practical lamp, sunset, or fire is visible in the set.",
  "A glowing fixture stays below clipping with a soft roll-off and no halation glow. Lift the black point in fog, smoke, or underwater. In a dark set, keep shadow chroma low and put colour only on the light source.",
  "Architecture and set dressing keep real material texture and authentic lived-in details (worn surfaces, natural clutter, cables, or smudges — never a sterile symmetrical stock room).",
  "Camera by cell: the wide establishing cell is a full shot on a 24mm wide-angle lens at f/11, deep focus; the medium and angled cells are a medium shot on a 35mm or 50mm lens at f/4; the architecture detail cell is a close-up on an 85mm portrait lens at f/1.4 with a creamy bokeh background.",
].join(" ");
