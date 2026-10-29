// Hardcoded catalog of Talking-Head Backgrounds & Poses with Gemini-generated preview stills.
import type { VoLanguage } from "@/model/project";

export const TALKING_HEAD_BACKGROUND_IDS = [
  "cozy-bookshelf-sofa",
  "hk-seaview-office",
  "creator-podcast-desk",
  "sunlit-cafe-window",
  "minimalist-loft-plant",
  "warm-wood-library",
  "modern-boardroom-glass",
  "creative-studio-neutral",
] as const;

export type TalkingHeadBackgroundId = (typeof TALKING_HEAD_BACKGROUND_IDS)[number];

export const DEFAULT_TALKING_HEAD_BACKGROUND_ID: TalkingHeadBackgroundId =
  "cozy-bookshelf-sofa";

export type TalkingHeadBackgroundOption = {
  id: TalkingHeadBackgroundId;
  nameEn: string;
  nameZhHant: string;
  nameZhHans: string;
  descriptionEn: string;
  descriptionZhHant: string;
  /** Set description injected into English / multilingual talking-head scene prompts. */
  setEn: string;
  /** Light description injected into English / multilingual talking-head scene prompts. */
  lightEn: string;
  /** Set description injected into Cantonese / Chinese talking-head scene prompts. */
  setYue: string;
  /** Light description injected into Cantonese / Chinese talking-head scene prompts. */
  lightYue: string;
  /** Gemini image prompt used to generate the empty-room preview card. */
  geminiPreviewPrompt: string;
  /** Public preview URL under `public/talking-head-backgrounds/{id}.webp`. */
  previewUrl: string;
};

