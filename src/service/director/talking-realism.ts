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
      "Light source: the key light and faint rim light come strictly from the visible window side in the Light line (never from the dark interior or bookshelf side opposite the window, and never copy the blueprint's studio light direction), lighting the window-facing cheek while the far cheek away from the window falls into deep negative-fill shadow with a clear nose-bridge shadow (grazing contrast, no front fill, no unmotivated warm orange backlight, overcast window daylight kept soft below pure-white clipping). Never flat, even front light.";
    const skin =
      "Skin: visible pores, fine peach-fuzz hair catching the key light, natural uneven skin tone with tiny imperfections, a light natural sheen on the forehead and nose, loose flyaway hair strands, subtle 35mm film grain, and slight optical chromatic aberration. Never smooth porcelain or plastic skin.";
    const depth = scene.fullBody
      ? "Depth: one soft, out-of-focus foreground element at a lower side edge of the frame (the blurred edge of a houseplant leaf or a chair back), never covering the body or the subtitle. The person is sharp and the background falls into soft bokeh, like a real camera."
      : "Depth: one soft, out-of-focus foreground element at a side edge of the frame (the blurred edge of a houseplant leaf or the rim of a mug), never covering the face, the hands, or the subtitle. The face is sharp and the background falls into soft bokeh, like a real camera.";
    if (scene.openingPhoto) return `Realism: ${skin}`;
    return `Realism: ${light} ${skin} ${depth} The foreground element and light stay identical in every clip.`;
  }
  const light =
    "光源：主光同淡淡嘅輪廓光必須嚴格由畫面入面睇到嘅窗嗰一邊打埋嚟（絕對唔好由對面暗處書架嗰邊打光，亦唔好照抄角色藍圖嘅影樓光方向），面向窗嗰邊面頰受光，背向窗嘅另一邊面頰自然暗落去形成明顯鼻影同負補光陰影（無正面平光補光、無不合理嘅暖橙色背光，窗外日光柔和唔過曝死白）。唔好平均正面平光。";
  const skin =
    "皮膚：睇到毛孔、主光照住嘅細汗毛、自然唔均勻嘅膚色同細微瑕疵，額頭同鼻有少少自然油光，有幾條散落髮絲，帶細緻底片顆粒感。唔好陶瓷咁滑、唔好塑膠皮膚。";
  const depth = scene.fullBody
    ? "景深：畫面下方一邊邊緣有一樣失焦朦咗嘅前景（例如盆栽葉邊或者椅背），唔好遮住身體同字幕。人物清楚，背景自然虛化，好似真相機影咁。"
    : "景深：畫面一邊邊緣有一樣失焦朦咗嘅前景（例如盆栽葉邊或者杯邊），唔好遮住塊臉、雙手同字幕。塊臉清楚，背景自然虛化，好似真相機影咁。";
  if (scene.openingPhoto) return `真實感：${skin}`;
  return `真實感：${light}${skin}${depth}前景同光每段都一樣。`;
}

// Appended to each talking-head motion prompt so the clip keeps the stills' realism.
export function talkingRealismMotion(language: VoLanguage | undefined, scene: RealismScene = {}) {
  if (language === "en" || !language) {
    const hold = scene.openingPhoto
      ? "the light stays as in the first frame"
      : "the key light and the rim light stay fixed, the blurred foreground edge stays still and soft, and focus stays on the face";
    return `Realism: natural blinks every few seconds, subtle ocular micro-saccades, small breaths that lift the chest and shoulders, skin keeps its pores and fine hair, ${hold}.`;
  }
  const hold = scene.openingPhoto
    ? "光線同第一幀一樣"
    : "主光同輪廓光固定唔變，朦咗嘅前景邊緣唔郁，焦點一直喺塊臉";
  return `真實感：每幾秒自然眨眼，眼球有細微自然跳動，細細啖呼吸令心口同膊頭微微起伏，皮膚保持毛孔同細汗毛，${hold}。`;
}
