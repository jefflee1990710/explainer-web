import type { VoLanguage } from "@/model/project";

// Cinematic realistic talking-head only. Three cues that stop the read looking AI-made:
// a motivated light source, real skin detail, and a soft foreground layer for depth.
// Flat, outlined, or chalk styles never get these (see realistic-light.ts).

type RealismScene = {
  fullBody?: boolean;
  // The user's opening photo sets light and framing; only skin detail is added.
  openingPhoto?: boolean;
  // Preset pose already names the crop — keep depth/skin without forcing collarbone-up.
  poseOwnsFraming?: boolean;
};

// Appended to every talking-head still. Clip 2+ starts copy the previous end, so it carries over.
export function talkingRealismStill(language: VoLanguage | undefined, scene: RealismScene = {}) {
  if (language !== "yue" && language !== "zh") {
    const light =
      "Light source: directional soft window daylight from one side with iPhone Smart HDR and soft rim light (1.4:1–1.8:1 cheek-to-cheek contrast, clear nose-bridge shadow, 25–40% natural falloff on the far cheek, bright circular eye catchlights on dark contact-lens/iris pupils, warm subsurface scattering on the lit cheek, and natural lip moisture on both lips; never flat frontal beauty-ring fill that erases cheek shadows, never harsh dark half-face cinema blackouts; keep window highlights below pure-white clipping).";
    const skin =
      "Skin & camera sensor: authentic real-person smartphone front-camera / creator selfie capture (iPhone 16 Pro 24mm f/1.8 camera or Sony ZV-E1 at 30–40cm intimate selfie distance — clean, bright, true-to-life phone HDR color, zero heavy vintage 35mm film grain or retro film LUT); copy and preserve the attached character portrait's exact facial identity and raw unretouched human skin with hyper-visible pore texture across cheeks, nose bridge, forehead, chin, and temples (clearly readable individual pores in the lit cheek, never beauty-smoothed), fine peach-fuzz hair catching the side light on the jawline and upper lip, natural under-eye, nasolabial, and cheek skin micro-relief with soft uneven tone, natural individual tooth enamel detail, natural lower-lip moisture reflection, and a clean matte-natural complexion (zero oily, waxy, or glossy specular sheen and zero porcelain shine on the forehead, nose, cheeks, or collarbones), individual wispy bangs and loose flyaway hair strands falling naturally across the forehead and ears, and real fabric weave on the collar/shoulders. Never smooth porcelain, silicone, airbrushed, or plastic skin.";
    const depth = scene.fullBody
      ? "Depth: natural shallow depth of field — the person is tack-sharp and the background falls into soft optical bokeh, like a real mirrorless or smartphone creator camera, with no foreground objects blocking any corner of the frame."
      : scene.poseOwnsFraming
        ? "Depth: natural shallow depth of field (24mm f/1.8), tack-sharp face with soft optical background bokeh against a real lived-in indoor room corner (never a blank studio seamless wall), zero vertical stretching or horizontal compression, with no foreground objects blocking any corner of the frame."
        : "Depth: natural shallow depth of field (24mm f/1.8) in an intimate 30–40cm smartphone front-camera close-up framing (cropped from upper chest / collarbone up, top of the hair touching or slightly cropped by the top frame edge so the face fills 60–65% of the vertical 9:16 frame, subtle 10-degree high-angle selfie perspective, zero vertical stretching or horizontal compression, no waist, no lap, no thighs, and no hands in frame) against a real lived-in indoor room corner with visible depth (soft bedhead, door frame, or window edge softly blurred behind the head — never a blank studio seamless wall), with no foreground objects blocking any corner of the frame.";
    if (scene.openingPhoto) return `Realism: ${skin}`;
    return `Realism: ${light} ${skin} ${depth} The framing and light stay identical in every clip.`;
  }
  const light =
    "光源：真實 iPhone Smart HDR 單側窗邊定向柔和自然光加柔和輪廓光 rim light（臉頰光比約 1.4:1–1.8:1，鼻樑有清晰自然陰影、遠側面頰有 25–40% 自然暗落，雙眼瞳孔有清晰明亮嘅眼神光 Catchlights、受光面頰有暖色次表面散射、雙唇有自然水潤光澤；絕對唔好正面美顏環形燈把面頰陰影抹平，亦唔好一邊死黑戲劇影；窗光唔過曝死白）。";
  const skin =
    "皮膚與相機質感：以現代真人 iPhone 16 Pro 手機近距離（30–40cm）自拍／Sony ZV-E1 實拍（色彩清透亮麗、無厚重複古 35mm 菲林粗顆粒或暗沉濾鏡）；忠實保留角色肖像嘅五官與零塑膠感真實人類皮膚，超清晰睇到毛孔（受光面頰、鼻樑、額頭、下巴同太陽穴都有清楚獨立毛孔，絕唔美顏磨皮）、側光下睇到面頰同唇上細微汗毛、眼下／法令紋／面頰自然微浮雕紋理同輕微膚色不均、自然水潤唇澤同次表面散射質感（額頭、鼻樑、面頰同鎖骨絕對唔好有油光、蠟質反光、陶瓷感或塑膠高光白點），額前碎髮同耳邊髮絲根根分明具空氣感，領口衣物有真實布料織紋。唔好陶瓷咁滑、唔好磨皮、唔好塑膠皮膚。";
  const depth = scene.fullBody
    ? "景深：自然淺景深，人物清晰銳利、背景自然光學虛化，好似真人用無反或手機相機實拍，畫面四角唔好加任何前景遮擋物。"
    : scene.poseOwnsFraming
      ? "景深：自然淺景深（24mm f/1.8），人物清晰銳利、背景自然光學虛化，背景係真實有層次嘅室內空間（絕對唔好空白棚拍無縫牆），無垂直拉長或橫向擠壓變形，畫面四角唔好加任何前景遮擋物。"
      : "景深：近距離 30–40cm 手機自拍大特寫景深（24mm f/1.8，由鎖骨／上胸口以上裁切、髮頂貼近畫面上緣，塊臉佔滿 9:16 直式畫面 60–65% 以上，微高角度 10 度自拍視角，不拍腰部、大腿或雙手，無垂直拉長或橫向擠壓變形），背景係真實有層次嘅室內空間（床頭／門框／窗邊柔和虛化，絕對唔好空白棚拍無縫牆），自然淺景深，畫面四角唔好加任何前景遮擋物。";
  if (scene.openingPhoto) return `真實感：${skin}`;
  return `真實感：${light}${skin}${depth}構圖同光每段都一樣。`;
}