export const TALKING_HEAD_BACKGROUNDS: readonly TalkingHeadBackgroundOption[] = [
  {
    id: "cozy-bookshelf-sofa",
    nameEn: "Cozy Home Sofa & Bookshelf",
    nameZhHant: "居家沙發與書架",
    nameZhHans: "居家沙发与书架",
    descriptionEn: "Warm home living room sofa with a wooden bookshelf softly blurred behind.",
    descriptionZhHant: "溫暖居家客廳沙發，後方有柔和虛化的木質書架與自然窗光。",
    setEn: "the same cozy fabric sofa at home in every clip, a warm wooden bookshelf lined with books softly blurred behind the head",
    lightEn: "ordinary soft daylight from a window to one side, no studio light",
    setYue: "全程同一張屋企溫暖布藝沙發，木書架同書本喺頭後面柔和虛化",
    lightYue: "一邊窗嘅自然柔和日光，冇影樓燈",
    geminiPreviewPrompt:
      "Empty interior background plate for a creator talking-head video, no people. A cozy modern apartment living room with a warm beige fabric sofa centered in frame, a tidy wooden bookshelf with books and a small ceramic vase softly blurred in the background, soft natural daylight streaming from a side window on the right, shot on 24mm f/1.8 lens with shallow depth of field, clean realistic photography.",
    previewUrl: "/talking-head-backgrounds/cozy-bookshelf-sofa.webp",
  },
  {
    id: "hk-seaview-office",
    nameEn: "HK Sea-View Executive Office",
    nameZhHant: "香港海景辦公室",
    nameZhHans: "香港海景办公室",
    descriptionEn: "Modern minimalist high-rise office with floor-to-ceiling Victoria Harbour sea view.",
    descriptionZhHant: "現代簡約高層辦公室，大片落地玻璃窗望向開揚維港海景與天色。",
    setEn: "the same modern minimalist high-rise office in every clip, floor-to-ceiling glass windows behind showing an open Hong Kong Victoria Harbour sea view and skyline",
    lightEn: "bright airy natural daylight from the floor-to-ceiling harbor window to one side, clean indoor fill",
    setYue: "全程同一個現代簡約高層海景辦公室，背後大落地玻璃窗望到開揚香港維港海景同天色",
    lightYue: "落地玻璃窗邊自然透入嘅通透日光，室內光影乾淨立體",
    geminiPreviewPrompt:
      "Empty interior background plate for a creator talking-head video, no people. A sleek modern high-rise office in Hong Kong with floor-to-ceiling glass windows overlooking Victoria Harbour blue sea and skyline under soft daylight, a minimalist executive chair/sofa area in the foreground, shot on 24mm f/1.8 with gentle background bokeh, photorealistic.",
    previewUrl: "/talking-head-backgrounds/hk-seaview-office.webp",
  },
  {
    id: "creator-podcast-desk",
    nameEn: "Creator Studio & Acoustic Wall",
    nameZhHant: "創作者錄音室木條牆",
    nameZhHans: "创作者录音室木条墙",
    descriptionEn: "Warm wooden slat acoustic wall with subtle warm LED accent strip.",
    descriptionZhHant: "質感胡桃木吸音木條牆工作室，配柔和暖光環境燈帶與簡約桌面。",
    setEn: "the same modern creator studio in every clip, walnut vertical wood-slat acoustic wall panels and a clean minimalist desk surface in frame",
    lightEn: "soft directional daylight from the side balanced with a subtle warm ambient LED wall glow",
    setYue: "全程同一個現代創作者工作室，背景係胡桃木直紋吸音木條牆同簡約木檯面",
    lightYue: "側面柔和自然主光配合背景木牆淡淡嘅暖色環境光",
    geminiPreviewPrompt:
      "Empty interior background plate for a creator talking-head video, no people. A stylish modern YouTuber/creator studio with warm walnut vertical wood-slat acoustic panels on the back wall, a clean matte desk in the lower foreground, soft natural side key light and a subtle warm linear LED accent glow in the background, 24mm f/1.8 shallow depth of field, photorealistic.",
    previewUrl: "/talking-head-backgrounds/creator-podcast-desk.webp",
  },
  {
    id: "sunlit-cafe-window",
    nameEn: "Sunlit Corner Cafe",
    nameZhHant: "陽光街角咖啡店",
    nameZhHans: "阳光街角咖啡店",
    descriptionEn: "Relaxed wooden cafe table by a sunlit street window with greenery outside.",
    descriptionZhHant: "陽光透入的木質咖啡店窗邊座位，窗外有街景綠植自然散景。",
    setEn: "the same sunlit artisan coffee shop corner in every clip, warm wooden table and cafe window with lush street greenery softly blurred outside",
    lightEn: "warm natural morning sunlight streaming through the cafe window to one side",
    setYue: "全程同一間陽光咖啡店窗邊角落，溫暖木檯配窗外柔和虛化嘅街景綠植",
    lightYue: "由咖啡店玻璃窗斜照入嚟嘅溫暖自然日光",
    geminiPreviewPrompt:
      "Empty interior background plate for a creator talking-head video, no people. A cozy sunlit artisan cafe corner with a warm oak table in the foreground, large window on the side with soft green street trees and warm morning sunlight streaming in, espresso bar softly blurred in the far background, 24mm f/1.8 bokeh, photorealistic.",
    previewUrl: "/talking-head-backgrounds/sunlit-cafe-window.webp",
  },
  {
    id: "minimalist-loft-plant",
    nameEn: "Minimalist Daylight Loft",
    nameZhHant: "極簡採光侘寂空間",
    nameZhHans: "极简采光侘寂空间",
    descriptionEn: "Clean limewash plaster wall, indoor olive tree, and sunlit linen curtains.",
    descriptionZhHant: "米白微水泥質感牆面、室內橄欖樹綠植與透光亞麻窗簾。",
    setEn: "the same minimalist japandi loft in every clip, warm off-white textured plaster wall, a potted indoor olive tree, and sheer linen curtains diffusing the window light",
    lightEn: "soft diffused daylight through sheer linen curtains from one side, airy and bright",
    setYue: "全程同一個極簡侘寂風採光空間，米白微水泥質感牆身、室內盆栽綠植同透光亞麻窗簾",
    lightYue: "穿過亞麻薄紗窗簾嘅柔和側面自然日光，乾淨通透",
    geminiPreviewPrompt:
      "Empty interior background plate for a creator talking-head video, no people. A bright minimalist Japandi loft interior with warm off-white limewash plaster walls, a potted indoor olive tree in the corner, sheer white linen curtains glowing with soft natural daylight on the right, 24mm f/1.8 shallow depth of field, photorealistic.",
    previewUrl: "/talking-head-backgrounds/minimalist-loft-plant.webp",
  },
  {
    id: "warm-wood-library",
    nameEn: "Quiet Study & Reading Lounge",
    nameZhHant: "靜謐木質書房",
    nameZhHans: "静谧木质书房",
    descriptionEn: "Architectural floor-to-ceiling oak bookshelves and a calm study atmosphere.",
    descriptionZhHant: "高雅橡木頂天書櫃與建築感閱讀空間，散發專業沉穩學者氣質。",
    setEn: "the same quiet architectural study lounge in every clip, floor-to-ceiling natural oak bookshelves and curated art books softly blurred behind",
    lightEn: "soft side window daylight balanced with a warm architectural reading lamp glow",
    setYue: "全程同一個安靜有質感嘅木質書房，背後係頂天橡木書櫃同整齊書本柔和虛化",
    lightYue: "側面自然窗光配合書房柔和暖光，立體沉穩",
    geminiPreviewPrompt:
      "Empty interior background plate for a creator talking-head video, no people. An architectural designer study room with floor-to-ceiling natural oak bookshelves filled with neutral-toned books, soft daylight from a side window, warm calm intellectual atmosphere, shot on 24mm f/1.8 with creamy background bokeh, photorealistic.",
    previewUrl: "/talking-head-backgrounds/warm-wood-library.webp",
  },
  {
    id: "modern-boardroom-glass",
    nameEn: "Startup Glass Workspace",
    nameZhHant: "現代新創玻璃會議空間",
    nameZhHans: "现代新创玻璃会议空间",
    descriptionEn: "Bright contemporary tech office with glass partitions and indoor greenery.",
    descriptionZhHant: "明亮現代科技公司辦公室，配備玻璃隔間與乾淨專業商業氛圍。",
    setEn: "the same bright contemporary startup office in every clip, clean glass partition walls and tidy modern workspace softly blurred behind",
    lightEn: "clean neutral daylight from large office windows to one side, crisp and professional",
    setYue: "全程同一個明亮現代新創辦公室，背後係乾淨玻璃隔間同現代工作空間柔和虛化",
    lightYue: "辦公室大窗透入嘅清透自然日光，乾淨專業",
    geminiPreviewPrompt:
      "Empty interior background plate for a creator talking-head video, no people. A bright contemporary tech startup office with clean black-framed glass partitions, light oak furniture, indoor greenery, and soft natural window daylight, shot on 24mm f/1.8 with shallow depth of field, photorealistic.",
    previewUrl: "/talking-head-backgrounds/modern-boardroom-glass.webp",
  },
  {
    id: "creative-studio-neutral",
    nameEn: "Clean Seamless Portrait Studio",
    nameZhHant: "極簡純色質感影棚",
    nameZhHans: "极简纯色质感影棚",
    descriptionEn: "Clean warm-stone studio backdrop with sculpted soft key light and zero clutter.",
    descriptionZhHant: "極簡暖灰米色無縫背景，零雜物干擾，突顯人物輪廓與眼神。",
    setEn: "the same clean minimalist portrait studio in every clip, a smooth warm-stone neutral backdrop with subtle natural light falloff and zero background clutter",
    lightEn: "soft directional window-style key light from one side with gentle negative fill on the opposite side",
    setYue: "全程同一個極簡純色質感空間，柔和暖灰米色背景配自然光影漸層，完全冇雜物干擾",
    lightYue: "具方向感嘅柔和側面主光配背光側自然立體陰影過渡",
    geminiPreviewPrompt:
      "Empty interior background plate for a creator talking-head video, no people. A clean minimalist editorial portrait studio with a smooth warm-beige/stone textured backdrop, soft diagonal natural key light casting a gentle gradient across the wall, zero clutter, 24mm f/1.8 lens, photorealistic.",
    previewUrl: "/talking-head-backgrounds/creative-studio-neutral.webp",
  },
] as const;

