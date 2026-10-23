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
      "Light source: natural available window daylight and soft rim light coming from the visible window side (camera-right if the window is on the right) mixed with natural indoor room light, giving a clean, bright, dimensional 1.2:1 to 1.5:1 portrait contrast ratio and soft natural shadow roll-off on the far cheek and nose bridge (override any flat lighting from the character reference sheet; never flat beauty-ring front light, never dark moody cinema shadows, zero unmotivated light from the dark side). Keep highlights neutral or cool unless a warm practical lamp is visible in frame, and keep the window sky and any glowing source below pure-white clipping.";
    const skin =
      "Skin & camera sensor: shot on modern human creator camera equipment (iPhone 16 Pro 24mm f/1.8 main camera on a tripod, Sony ZV-E1 mirrorless vlog camera, or DJI Osmo Pocket 3 CMOS sensor — clean true-to-life digital color, subtle natural ISO 100–400 sensor micro-texture, zero heavy vintage 35mm film grain or retro film LUT); unfiltered real human skin with visible pores, fine peach-fuzz hair catching the light, natural uneven skin tone with tiny imperfections and authentic subsurface scattering, matte-natural human skin finish (override and de-filter any airbrushed or beauty-smoothed reference photo; zero oily, waxy, or glossy specular sheen on the forehead, nose, cheeks, or collarbones), and loose flyaway hair strands. Never smooth porcelain, silicone, or plastic skin.";
    const depth = scene.fullBody
      ? "Depth: natural shallow depth of field — the person is tack-sharp and the background falls into soft optical bokeh, like a real mirrorless or smartphone creator camera, with no foreground objects blocking any corner of the frame."
      : "Depth: natural shallow depth of field (24mm f/1.8) — the face is tack-sharp and the background falls into soft optical bokeh, like a real smartphone or mirrorless creator camera on a tripod, with no foreground objects blocking any corner of the frame.";
    if (scene.openingPhoto) return `Realism: ${skin}`;
    return `Realism: ${light} ${skin} ${depth} The framing and light stay identical in every clip.`;
  }
  const light =
    "光源：真實自然窗邊日光同柔和輪廓光由畫面入面睇到嘅窗嗰一邊打埋嚟，配合自然室內環境光（覆蓋角色參考圖原本嘅平光方向），面向窗嗰邊面頰明亮清透，另一邊面頰呈現自然柔和嘅 1.2:1 至 1.5:1 立體過渡同自然鼻影（無正面死白美顏燈平光、亦無陰暗沉重嘅電影黑影；除非畫面有可見暖色檯燈否則亮部保持中性或自然日光色溫，窗外日光同發光體自然柔化唔過曝死白）。唔好平均正面平光。";
  const skin =
    "皮膚與相機質感：以現代真人日常拍攝設備實拍（iPhone 16 Pro 24mm f/1.8 腳架主鏡頭、Sony ZV-E1 無反相機或 DJI Osmo Pocket 3 感光元件——色彩清透自然、細膩真實數位感光元件微紋理，無厚重複古 35mm 菲林粗顆粒或懷舊濾鏡）；無美顏濾鏡嘅真實人類皮膚，睇到毛孔、細汗毛、自然膚色同真實皮膚次表面散射質感（即使參考圖有美顏磨皮都要還原真實毛孔紋理；額頭、鼻樑、面頰同鎖骨絕對唔好有油光、蠟質反光或塑膠高光白點），有幾條散落髮絲。唔好陶瓷咁滑、唔好塑膠皮膚。";
  const depth = scene.fullBody
    ? "景深：自然淺景深，人物清晰銳利、背景自然光學虛化，好似真人用無反或手機相機實拍，畫面四角唔好加任何前景遮擋物。"
    : "景深：自然淺景深（24mm f/1.8），塊臉清晰銳利、背景自然光學虛化，好似真人用手機或無反相機放腳架自拍，畫面四角唔好加任何前景遮擋物。";
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