// Appended to each talking-head motion prompt so the clip keeps the stills' realism.
export function talkingRealismMotion(language: VoLanguage | undefined, scene: RealismScene = {}) {
  if (language !== "yue" && language !== "zh") {
    const hold = scene.openingPhoto
      ? "the light stays as in the first frame"
      : "the natural window side light and clean digital camera color stay fixed, the lived-in room background bokeh stays steady, and focus stays tack-sharp on the face (no heavy vintage film grain or cinematic LUT)";
    return `Realism: organic handheld iPhone selfie micro-sway of about 1–2 degrees (never a locked tripod statue), natural blinks every few seconds, both eyes staying locked directly on the camera lens center, hyper-visible speech-energy lip-sync on every syllable (stressed opens ~45–55%, quiet ~20–30%, pauses fully close with a tiny lip press; glossy moist lip highlight; changing left/right smile asymmetry; never a frozen presenter half-smile or closed mouth while audio speaks; zero cartoon O-mouth, zero excessive jaw swing, zero rubbery cheeks), speech-driven eyebrow and cheek micro-expressions, small breaths that lift the chest and shoulders at natural real-time speed, unfiltered matte-natural human skin keeps hyper-visible pore texture, peach-fuzz, and cheek micro-relief with zero plastic, airbrushed, or oily specular sheen, ${hold}.`;
  }
  const hold = scene.openingPhoto
    ? "光線同第一幀一樣"
    : "自然單側窗光同清透真實相機色彩固定唔變，真實室內空間虛化穩定，焦點一直清晰喺塊臉（無厚重菲林顆粒或復古濾鏡）";
  return `真實感：有機手持 iPhone 自拍微晃約 1–2 度（唔好死鎖腳架），每幾秒自然眨眼，雙眼全程穩定直望鏡頭中心，每個音節都有明顯跟語音能量嘅口型（重音開約 45–55%、輕音約 20–30%、停頓時完全合唇並輕輕抿一下；唇有水潤高光；微笑左右唔對稱會跟住講嘢變化；有聲時絕對唔好凍住播音員淺笑或合口唔郁；無卡通大 O 嘴、無下巴大幅擺動或面部拉扯變形），眉毛同面頰跟重音微動，細細啖呼吸令心口同膊頭自然起伏，無濾鏡真實皮膚全程保持超清晰毛孔、細汗毛同面頰微浮雕紋理、無油光或磨皮塑膠反光，${hold}。`;
}
