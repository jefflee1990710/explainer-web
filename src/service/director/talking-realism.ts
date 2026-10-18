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
      "Light source: single directional key light and faint rim light coming strictly from the visible window side (camera-right if the window is on the right), brightly lighting the half of the face closest to the window while the opposite half of the face (camera-left, facing the dark interior/bookshelf) falls into deep, high-contrast negative-fill shadow with a dark nose-bridge shadow (at least 35% darker on the shadow cheek, zero front fill light, zero light from the dark side, never copy the blueprint's lighting). Keep the window sky soft muted overcast grey below pure-white clipping.";
    const skin =
      "Skin: visible pores, fine peach-fuzz hair catching the key light, natural uneven skin tone with tiny imperfections, a light natural sheen on the forehead and nose, loose flyaway hair strands, subtle 35mm film grain, and slight optical chromatic aberration. Never smooth porcelain or plastic skin.";
    const depth = scene.fullBody
      ? "Depth: natural shallow depth of field — the person is tack-sharp and the background falls into soft optical bokeh, like a real camera, with no foreground objects blocking any corner of the frame."
      : "Depth: natural shallow depth of field (24mm f/1.8) — the face is tack-sharp and the background falls into soft optical bokeh, like a real camera, with no foreground objects blocking any corner of the frame.";
    if (scene.openingPhoto) return `Realism: ${skin}`;
    return `Realism: ${light} ${skin} ${depth} The framing and light stay identical in every clip.`;
  }
  const light =
    "光源：主光同淡淡嘅輪廓光必須嚴格由畫面入面睇到嘅窗嗰一邊打埋嚟（絕對唔好由對面暗處書架嗰邊打光，亦唔好照抄角色藍圖嘅影樓光方向），面向窗嗰邊面頰受光，背向窗嘅另一邊面頰自然暗落去形成明顯鼻影同負補光陰影（無正面平光補光、無不合理嘅暖橙色背光，窗外日光柔和唔過曝死白）。唔好平均正面平光。";
  const skin =
    "皮膚：睇到毛孔、主光照住嘅細汗毛、自然唔均勻嘅膚色同細微瑕疵，額頭同鼻有少少自然油光，有幾條散落髮絲，帶細緻底片顆粒感。唔好陶瓷咁滑、唔好塑膠皮膚。";
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
    return `Realism: natural blinks every few seconds, subtle ocular micro-saccades, small breaths that lift the chest and shoulders, skin keeps its pores and fine hair, ${hold}.`;
  }
  const hold = scene.openingPhoto
    ? "光線同第一幀一樣"
    : "主光同輪廓光固定唔變，背景虛化穩定，焦點一直喺塊臉";
  return `真實感：每幾秒自然眨眼，眼球有細微自然跳動，細細啖呼吸令心口同膊頭微微起伏，皮膚保持毛孔同細汗毛，${hold}。`;
}
