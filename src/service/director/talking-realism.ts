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
  if (language !== "yue" && language !== "zh") {
    const light =
      "Light source: directional available window daylight and soft rim light coming from the visible window side (camera-right if the window is on the right) paired with soft warm indoor bounce light on the shadow cheek and negative fill on the far edge, sculpting a natural 3:1 (1.4:1 to 1.8:1) portrait contrast ratio (25–40% natural shadow falloff across the far cheek, jawline, and side of the nose bridge with natural eye catchlights and subtle warm subsurface scattering on cheeks, nose tip, and ears; never flat beauty-ring front light, never dark moody cinema blackouts, zero unmotivated light from the dark side). Keep highlights neutral or cool unless a warm practical lamp is visible in frame, and keep the window sky and any glowing source below pure-white clipping.";
    const skin =
      "Skin & camera sensor: shot on modern human creator camera equipment (Sony ZV-E1 50mm f/1.8 portrait lens, iPhone 16 Pro 48MP 2x 48mm f/1.78 or 24mm f/1.8 main camera on a tripod, or DJI Osmo Pocket 3 CMOS sensor — clean true-to-life digital color, subtle natural ISO 100–400 sensor micro-texture, zero heavy vintage 35mm film grain or retro film LUT); copy and preserve the attached character portrait's exact real human skin texture with visible pores across cheeks, nose bridge, and forehead, fine peach-fuzz hair catching the side light, subtle natural under-eye and nasolabial skin micro-folds, natural individual tooth enamel variation and inner-mouth shading, natural uneven skin tone with authentic subsurface scattering, and a matte-natural human skin finish (zero oily, waxy, or glossy specular sheen and zero porcelain shine on the forehead, nose, cheeks, or collarbones), loose flyaway hair strands with natural air separation, real fabric weave, and natural contact shadows where hands rest on the lap. Never smooth porcelain, silicone, or plastic skin.";
    const depth = scene.fullBody
      ? "Depth: natural shallow depth of field — the person is tack-sharp and the background falls into soft optical bokeh, like a real mirrorless or smartphone creator camera, with no foreground objects blocking any corner of the frame."
      : "Depth: natural shallow depth of field (50mm f/1.8 / 24mm f/1.8) — the face and eyes are tack-sharp with a large, un-squeezed chest-up / medium-close portrait scale (zero vertical elongation or horizontal compression) and the background falls into creamy optical bokeh, with no foreground objects blocking any corner of the frame.";
    if (scene.openingPhoto) return `Realism: ${skin}`;
    return `Realism: ${light} ${skin} ${depth} The framing and light stay identical in every clip.`;
  }
  const light =
    "光源：具方向感嘅真實窗邊主光同柔和輪廓光由畫面入面睇到嘅窗嗰一邊打埋嚟，背光側保留室內柔和反射補光與邊緣自然負補光（Negative Fill，覆蓋角色參考圖原本嘅平光方向），面向窗嗰邊面頰自然清透、雙眼有自然眼神光（Catchlights），背向窗嗰邊面頰同鼻樑側面呈現立體嘅 1.4:1 至 1.8:1 光影明暗過渡同真實皮膚次表面散射（25–40% 自然陰影層次，雕塑出真實五官骨骼立體感；嚴禁正面死白美顏燈平光、亦無陰暗沉重嘅電影黑影；除非畫面有可見暖色檯燈否則亮部保持中性或自然日光色溫，窗外日光同發光體自然柔化唔過曝死白）。唔好平均正面平光。";
  const skin =
    "皮膚與相機質感：以現代真人日常拍攝設備實拍（Sony ZV-E1 50mm f/1.8 人像鏡、iPhone 16 Pro 48MP 腳架主鏡頭或 DJI Osmo Pocket 3 感光元件——色彩清透自然、細膩真實數位感光元件微紋理，無厚重複古 35mm 菲林粗顆粒或懷舊濾鏡）；零修圖無美顏濾鏡嘅真實人類皮膚，面頰、鼻樑同額頭清晰睇到毛孔（真實毛孔）、細微汗毛、眼下與法令紋自然皮膚紋理、真實獨立牙齒光澤同次表面散射質感（忠實保留角色肖像嘅真實毛孔同皮膚微起伏；額頭、鼻樑、面頰同鎖骨絕對唔好有油光、蠟質反光、陶瓷感或塑膠高光白點），有自然散落具空氣感嘅碎髮、西裝與衣物真實布料織紋，以及雙手放喺大髀時嘅自然接觸陰影。唔好陶瓷咁滑、唔好塑膠皮膚。";
  const depth = scene.fullBody
    ? "景深：自然淺景深，人物清晰銳利、背景自然光學虛化，好似真人用無反或手機相機實拍，畫面四角唔好加任何前景遮擋物。"
    : "景深：自然光學淺景深（50mm f/1.8 / 24mm f/1.8），塊臉同眼神清晰銳利、頭肩比例飽滿自然（無垂直拉長或橫向擠壓變形）、背景自然奶油感虛化，畫面四角唔好加任何前景遮擋物。";
  if (scene.openingPhoto) return `真實感：${skin}`;
  return `真實感：${light}${skin}${depth}構圖同光每段都一樣。`;
}

// Appended to each talking-head motion prompt so the clip keeps the stills' realism.
export function talkingRealismMotion(language: VoLanguage | undefined, scene: RealismScene = {}) {
  if (language !== "yue" && language !== "zh") {
    const hold = scene.openingPhoto
      ? "the light stays as in the first frame"
      : "the natural window light and clean digital camera color stay fixed, the background bokeh stays steady, and focus stays tack-sharp on the face (no heavy vintage film grain or cinematic LUT)";
    return `Realism: natural blinks every few seconds, both eyes staying locked directly on the camera lens center, restrained phoneme-accurate lip articulation with small natural jaw movement (zero exaggerated mouth opening, zero excessive jaw swing, zero rubbery cheeks), small breaths that lift the chest and shoulders at natural real-time speed, unfiltered matte-natural human skin keeps its visible pores and fine hair with zero plastic or oily specular sheen, ${hold}.`;
  }
  const hold = scene.openingPhoto
    ? "光線同第一幀一樣"
    : "自然窗光同清透真實相機色彩固定唔變，背景虛化穩定，焦點一直清晰喺塊臉（無厚重菲林顆粒或復古濾鏡）";
  return `真實感：每幾秒自然眨眼，雙眼全程穩定直望鏡頭中心，口型同下巴開合精準克制、幅度自然細緻（無誇張張大嘴、無下巴大幅擺動或面部拉扯變形），細細啖呼吸令心口同膊頭自然起伏，無濾鏡真實皮膚保持毛孔同細汗毛、無油光或塑膠反光，${hold}。`;
}
