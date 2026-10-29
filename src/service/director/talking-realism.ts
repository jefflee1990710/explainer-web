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
    const light = scene.fullBody
      ? "Light source: warm-toned (3400K–4200K golden-amber indoor white balance), soft, even, diffused ambient indoor light and warm sunlit window daylight with a low, gradual tonal transition across the face and clothing (soft minimal shadows under the chin, around the eyes, and under the shoes on the floor, cozy warm colour temperature shared between subject and room — NEVER cold blue/grey clinical lighting, NEVER harsh high-contrast side lighting, NEVER a half-dark face, NEVER sharp rim-light hair outlines, NEVER cut-out green-screen composite lighting)."
      : "Light source: warm-toned (3400K–4200K golden-amber indoor white balance), soft, even, diffused ambient indoor light and warm sunlit window daylight with iPhone Smart HDR and a low, gradual tonal transition across the face (soft minimal shadows under the chin and around the eyes, warm creamy highlights, natural soft eye catchlights — NEVER cold blue/grey clinical lighting, NEVER harsh dramatic side-light contrast, NEVER a half-dark face, NEVER sharp rim light, NEVER bright hot spots; keep highlights soft below pure-white clipping).";
    const captureEn =
      scene.fullBody
        ? "Sony ZV-E1 / iPhone 16 Pro 50mm f/1.8 creator camera at 1.9m standing distance"
        : scene.poseOwnsFraming
          ? "iPhone 16 Pro 24mm f/1.8 camera or Sony ZV-E1 creator camera capture"
          : "iPhone 16 Pro 24mm f/1.8 camera or Sony ZV-E1 at 30–40cm intimate selfie distance";
    const skin =
      `Skin & camera sensor: authentic real-person smartphone / creator camera capture (${captureEn} — warm, inviting 3400K–4200K golden-amber indoor colour tone, warm healthy skin undertones, zero heavy vintage 35mm film grain or retro film LUT); faithfully copy and preserve the attached character blueprint's exact facial identity and natural human skin texture (visible pores, fine peach-fuzz hair, natural skin micro-relief, and a non-reflective diffuse matte-natural complexion with ZERO skin reflectivity, zero shiny hot spots, and zero oily, waxy, or glossy specular sheen), loose flyaway hair strands, and real fabric weave. Never smooth porcelain, silicone, airbrushed, reflective, or plastic skin.`;
    const depth = scene.fullBody
      ? "Depth: natural 50mm f/1.8 optical depth of field — the standing person is tack-sharp with soft grounded floor shadows and the background room/window view falls into realistic warm optical bokeh (never a flat pasted wallpaper backdrop), with no foreground objects blocking any corner of the frame."
      : scene.poseOwnsFraming
        ? "Depth: natural shallow depth of field (24mm f/1.8), tack-sharp face with soft warm optical background bokeh against a real lived-in indoor room corner (never a blank studio seamless wall), zero vertical stretching or horizontal compression, with no foreground objects blocking any corner of the frame."
        : "Depth: natural shallow depth of field (24mm f/1.8) in an intimate 30–40cm smartphone front-camera close-up framing (cropped from upper chest / collarbone up, top of the hair touching or slightly cropped by the top frame edge so the face fills 60–65% of the vertical 9:16 frame, subtle 10-degree high-angle selfie perspective, zero vertical stretching or horizontal compression, no waist, no lap, no thighs, and no hands in frame) against a real warm-toned lived-in indoor room corner with visible depth (soft bedhead, door frame, or window edge softly blurred behind the head — never a blank studio seamless wall), with no foreground objects blocking any corner of the frame.";
    if (scene.openingPhoto) return `Realism: ${skin}`;
    return `Realism: ${light} ${skin} ${depth} The framing and warm light stay identical in every clip.`;
  }
  const light = scene.fullBody
    ? "光源：溫暖柔和嘅暖色調（3400K–4200K 暖黃琥珀色溫）真實室內漫射環境光配溫暖窗光，面部同全身光暗過渡極之柔和漸進（下巴底、眼窩同鞋底只有極自然柔和嘅淺陰影，人物同室內空間充滿溫暖舒適嘅暖色調——絕對唔好偏冷白或藍灰冷色調、唔好有誇張光暗反差、唔好一邊光一邊黑嘅陰陽面、唔好刺眼逆光髮絲邊、唔好似退地貼上去背景板咁假）。"
    : "光源：溫暖柔和嘅暖色調（3400K–4200K 暖黃琥珀色溫）真實室內漫射環境光配溫暖柔和窗光（面部光暗過渡極之柔和漸進，帶溫暖奶油色柔和光感與健康紅潤暖調膚色，下巴底同眼窩只有極淡自然暗位，雙眼瞳孔有自然柔和眼神光——絕對唔好偏冷白或藍灰冷光、唔好有誇張光暗反差、唔好一邊光一邊黑嘅戲劇側影、唔好額頭鼻樑反光高光白點；窗光柔和唔過曝）。";
  const captureYue =
    scene.fullBody
      ? "現代真人 Sony ZV-E1／iPhone 16 Pro 50mm f/1.8 離人物約 1.9 米實拍"
      : scene.poseOwnsFraming
        ? "現代真人 iPhone 16 Pro 24mm f/1.8 腳架／Sony ZV-E1 實拍"
        : "現代真人 iPhone 16 Pro 手機近距離（30–40cm）自拍／Sony ZV-E1 實拍";
  const skin =
    `皮膚與相機質感：以${captureYue}（溫暖柔和嘅 3400K–4200K 暖色調室內白平衡、色彩溫暖通透、無厚重複古 35mm 菲林粗顆粒或暗沉濾鏡）；忠實保留角色藍圖嘅五官樣貌與自然啞光真實人類皮膚（保留藍圖自然毛孔、細微汗毛同真實紅潤暖調膚質，因為皮膚有肌理所以只會漫反射而唔會反光：額頭、鼻樑、蘋果肌、面頰、下巴、鎖骨同手部絕對唔可以有任何反光、高光白點、油光、水光、蠟質反光、陶瓷感或金屬塑膠感），自然散落碎髮，領口衣物有真實布料織紋。唔好陶瓷咁滑、唔好磨皮、唔好反光皮膚。`;
  const depth = scene.fullBody
    ? "景深：真實 50mm f/1.8 光學淺景深——人物清晰銳利，背後溫暖室內與窗外景觀自然光學虛化（絕對唔好似平面背景紙貼圖），畫面四角唔好加任何遮住人物嘅雜物。"
    : scene.poseOwnsFraming
      ? "景深：自然淺景深（24mm f/1.8），人物清晰銳利、背景溫暖自然光學虛化，背景係真實溫暖有層次嘅室內空間（絕對唔好空白棚拍無縫牆），無垂直拉長或橫向擠壓變形，畫面四角唔好加任何前景遮擋物。"
      : "景深：近距離 30–40cm 手機自拍大特寫景深（24mm f/1.8，由鎖骨／上胸口以上裁切、髮頂貼近畫面上緣，塊臉佔滿 9:16 直式畫面 60–65% 以上，微高角度 10 度自拍視角，不拍腰部、大腿或雙手，無垂直拉長或橫向擠壓變形），背景係真實溫暖有層次嘅室內空間（床頭／門框／窗邊柔和暖光虛化，絕對唔好空白棚拍無縫牆），自然淺景深，畫面四角唔好加任何前景遮擋物。";
  if (scene.openingPhoto) return `真實感：${skin}`;
  return `真實感：${light}${skin}${depth}構圖同暖色光每段都一樣。`;
}

