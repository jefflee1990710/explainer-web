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
      "Light source: the key light from the Light line comes from one side and shapes the face, the far cheek falls off into soft shadow, and a faint rim light separates the hair and shoulders from the background. Never flat, even front light.";
    const skin =
      "Skin: visible pores, fine peach-fuzz hair catching the key light, natural uneven skin tone with tiny imperfections, a light natural sheen on the forehead and nose, and loose flyaway hair strands. Never smooth porcelain or plastic skin.";
    const depth = scene.fullBody
      ? "Depth: one soft, out-of-focus foreground element at a lower side edge of the frame (the blurred edge of a houseplant leaf or a chair back), never covering the body or the subtitle. The person is sharp and the background falls into soft bokeh, like a real camera."
      : "Depth: one soft, out-of-focus foreground element at a side edge of the frame (the blurred edge of a houseplant leaf or the rim of a mug), never covering the face, the hands, or the subtitle. The face is sharp and the background falls into soft bokeh, like a real camera.";
    if (scene.openingPhoto) return `Realism: ${skin}`;
    return `Realism: ${light} ${skin} ${depth} The foreground element and light stay identical in every clip.`;
  }
  const light =
    "光源：光線一節講嘅主光由一邊打埋嚟，塑造塊臉嘅立體感，另一邊面頰自然暗落去，頭髮同膊頭有一道淡淡嘅輪廓光，同背景分開。唔好平均正面平光。";
  const skin =
    "皮膚：睇到毛孔、主光照住嘅細汗毛、自然唔均勻嘅膚色同細微瑕疵，額頭同鼻有少少自然油光，有幾條散落髮絲。唔好陶瓷咁滑、唔好塑膠皮膚。";
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
    return `Realism: natural blinks every few seconds, small breaths that lift the shoulders, skin keeps its pores and fine hair, ${hold}.`;
  }
  const hold = scene.openingPhoto
    ? "光線同第一幀一樣"
    : "主光同輪廓光固定唔變，朦咗嘅前景邊緣唔郁，焦點一直喺塊臉";
  return `真實感：每幾秒自然眨眼，細細啖呼吸令膊頭微微起伏，皮膚保持毛孔同細汗毛，${hold}。`;
}