/** Framing zoom ladder for talking-head: full body → waist → chest → collarbone close-up. */
export const TALKING_HEAD_POSE_FRAMINGS = [
  "full-body",
  "waist-up",
  "chest-up",
  "collarbone-close",
] as const;

export type TalkingHeadPoseFraming = (typeof TALKING_HEAD_POSE_FRAMINGS)[number];

export const TALKING_HEAD_POSE_IDS = [
  "full-body",
  "waist-up",
  "chest-up",
  "collarbone-close",
] as const;

export type TalkingHeadPoseId = (typeof TALKING_HEAD_POSE_IDS)[number];

/** Default matches the refined intimate selfie angle (collarbone-up, face 60–65%). */
export const DEFAULT_TALKING_HEAD_POSE_ID: TalkingHeadPoseId = "collarbone-close";

export type TalkingHeadPoseOption = {
  id: TalkingHeadPoseId;
  /** Framing zoom step — drives shot size / realism crop. */
  framing: TalkingHeadPoseFraming;
  nameEn: string;
  nameZhHant: string;
  nameZhHans: string;
  descriptionEn: string;
  descriptionZhHant: string;
  /** Start-frame pose clause in English. */
  startPoseEn: string;
  /** End-frame pose clause in English. */
  endPoseEn: string;
  /** Start-frame pose clause in Cantonese / Chinese. */
  startPoseYue: string;
  /** End-frame pose clause in Cantonese / Chinese. */
  endPoseYue: string;
  /** Camera framing clause in English. */
  cameraEn: string;
  /** Camera framing clause in Cantonese / Chinese. */
  cameraYue: string;
  /** Gesture library override in English. */
  gestureEn: string;
  /** Gesture library override in Cantonese / Chinese. */
  gestureYue: string;
  /** Gemini prompt for the pose preview card. */
  geminiPreviewPrompt: string;
  /** Public preview URL under `public/talking-head-poses/{id}.webp`. */
  previewUrl: string;
};