// Appended to each talking-head motion prompt so the clip keeps the stills' realism.
export function talkingRealismMotion(language: VoLanguage | undefined, scene: RealismScene = {}) {
  if (language !== "yue" && language !== "zh") {
    const hold = scene.openingPhoto
      ? "the light stays as in the first frame"
      : "the warm-toned (3400K–4200K golden-amber), soft, even, low-contrast ambient indoor light and warm digital camera color stay fixed, the cozy lived-in room background bokeh stays steady, and focus stays tack-sharp on the face (no heavy vintage film grain or cinematic LUT)";
    return `Realism: organic handheld iPhone selfie micro-sway of about 1–2 degrees (never a locked tripod statue), natural blinks every few seconds, both eyes staying locked directly on the camera lens center, restrained small-amplitude co-articulated lip-sync on every syllable (~18–25% vertical jaw opening, smooth phrase co-articulation, pauses gently close the lips; never laugh or hold a frozen smile while speaking; zero cartoon O-mouth, zero excessive jaw swing, zero rubbery cheeks), small 1–2mm content-driven eyebrow and cheek micro-expressions matching the spoken text meaning, small breaths that lift the chest and shoulders at natural real-time speed, unfiltered non-reflective diffuse matte-natural human skin keeps hyper-visible pore texture, peach-fuzz, and cheek micro-relief with zero skin reflectivity and zero plastic, airbrushed, or oily specular sheen, ${hold}.`;
  }
  const hold = scene.openingPhoto
    ? "光線同第一幀一樣"
    : "溫暖柔和（3400K–4200K 暖黃色溫）低反差室內環境光同溫暖通透真實相機色彩固定唔變，真實室內空間暖光虛化穩定，焦點一直清晰喺塊臉（無厚重菲林顆粒或復古濾鏡）";
  return `真實感：有機手持 iPhone 自拍微晃約 1–2 度（唔好死鎖腳架），每幾秒自然眨眼，雙眼全程穩定直望鏡頭中心，每個音節都有細緻克制嘅連音口型（下巴垂直開合只約 18–25%、詞間平滑過渡、停頓時自然合唇；絕對唔好由頭笑到尾或定格假笑；無卡通大 O 嘴、無下巴大幅擺動或面部拉扯變形），眉毛同面頰只隨台詞內容做出 1–2mm 極細幅度嘅語義微表情變化，細細啖呼吸令心口同膊頭自然起伏，無濾鏡零反光啞光真實皮膚全程保持超清晰毛孔、細汗毛同面頰微浮雕紋理、無任何額頭鼻樑反光高光或油光磨皮塑膠感，${hold}。`;
}
