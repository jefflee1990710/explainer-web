import type { VoLanguage } from "@/model/project";

// Cinematic realistic talking-head only. Three cues that stop the read looking AI-made:
// a motivated light source, real skin detail, and a soft foreground layer for depth.
// Flat, outlined, or chalk styles never get these (see realistic-light.ts).

type RealismScene = {
  fullBody?: boolean;
  // The user's opening photo sets light and framing; only skin detail is added.
  openingPhoto?: boolean;
};

// Appended to every talking-head still. Clip 2+ starts copy the previous end, so it carries over.
export function talkingRealismStill(language: VoLanguage | undefined, scene: RealismScene = {}) {
  if (language === "en" || !language) {
    const light =
      "Light source: grazing directional window daylight and faint rim light coming strictly from the visible window side (camera-right if the window is on the right), sculpting the window-facing cheek with negative fill and natural shadow roll-off on the far cheek facing the interior/bookshelf (clear nose-bridge shadow and directional portrait contrast, never flat front beauty light, never even front fill, zero unmotivated light from the dark side, never copy the blueprint's lighting). Keep highlights neutral or cool unless a warm practical lamp is visible in frame, and keep the window sky and any glowing source below pure-white clipping.";
    const skin =
      "Skin: visible pores, fine peach-fuzz hair catching the key light, natural uneven skin tone with tiny imperfections and authentic subsurface scattering, matte-natural human skin finish (override and de-filter any airbrushed or beauty-smoothed reference photo; zero oily, waxy, or glossy specular sheen on the forehead, nose, cheeks, or collarbones), loose flyaway hair strands, subtle 35mm film grain with slightly lifted shadow blacks so grain is never swallowed by crushed zero-blacks, and slight optical chromatic aberration. Never smooth porcelain, silicone, or plastic skin.";
    const depth = scene.fullBody
      ? "Depth: natural shallow depth of field — the person is tack-sharp and the background falls into soft optical bokeh, like a real camera, with no foreground objects blocking any corner of the frame."
      : "Depth: natural shallow depth of field (24mm f/1.8) — the face is tack-sharp and the background falls into soft optical bokeh, like a real camera, with no foreground objects blocking any corner of the frame.";
    if (scene.openingPhoto) return `Realism: ${skin}`;
    return `Realism: ${light} ${skin} ${depth} The framing and light stay identical in every clip.`;
  }
  const light =
    "光源：斜射方向性窗邊主光同淡淡嘅輪廓光必須嚴格由畫面入面睇到嘅窗嗰一邊打埋嚟（絕對唔好由對面暗處書架嗰邊打光，亦唔好照抄角色藍圖嘅影樓光方向），面向窗嗰邊面頰自然受光，背向窗嘅另一邊面頰做負補光（negative fill）呈現立體光影過渡同清晰鼻影（自然立體人像光比、無正面平光美顏補光、無生硬死白反光點；除非畫面有可見暖色檯燈否則亮部保持中性或冷調、無不合理嘅暖橙色背光，窗外日光同發光體壓低唔過曝死白）。唔好平均正面平光。";
  const skin =
    "皮膚：睇到毛孔、主光照住嘅細汗毛、自然唔均勻嘅膚色同細微瑕疵、真實人類皮膚次表面散射質感（即使參考圖有美顏磨皮都要還原真實毛孔紋理；額頭、鼻樑、面頰同鎖骨絕對唔好有油光、蠟質反光或塑膠高光白點），有幾條散落髮絲，帶細緻35mm底片顆粒感而且暗部黑位微抬唔壓死以免吞沒顆粒。唔好陶瓷咁滑、唔好塑膠皮膚。";
  const depth = scene.fullBody
    ? "景深：自然淺景深，人物清楚、背景自然虛化，畫面四角唔好加任何前景遮擋物。"
    : "景深：自然淺景深（24mm f/1.8），塊臉清楚、背景自然虛化，畫面四角唔好加任何前景遮擋物。";
  if (scene.openingPhoto) return `真實感：${skin}`;
  return `真實感：${light}${skin}${depth}構圖同光每段都一樣。`;
}

// Appended to each talking-head motion prompt so the clip keeps the stills' realism.
export function talkingRealismMotion(language: VoLanguage | undefined, scene: RealismScene = {}) {
  if (language === "en" || !language) {
    const hold = scene.openingPhoto
      ? "the light stays as in the first frame"
      : "the key light and the rim light stay fixed, the background bokeh stays steady, and focus stays on the face";
    return `Realism: natural blinks every few seconds, both eyes staying locked directly on the camera lens center, small breaths that lift the chest and shoulders at natural real-time speed, matte-natural human skin keeps its visible pores and fine hair with zero plastic or oily specular sheen, ${hold}.`;
  }
  const hold = scene.openingPhoto
    ? "光線同第一幀一樣"
    : "主光同輪廓光固定唔變，背景虛化穩定，焦點一直喺塊臉";
  return `真實感：每幾秒自然眨眼，雙眼全程穩定直望鏡頭中心，細細啖呼吸令心口同膊頭自然起伏，皮膚保持真實毛孔同細汗毛、無油光或塑膠反光，${hold}。`;
}