export const TALKING_HEAD_POSES: readonly TalkingHeadPoseOption[] = [
  {
    id: "full-body",
    framing: "full-body",
    nameEn: "Full Body",
    nameZhHant: "全身",
    nameZhHans: "全身",
    descriptionEn: "Head-to-feet standing frame — widest talking-head zoom.",
    descriptionZhHant: "頭到腳全身站姿，對鏡講稿最廣的取景。",
    startPoseEn:
      "Character: the only person in the frame, head to feet fully visible, standing in a candid, relaxed contrapposto creator stance (weight resting naturally on one hip with the other knee slightly soft, torso angled 10–15 degrees off-square while head turns to look straight into the lens, feet planted at a natural staggered shoulder-width stance with clear dark contact shadows on the floor — NEVER standing stiffly at attention, NEVER symmetrical mannequin posture, NEVER hands stiffly clasped over the stomach), one arm hanging loosely by the side or thumb lightly near the trouser pocket, the other hand raised naturally at waist-to-lower-chest height with an open conversational palm mid-thought, lips gently closed or barely parted ready to speak (no wide toothy grin), warm candid expression.",
    endPoseEn:
      "Character: still the only person in the frame, head to feet fully visible in the same relaxed contrapposto creator stance with weight shifted slightly to the other hip, eyes locked on the lens, mouth just closed into a warm natural half-smile, the gesturing hand settling naturally down toward waist level while the other arm stays relaxed at the side, feet grounded on the floor.",
    startPoseYue:
      "角色：畫面只有呢一個人，頭到腳全身入鏡，以自然真實創作者「三七步」放鬆站姿企喺畫面（重心自然放喺一邊髖部、另一隻膝頭微鬆，上身微側 10–15 度再轉頭直望鏡頭，雙腳自然微錯開企喺地面並有清晰真實落腳陰影——絕對唔好雙腳併攏立正罰企、唔好似公仔模型對稱僵硬、唔好雙手死板合十放喺肚前），一隻手自然放鬆垂喺身旁或輕貼褲袋邊，另一隻手自然抬到腰至下胸高度掌心微開好似同朋友傾緊偈，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），神情生動自然唔擺拍。",
    endPoseYue:
      "角色：畫面仍然只有呢一個人，頭到腳全身入鏡保持自然放鬆三七步站姿，重心輕微換過少少，正面直望鏡頭，口部合上變成自然淺笑，原本做手勢隻手自然收落腰側，另一隻手放鬆垂低，雙腳穩踏地面。",
    cameraEn:
      "Camera: candid creator reel shot at 2.5m distance on a 35mm f/2.0 lens at chest-to-eye height with a subtle 3/4 room angle so the window sits 45 degrees to one side (never flat straight-on passport framing, never backlit silhouette against a window directly behind the back), locked full-body so head to feet stay in frame, face tack-sharp and background softly blurred. No microphone.",
    cameraYue:
      "鏡頭：離人物約 2.5 米、35mm f/2.0 胸口至視線高度實拍全身（微斜 3/4 空間角度，令大窗喺人物側面 45 度打側光，絕對唔好正對背後大窗背光企正中間似證件相），頭到腳全身自然入鏡，畫面側邊帶少少柔和虛化嘅前景檯角或綠植增加空間層次，塊臉清晰銳利、背景自然光學虛化。冇咪。",
    gestureEn:
      "relaxed contrapposto standing body language with subtle hip-to-hip weight transfer and natural torso sway; one hand stays relaxed by the side while the active hand makes conversational open-palm gestures between waist and chest height on key points, never frozen clasped hands or stiff robotic posture",
    gestureYue:
      "自然放鬆三七步站姿，身體重心會隨講嘢輕微轉移同自然呼吸微動；一隻手放鬆垂低，另一隻手隨重點自然抬起喺腰胸之間做傾偈手勢，絕對唔好雙手死合肚前或好似機械人罰企",
    geminiPreviewPrompt:
      "Full-body vertical 9:16 photorealistic portrait of a friendly young East Asian creator standing in a relaxed contrapposto stance (weight on one hip, torso slightly angled, one hand relaxed by pocket, other hand in a casual mid-speech gesture at waist height) in a sunlit room with 45-degree side window daylight and floor contact shadows, head to feet fully visible, 35mm f/2.0, clean modern camera look.",
    previewUrl: "/talking-head-poses/full-body.webp",
  },
  {
    id: "waist-up",
    framing: "waist-up",
    nameEn: "Waist-Up",
    nameZhHant: "腰部以上",
    nameZhHans: "腰部以上",
    descriptionEn: "Medium waist-up frame — seated or standing torso with hands in view.",
    descriptionZhHant: "腰部以上中景，上身與雙手入鏡，適合一般對鏡講解。",
    startPoseEn:
      "Character: the only person in the frame, seated and centered, framed from the waist up, head and torso in frame, eyes locked into the lens, lips gently closed or barely parted ready to speak (no wide toothy grin), eyebrows softly lifted in a relaxed warm half-smile, head tilted 1–2 degrees, both hands resting calmly on the lap in a natural neutral rest position.",
    endPoseEn:
      "Character: still the only person in the frame, still seated centered framed from the waist up, facing the camera with eyes on the lens, mouth just closed into a calm warm half-smile, both hands resting calmly on the lap.",
    startPoseYue:
      "角色：畫面只有呢一個人，坐住置中，腰部以上半身中景，頭同上身喺畫面，直望鏡頭，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），眉毛微微揚起、神情自然放鬆帶柔和淺笑，頭微傾 1–2 度，雙手自然放鬆放喺大髀休息位置。",
    endPoseYue:
      "角色：畫面仍然只有呢一個人，仍然坐住置中腰部以上半身中景，正面直望鏡頭，口部合上變成自然淺笑，雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定。",
    cameraEn:
      "Camera: a phone fixed on a phone tripod, locked waist-up medium shot at 24mm f/1.8, face sharp and background softly blurred. Head, torso, and both hands stay in frame. Do not stand up. No microphone.",
    cameraYue:
      "鏡頭：手機固定喺腳架鎖定唔郁，24mm f/1.8 腰部以上半身中景，塊臉清楚、背景少少朦。頭、上身同雙手留喺畫面入面。唔好企起身，冇咪。",
    gestureEn:
      "most of the time (~90%) both hands rest calmly on the lap; on the single main key word, one dominant hand makes a brief ~0.5s co-speech gesture and returns smoothly to the lap",
    gestureYue:
      "近九成時間雙手自然放喺大髀；只喺核心重點詞出現時，單一慣用手輕輕抬起做約 0.5 秒自然拍點手勢再收返落大髀",
    geminiPreviewPrompt:
      "Vertical 9:16 waist-up medium portrait of a friendly young East Asian creator sitting upright on a sofa, looking directly into the camera with a calm warm half-smile (lips gently closed, no toothy grin), both hands resting on the lap, soft lived-in room bokeh behind, 24mm f/1.8, photorealistic phone camera look.",
    previewUrl: "/talking-head-poses/waist-up.webp",
  },
  {
    id: "chest-up",
    framing: "chest-up",
    nameEn: "Chest-Up",
    nameZhHant: "胸口以上",
    nameZhHans: "胸口以上",
    descriptionEn: "Tighter medium close-up from upper chest — shoulders and face fill more of the frame.",
    descriptionZhHant: "胸口以上較近中近景，肩膀與面部佔比較大，仍可見少許肩線。",
    startPoseEn:
      "Character: the only person in the frame, seated and centered, framed from the upper chest up (shoulders visible, no waist or lap), eyes locked into the lens, lips gently closed or barely parted ready to speak (no wide toothy grin), warm engaged half-smile, head tilted 1–2 degrees, a live unposed expression.",
    endPoseEn:
      "Character: still the only person in the frame, still seated centered framed from the upper chest up, facing the camera with eyes on the lens, mouth just closed into a warm half-smile, shoulders steady.",
    startPoseYue:
      "角色：畫面只有呢一個人，坐住置中，由上胸口裁切（見到雙肩，唔好見到腰或大髀），直望鏡頭，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），神情親切有神帶柔和淺笑，頭微傾 1–2 度，神情自然唔擺拍。",
    endPoseYue:
      "角色：畫面仍然只有呢一個人，仍然坐住置中由上胸口裁切，正面直望鏡頭，口部合上變成親切淺笑，雙肩穩定。",
    cameraEn:
      "Camera: a phone fixed on a phone tripod, locked medium close-up from upper chest up at 24mm f/1.8, face sharp and background softly blurred. Shoulders stay in frame; no waist, lap, or hands. No microphone.",
    cameraYue:
      "鏡頭：手機固定喺腳架鎖定唔郁，24mm f/1.8 上胸口以上中近景，塊臉清楚、背景柔和虛化。雙肩留喺畫面；唔好見到腰、大髀或雙手。冇咪。",
    gestureEn:
      "shoulders stay grounded; expression carries emphasis with subtle brow and cheek micro-movements — no hands in frame",
    gestureYue:
      "雙肩穩定；重點靠眉毛同面頰微表情帶出，雙手唔入鏡",
    geminiPreviewPrompt:
      "Vertical 9:16 medium close-up from upper chest of a young East Asian creator looking into the camera with a calm warm half-smile (lips gently closed, no toothy grin), shoulders visible, no waist or hands in frame, soft window side light and lived-in room bokeh, 24mm f/1.8, photorealistic.",
    previewUrl: "/talking-head-poses/chest-up.webp",
  },
  {
    id: "collarbone-close",
    framing: "collarbone-close",
    nameEn: "Collarbone Close-Up",
    nameZhHant: "鎖骨特寫",
    nameZhHans: "锁骨特写",
    descriptionEn: "Intimate collarbone-up selfie — face fills 60–65% of vertical 9:16 (tightest zoom).",
    descriptionZhHant: "鎖骨以上自拍大特寫，臉佔直式畫面約 60–65%，最近距離取景。",
    startPoseEn:
      "Character: intimate collarbone-up selfie close-up of the only person in the frame (face fills 60–65% of the vertical 9:16 frame; NO waist, NO lap, NO thighs, NO hands visible), eyes locked into the lens, lips gently closed or barely parted ready to speak (no wide toothy grin), eyebrows softly lifted, a relaxed warm half-smile, head tilted 1–2 degrees, a live unposed expression.",
    endPoseEn:
      "Character: still an intimate collarbone-up selfie close-up, facing the camera with eyes on the lens, mouth just closed into a warm half-smile, same collarbone-up crop with face still filling 60–65% of frame.",
    startPoseYue:
      "角色：鎖骨以上自拍大特寫，畫面只有呢一個人（塊臉佔 9:16 直式畫面 60–65%；唔好見到腰、大髀或雙手），直望鏡頭好似用手持手機自拍，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），眉毛微微揚起、神情自然放鬆帶柔和淺笑，頭微傾 1–2 度，神情自然唔擺拍。",
    endPoseYue:
      "角色：仍然係鎖骨以上自拍大特寫，正面直望鏡頭，口部合上變成自然淺笑，裁切同開頭一樣、塊臉仍然佔畫面 60–65%，雙手唔入鏡。",
    cameraEn:
      "Camera: handheld iPhone front-camera selfie at 30–40cm, 24mm f/1.8, cropped collarbone/upper-chest up so the face fills 60–65% of vertical 9:16 (subtle 10° high-angle; no waist, lap, thighs, or hands). Organic 1–2° handheld micro-sway. No microphone.",
    cameraYue:
      "鏡頭：手持 iPhone 前置自拍 30–40cm，24mm f/1.8，由鎖骨／上胸口裁切，塊臉佔 9:16 直式畫面 60–65%（微高角度 10 度；唔好拍腰、大髀或雙手）。有機手持微晃 1–2 度。冇咪。",
    gestureEn:
      "no hands in frame; speech energy shows in mouth, brows, and cheeks only",
    gestureYue:
      "雙手唔入鏡；講嘢能量只靠口型、眉毛同面頰微表情",
    geminiPreviewPrompt:
      "Vertical 9:16 intimate collarbone-up selfie close-up of a young East Asian creator, face filling about 60-65% of the frame, looking directly into the front camera with a calm warm half-smile (lips gently closed, no toothy grin), no hands waist or lap visible, soft side window light, lived-in bedroom corner softly blurred behind, iPhone 16 Pro 24mm f/1.8 photorealistic.",
    previewUrl: "/talking-head-poses/collarbone-close.webp",
  },
] as const;

