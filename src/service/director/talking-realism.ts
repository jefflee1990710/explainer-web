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
      "Light source: bright, soft, even indoor ambient daylight with iPhone Smart HDR auto-exposure (soft frontal-overhead room light balanced with directional window daylight from one side and soft rim light, lifting all shadows so both cheeks and the neck are brightly, evenly, and naturally illuminated without harsh dark half-face cinema shadows; subtle warm subsurface scattering on cheeks and nose, bright circular eye catchlights on dark contact-lens/iris pupils, and natural lip moisture; keep highlights below pure-white clipping).";
    const skin =
      "Skin & camera sensor: authentic real-person smartphone front-camera / creator selfie capture (iPhone 16 Pro 24mm f/1.8 camera or Sony ZV-E1 at 35–40cm intimate selfie distance — clean, bright, true-to-life phone HDR color, zero heavy vintage 35mm film grain or retro film LUT); copy and preserve the attached character portrait's exact facial identity and natural real human skin with visible pores across cheeks, nose bridge, and forehead, fine peach-fuzz hair, subtle natural under-eye and nasolabial skin micro-texture, natural individual tooth enamel detail, natural lower-lip moisture reflection, and a clean matte-natural complexion (zero oily, waxy, or glossy specular sheen and zero porcelain shine on the forehead, nose, cheeks, or collarbones), individual wispy bangs and loose flyaway hair strands falling naturally across the forehead and ears, and real fabric weave on the collar/shoulders. Never smooth porcelain, silicone, or plastic skin.";
    const depth = scene.fullBody
      ? "Depth: natural shallow depth of field — the person is tack-sharp and the background falls into soft optical bokeh, like a real mirrorless or smartphone creator camera, with no foreground objects blocking any corner of the frame."
      : "Depth: natural shallow depth of field (24mm f/1.8) in an intimate 35–40cm smartphone front-camera close-up framing (cropped from upper chest / collarbone up, top of the hair touching or slightly cropped by the top frame edge so the face fills 50–60% of the vertical 9:16 frame, subtle 10-degree high-angle selfie perspective, zero vertical stretching or horizontal compression, no waist, no lap, no thighs, and no hands in frame) against a simple, clean, lived-in off-white/warm-cream indoor wall corner, with no foreground objects blocking any corner of the frame.";
    if (scene.openingPhoto) return `Realism: ${skin}`;
    return `Realism: ${light} ${skin} ${depth} The framing and light stay identical in every clip.`;
  }
  const light =
    "光源：真實 iPhone Smart HDR 明亮柔和嘅室內漫射自然光（柔和正面與窗邊漫射光均勻照亮整張臉同頸部，搭配柔和輪廓光與背光側自然負補光 Negative Fill，雙頰清透白皙、雙眼瞳孔有清晰明亮嘅眼神光 Catchlights、下唇有自然水潤光澤，完全冇一邊亮一邊黑嘅死板戲劇黑影；除非畫面有可見暖色檯燈否則亮部保持清透自然日光色溫，唔過曝死白）。唔好平均死白美顏燈平光。";
  const skin =
    "皮膚與相機質感：以現代真人 iPhone 16 Pro 手機近距離（35–40cm）自拍／Sony ZV-E1 實拍（色彩清透亮麗、無厚重複古 35mm 菲林粗顆粒或暗沉濾鏡）；忠實保留角色肖像嘅五官與零塑膠感真實人類皮膚，清晰睇到毛孔（真實毛孔）、細微汗毛、眼下自然微紋理、自然水潤唇澤同次表面散射質感（額頭、鼻樑、面頰同鎖骨絕對唔好有油光、蠟質反光、陶瓷感或塑膠高光白點），額前碎髮同耳邊髮絲根根分明具空氣感，領口衣物有真實布料織紋。唔好陶瓷咁滑、唔好塑膠皮膚。";
  const depth = scene.fullBody
    ? "景深：自然淺景深，人物清晰銳利、背景自然光學虛化，好似真人用無反或手機相機實拍，畫面四角唔好加任何前景遮擋物。"
    : "景深：近距離 35–40cm 手機自拍大特寫景深（24mm f/1.8，由鎖骨／上胸口以上裁切、髮頂貼近畫面上緣，塊臉佔滿 9:16 直式畫面 50–60% 以上，微高角度 10 度自拍視角，不拍腰部、大腿或雙手，無垂直拉長或橫向擠壓變形），背景係簡潔真實嘅米白色室內牆角、自然淺景深，畫面四角唔好加任何前景遮擋物。";
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
