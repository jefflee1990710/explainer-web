import type { IStyle } from "@/model/style";

// Hardcoded style definition for "realistic".
export const realisticStyle: IStyle = {
  "id": "realistic",
  "name": "Cinematic realistic",
  "description": "真實光影。每段在 24mm f/1.2、35mm f/1.4、50mm f/1.4、80mm f/1.4 裡選鏡頭。",
  "canvas": "real-world physical environment with lived-in everyday clutter and surface wear, lit by honest motivated practical light or overcast daylight with natural depth and surface micro-texture",
  "canvasColor": "#d9d6d0",
  "look": "authentic candid 35mm film capture (shot on Kodak Gold 200, Ektachrome, or Ilford HP5 with Ricoh GR III or Canon AE-1 optics, never AI beauty-mode or glossy studio stock): natural skin pores, peach-fuzz, and fabric micro-relief sculpted by grazing directional key light from the visible light-source side with negative fill on the shadow side (clear directional light-to-shadow falloff and nose-bridge shadow across the face, matte-natural skin finish with zero oily or plastic specular sheen, never flat front beauty light, never even front fill, never unmotivated rim light from the dark shadow side), honest optical imperfections (subtle film grain, slight chromatic aberration, gentle vignetting, subtle halation around bright practical lights, soft highlight roll-off keeping glowing sources below pure-white clipping, slightly lifted shadow blacks so 35mm film grain is never swallowed by crushed zero-blacks), candid unposed framing with natural lived-in background details, no illustration. Match real camera optics from the scene: shot size (full shot / medium shot / close-up / extreme close-up), focal length (24mm wide-angle lens / 35mm lens / 50mm lens / 85mm portrait lens), and aperture (deep focus, f/11 for environment; shallow depth of field, f/4; or f/1.4, creamy bokeh background to isolate the subject).",
  "palette": "scene-motivated honest colour and contrast per shot on Kodak Gold 200 or Ektachrome film stock with concrete light and shadow tones (e.g. warm amber light, muted teal shadows, cool overhead shop fluorescents, or flat overcast daylight; never vague beautiful colors or forced uniform LUT across different settings): neutral or cool highlights by default, reserving warm highlights strictly for shots with a visible practical warm lamp, fire, or sunset in frame; in extreme dark scenes, keep 90% of shadow areas neutral-desaturated and put chroma only on the light source; lift the black point in underwater, fog, or smoke scenes (with blue-shifted underwater shadows and neutral-black night shadows)",
  "typography": "text appears only as physical used objects in the scene: smudged hand-chalked boards, worn printed signs, labels, sticky notes, or screens with natural perspective, surface wear, and lighting; never floating graphic overlays",
  "motion": "Gimbal-smooth or organic handheld micro-drift with natural human weight transfer, cloth physics, and restrained real-person facial and mouth articulation (small natural ~30–40% jaw opening when speaking, clean lip closure on pauses, never exaggerated wide-open mouth or rubbery cheeks). One clean continuous shot per beat, no repeats. A clip may hold one prime, or move from one prime to another, such as 35mm f/1.4 to 80mm f/1.4, or 50mm f/1.4 back to 24mm f/1.2. No cartoon whip or snap zoom.",
  "negatives": "cartoon, outlines, flat colour, illustration, 3D toon shading, 8K, ultra-realistic, hyperrealistic, masterpiece, flat front-lit lighting, even beauty fill light, waxy airbrushed plastic skin, oily specular forehead sheen, sterile AI-clean noise-free skin, glamour model face, exaggerated wide-open mouth, excessive jaw swing, rubbery cheeks, changing teeth, symmetrical sterile room, vague beautiful colors, unmotivated warm orange tint, blown-out pure white highlights, neon oversaturated shadows, crushed zero blacks swallowing grain, floating UI text, watermarks, uncanny faces",
  "letteringLayout": "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.",
  "letteringLine1": "Line 1 is clean high-contrast all-caps title type, dark on a light plate, cinematic but readable.",
  "letteringLine2": "When line 2 exists, set it on a warm-yellow title plate with a thin dark edge. Not a TV caption bar.",
  "beatTitleLayout": "Place a named beat title in the title safe zone near 22%–26% of the frame height.",
  "reelLayout": "Layout: vertical reel safe zone. Center the subtitle horizontally between 64% and 78% of the frame height, max 2 lines, with side margins of at least 14% of the width. Keep it out of the top 14% and the bottom 20% (app chrome). No full-width bottom band, no corner tag.",
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/realistic-preview.webp",
  "previewFullUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/realistic",
  "behavior": {
    "realistic": true,
    "usesDrawingSurface": false,
    "monochromeChalk": false
  }
};