const BACKGROUND_BY_ID = new Map<string, TalkingHeadBackgroundOption>(
  TALKING_HEAD_BACKGROUNDS.map((item) => [item.id, item]),
);

const POSE_BY_ID = new Map<string, TalkingHeadPoseOption>(
  TALKING_HEAD_POSES.map((item) => [item.id, item]),
);

export function isTalkingHeadBackgroundId(
  value: string | undefined | null,
): value is TalkingHeadBackgroundId {
  return Boolean(value && BACKGROUND_BY_ID.has(value));
}

export function isTalkingHeadPoseId(
  value: string | undefined | null,
): value is TalkingHeadPoseId {
  return Boolean(value && POSE_BY_ID.has(value));
}

export function getTalkingHeadBackground(
  id: string | undefined | null,
): TalkingHeadBackgroundOption | undefined {
  if (!id) return undefined;
  return BACKGROUND_BY_ID.get(id);
}

export function getTalkingHeadPose(
  id: string | undefined | null,
): TalkingHeadPoseOption | undefined {
  if (!id) return undefined;
  return POSE_BY_ID.get(id);
}

export function resolveTalkingHeadBackground(
  id: string | undefined | null,
): TalkingHeadBackgroundOption {
  return (
    getTalkingHeadBackground(id) ??
    BACKGROUND_BY_ID.get(DEFAULT_TALKING_HEAD_BACKGROUND_ID)!
  );
}

export function resolveTalkingHeadPose(
  id: string | undefined | null,
): TalkingHeadPoseOption {
  return getTalkingHeadPose(id) ?? POSE_BY_ID.get(DEFAULT_TALKING_HEAD_POSE_ID)!;
}

/** When the chosen pose is full-body, force the full-body talking-head shot path. */
export function talkingHeadPoseShot(
  id: string | undefined | null,
): "full-body" | undefined {
  return getTalkingHeadPose(id)?.framing === "full-body" ? "full-body" : undefined;
}

/** Non-default poses own Character/Camera framing — skip the built-in collarbone crop. */
export function talkingHeadPoseOwnsFraming(id: string | undefined | null): boolean {
  return Boolean(id && isTalkingHeadPoseId(id) && id !== DEFAULT_TALKING_HEAD_POSE_ID);
}

export function localizedTalkingHeadBackground(
  option: TalkingHeadBackgroundOption,
  locale?: string,
) {
  if (locale === "zh-Hant") {
    return { name: option.nameZhHant, description: option.descriptionZhHant };
  }
  if (locale === "zh-Hans") {
    return { name: option.nameZhHans, description: option.descriptionZhHant };
  }
  return { name: option.nameEn, description: option.descriptionEn };
}

export function localizedTalkingHeadPose(
  option: TalkingHeadPoseOption,
  locale?: string,
) {
  if (locale === "zh-Hant") {
    return { name: option.nameZhHant, description: option.descriptionZhHant };
  }
  if (locale === "zh-Hans") {
    return { name: option.nameZhHans, description: option.descriptionZhHant };
  }
  return { name: option.nameEn, description: option.descriptionEn };
}

export function talkingHeadBackgroundPromptParts(
  id: string | undefined | null,
  language?: VoLanguage,
): { set: string; light: string } | undefined {
  const bg = getTalkingHeadBackground(id);
  if (!bg) return undefined;
  const isZh = language === "yue" || language === "zh";
  return {
    set: isZh ? bg.setYue : bg.setEn,
    light: isZh ? bg.lightYue : bg.lightEn,
  };
}
