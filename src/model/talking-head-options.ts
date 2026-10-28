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

export const TALKING_HEAD_POSE_IDS = [
  "seated-sofa-lap",
  "seated-desk-hands",
  "seated-lean-in",
  "seated-elbow-rest",
  "standing-waist-up",
  "seated-open-palm",
] as const;

export type TalkingHeadPoseId = (typeof TALKING_HEAD_POSE_IDS)[number];

export const DEFAULT_TALKING_HEAD_POSE_ID: TalkingHeadPoseId = "seated-sofa-lap";

export type TalkingHeadPoseOption = {
  id: TalkingHeadPoseId;
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
    id: "seated-sofa-lap",
    nameEn: "Seated Relaxed (Hands on Lap)",
    nameZhHant: "輕鬆坐姿（雙手放膝）",
    nameZhHans: "轻松坐姿（双手放膝）",
    descriptionEn: "Seated upright and relaxed, hands resting calmly on the lap with subtle single-hand beats.",
    descriptionZhHant: "自然坐直放鬆、雙手安放膝上，講到重點字時單手輕抬做拍點手勢。",
    startPoseEn:
      "Character: the only person in the frame, seated and centered, head and torso in frame, eyes locked into the lens, lips gently closed or barely parted ready to speak (no wide toothy grin), eyebrows softly lifted in a relaxed warm half-smile, head tilted 1–2 degrees, a live unposed expression. Both hands resting calmly on the lap in a natural neutral rest position.",
    endPoseEn:
      "Character: still the only person in the frame, still seated centered, facing the camera with eyes on the lens, mouth just closed into a calm warm half-smile, both hands resting calmly on the lap in a natural neutral rest position.",
    startPoseYue:
      "角色：畫面只有呢一個人，坐住置中，頭同上身喺畫面，直望鏡頭好似用手機實拍，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），眉毛微微揚起、神情自然放鬆帶柔和淺笑，頭微傾 1–2 度，神情自然唔擺拍。雙手自然放鬆放喺大髀休息位置。",
    endPoseYue:
      "角色：畫面仍然只有呢一個人，仍然坐住，正面直望鏡頭，呢句講完、口部合上變成自然淺笑，眉毛放鬆，雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定。",
    cameraEn:
      "Camera: a phone fixed on a phone tripod, locked. Lens is 24mm at f/1.8, the face sharp and the background a little soft. Head and torso stay in frame. Both hands stay inside the frame. Do not stand up. No microphone.",
    cameraYue:
      "鏡頭：手機固定喺手機腳架，鎖定唔郁。鏡頭係 24mm f/1.8，塊臉清楚、背景少少朦。頭同上身留喺畫面。兩隻手都留喺畫面入面。唔好企起身，冇咪。",
    gestureEn:
      "most of the time (~90%) both hands rest calmly on the lap in a neutral rest position; only on the single main key word of the sentence, one dominant hand makes a brief ~0.5s co-speech gesture excursion and returns smoothly to the lap",
    gestureYue:
      "近九成時間雙手自然放鬆放喺大髀休息位；只喺核心重點詞出現時，單一慣用手輕輕抬起做約 0.5 秒自然拍點手勢再收返落大髀",
    geminiPreviewPrompt:
      "Medium shot waist-up portrait of a friendly young East Asian creator sitting upright and relaxed on a sofa, looking directly into the camera lens with a calm warm half-smile (lips gently closed, no toothy grin), both hands resting naturally on the lap, clean sunlit room softly blurred behind, 24mm f/1.8, photorealistic.",
    previewUrl: "/talking-head-poses/seated-sofa-lap.webp",
  },
  {
    id: "seated-desk-hands",
    nameEn: "Seated at Desk (Hands Clasped on Desk)",
    nameZhHant: "書桌前坐姿（雙手輕放桌面）",
    nameZhHans: "书桌前坐姿（双手轻放桌面）",
    descriptionEn: "Seated at a clean desk with forearms and hands resting lightly on the tabletop.",
    descriptionZhHant: "坐在書桌／辦公桌前，前臂與雙手自然輕放桌面，專業創作者講解姿態。",
    startPoseEn:
      "Character: the only person in the frame, seated centered at a clean desk, head, torso, and forearms in frame, eyes locked into the lens, lips gently closed or barely parted ready to speak (no wide toothy grin), a composed friendly half-smile, both forearms and hands resting lightly on the desk surface in front.",
    endPoseEn:
      "Character: still the only person in the frame, still seated centered at the desk, facing the camera with eyes on the lens, mouth just closed into a calm friendly half-smile, both hands resting lightly back on the desk surface.",
    startPoseYue:
      "角色：畫面只有呢一個人，坐喺乾淨書檯／工作檯前置中，頭、上身同前臂喺畫面，直望鏡頭，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），神情專業親切帶柔和淺笑，前臂同雙手自然輕放喺面前檯面休息位置。",
    endPoseYue:
      "角色：畫面仍然只有呢一個人，仍然坐喺書檯前置中，正面直望鏡頭，呢句講完、口部合上變成自然淺笑，雙手自然收返放喺面前檯面休息位置，坐姿穩定。",
    cameraEn:
      "Camera: a phone fixed on a phone tripod across the desk, locked at 24mm f/1.8, face sharp and background softly blurred. Head, torso, and hands on the desk surface stay in frame. Do not stand up. No microphone.",
    cameraYue:
      "鏡頭：手機固定喺檯面腳架鎖定唔郁，24mm f/1.8，塊臉清楚、背景少少朦。頭、上身同放喺檯面嘅雙手留喺畫面入面。唔好企起身，冇咪。",
    gestureEn:
      "both forearms rest lightly on the desk surface ~90% of the time; on key emphasis words, one hand lifts slightly off the desk for a brief ~0.5s open-palm beat and settles back onto the desk",
    gestureYue:
      "近九成時間前臂同雙手輕放喺檯面；只喺重點字眼時單手由檯面微抬做約 0.5 秒自然拍點手勢，隨即收返落檯面",
    geminiPreviewPrompt:
      "Medium shot waist-up portrait of a young East Asian creator seated at a clean wooden desk, looking directly into the camera lens with a calm friendly half-smile (lips gently closed, no wide toothy grin), forearms and loosely clasped hands resting naturally on the desk surface in the lower frame, soft window daylight, 24mm f/1.8, photorealistic.",
    previewUrl: "/talking-head-poses/seated-desk-hands.webp",
  },
  {
    id: "seated-lean-in",
    nameEn: "Seated Leaning In (Engaged Close Talk)",
    nameZhHant: "前傾傾談坐姿（拉近距離感）",
    nameZhHans: "前倾倾谈坐姿（拉近距离感）",
    descriptionEn: "Upper body leaning slightly forward toward the camera like sharing an insider tip with a friend.",
    descriptionZhHant: "上身微微向鏡頭前傾，眼神專注親切，好似同朋友私下分享貼士。",
    startPoseEn:
      "Character: the only person in the frame, seated centered and leaning slightly forward (~10 degrees) toward the camera like sharing a personal secret with one friend, eyes locked into the lens, lips gently closed or barely parted ready to speak (no wide toothy grin), warm engaged eyebrows, hands resting relaxed together near the front of the lap.",
    endPoseEn:
      "Character: still the only person in the frame, still seated leaning slightly forward toward the lens, mouth just closed into a warm knowing half-smile, hands resting together calmly on the lap.",
    startPoseYue:
      "角色：畫面只有呢一個人，坐住置中而且上身微微向鏡頭前傾（好似同朋友私下分享貼士），雙眼專注直望鏡頭，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），眼神親切有神，雙手自然交疊放喺大髀前方休息位。",
    endPoseYue:
      "角色：畫面仍然只有呢一個人，仍然坐住並保持上身微微前傾，正面直望鏡頭，口部合上變成親切淺笑，雙手自然收返放喺大髀前方，坐姿穩定。",
    cameraEn:
      "Camera: a phone fixed on a phone tripod, locked at 24mm f/1.8 medium close-up from waist up, the face sharp and background softly blurred. Head, leaning torso, and hands stay in frame. No microphone.",
    cameraYue:
      "鏡頭：手機固定喺腳架鎖定唔郁，24mm f/1.8 腰部以上中近景，塊臉清楚、背景柔和虛化。頭、微傾上身同雙手留喺畫面入面。冇咪。",
    gestureEn:
      "torso stays gently leaned in toward the camera; hands rest calmly on the lap and make one small, intimate open-palm gesture at lower-chest height on the key point before returning to rest",
    gestureYue:
      "上身保持穩定微前傾；雙手平時放喺大髀，去到核心重點字時單手喺胸腹前做一個細幅自然攤掌手勢再收返落大髀",
    geminiPreviewPrompt:
      "Medium close-up portrait of a young East Asian creator seated and leaning slightly forward toward the camera lens with an engaged, warm conversational half-smile (lips gently closed, no toothy grin), hands resting relaxed together on the lap, soft daylight studio/home background bokeh, 24mm f/1.8, photorealistic.",
    previewUrl: "/talking-head-poses/seated-lean-in.webp",
  },
  {
    id: "seated-elbow-rest",
    nameEn: "Seated Armrest / Side Angle",
    nameZhHant: "側身靠扶手坐姿（隨性自然）",
    nameZhHans: "侧身靠扶手坐姿（随性自然）",
    descriptionEn: "Torso angled ~15° with one arm resting on the sofa armrest/cushion, face turned to the lens.",
    descriptionZhHant: "身體微側約 15 度、一手輕靠扶手或抱枕，臉部正對鏡頭，感覺輕鬆隨性。",
    startPoseEn:
      "Character: the only person in the frame, seated comfortably with torso angled ~15 degrees to one side while the face and eyes turn directly into the camera lens, lips gently closed or barely parted ready to speak (no wide toothy grin), one forearm resting on the armrest/cushion and the other hand resting on the lap.",
    endPoseEn:
      "Character: still the only person in the frame, still seated with torso angled ~15 degrees and face turned straight to the camera lens, mouth just closed into a relaxed half-smile, one forearm on the armrest and the other hand resting on the lap.",
    startPoseYue:
      "角色：畫面只有呢一個人，輕鬆坐住、上身微側約 15 度但塊臉同雙眼正對直望鏡頭，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），一隻前臂自然輕靠扶手／椅邊，另一隻手自然放喺大髀休息位。",
    endPoseYue:
      "角色：畫面仍然只有呢一個人，仍然保持上身微側 15 度、塊臉正對直望鏡頭，口部合上變成輕鬆淺笑，一隻手輕靠扶手、另一隻手放喺大髀，坐姿穩定。",
    cameraEn:
      "Camera: a phone fixed on a phone tripod, locked at 24mm f/1.8, face sharp and background softly blurred. Head, angled torso, and both hands stay in frame. Do not stand up. No microphone.",
    cameraYue:
      "鏡頭：手機固定喺腳架鎖定唔郁，24mm f/1.8，塊臉清楚、背景少少朦。頭、微側上身同雙手留喺畫面入面。唔好企起身，冇咪。",
    gestureEn:
      "one forearm stays anchored on the armrest while the free hand rests on the lap and makes a brief ~0.5s conversational beat on key words before settling back",
    gestureYue:
      "一隻手前臂穩定輕靠扶手，另一隻手放喺大髀並喺重點字眼做約 0.5 秒自然手勢再收返原位",
    geminiPreviewPrompt:
      "Medium shot waist-up portrait of a young East Asian creator sitting in a comfortable armchair/sofa with torso angled 15 degrees to the side and face turned directly to the camera lens, calm warm half-smile (lips gently closed, no toothy grin), one forearm resting on the armrest and the other hand on the lap, 24mm f/1.8, photorealistic.",
    previewUrl: "/talking-head-poses/seated-elbow-rest.webp",
  },
  {
    id: "standing-waist-up",
    nameEn: "Standing Waist-Up (Presenter Stance)",
    nameZhHant: "站立半身（主持演講姿態）",
    nameZhHans: "站立半身（主持演讲姿态）",
    descriptionEn: "Standing upright framed from the waist up, hands lightly clasped at waist level.",
    descriptionZhHant: "腰部以上站立中景，雙手自然輕合於腰腹前，呈現自信主講人氣場。",
    startPoseEn:
      "Character: the only person in the frame, standing upright and centered, framed from the waist up (medium shot), eyes locked into the lens, lips gently closed or barely parted ready to speak (no wide toothy grin), confident calm half-smile, hands lightly resting together at waist level in a relaxed presenter stance.",
    endPoseEn:
      "Character: still the only person in the frame, still standing upright and centered framed from the waist up, eyes locked on the lens, mouth just closed into a calm confident half-smile, hands returned to resting lightly together at waist level.",
    startPoseYue:
      "角色：畫面只有呢一個人，企直置中（腰部以上半身中景），直望鏡頭，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），神情自信從容帶柔和淺笑，雙手自然輕合喺腰腹前方休息位置。",
    endPoseYue:
      "角色：畫面仍然只有呢一個人，仍然企直置中（腰部以上半身中景），正面直望鏡頭，呢句講完、口部合上變成自信淺笑，雙手自然收返輕合喺腰腹前方休息位置。",
    cameraEn:
      "Camera: a phone fixed on a phone tripod at eye level, locked at 24mm f/1.8, framed from the waist up (head, torso, and both hands in frame). Face sharp, background softly blurred. No microphone.",
    cameraYue:
      "鏡頭：手機固定喺視線高度嘅腳架鎖定唔郁，24mm f/1.8 腰部以上半身中景（頭、上身同雙手都留喺畫面入面），塊臉清楚、背景少少朦。冇咪。",
    gestureEn:
      "standing steady with grounded shoulders; hands rest lightly together at waist level ~90% of the time and make a brief, composed open-palm presenter gesture at lower-chest height on key emphasis words before returning to rest",
    gestureYue:
      "站姿穩定唔搖晃；雙手近九成時間輕合喺腰腹前，只喺重點詞出現時單手微抬做約 0.5 秒主持拍點手勢再收返腰前",
    geminiPreviewPrompt:
      "Medium waist-up portrait of a confident young East Asian creator standing upright in a modern studio/office, looking directly into the camera lens with a calm friendly half-smile (lips gently closed, no toothy grin), hands lightly clasped together at waist level in a natural presenter posture, 24mm f/1.8 shallow depth of field, photorealistic.",
    previewUrl: "/talking-head-poses/standing-waist-up.webp",
  },
  {
    id: "seated-open-palm",
    nameEn: "Seated Expressive (Open-Palm Explain)",
    nameZhHant: "坐姿手勢講解（單手微開）",
    nameZhHans: "坐姿手势讲解（单手微开）",
    descriptionEn: "Seated centered with one hand gently raised at lower-chest height in an explaining gesture.",
    descriptionZhHant: "坐姿置中，一隻手自然微抬於胸腹前做講解手勢，另一隻手安放膝上。",
    startPoseEn:
      "Character: the only person in the frame, seated and centered, head and torso in frame, eyes locked into the lens, lips gently closed or barely parted ready to speak (no wide toothy grin), eyebrows softly lifted, one hand resting calmly on the lap while the other hand is held relaxed at lower-chest height with a soft open palm ready to explain.",
    endPoseEn:
      "Character: still the only person in the frame, still seated centered, facing the camera with eyes on the lens, mouth just closed into a warm half-smile, both hands resting calmly on the lap.",
    startPoseYue:
      "角色：畫面只有呢一個人，坐住置中，頭同上身喺畫面，直望鏡頭，雙唇輕合或微啟準備開口（唔好張開口露齒大笑），神情自然帶柔和淺笑，一隻手自然放喺大髀休息位，另一隻手喺胸腹前輕輕微抬、掌心自然微開準備講解。",
    endPoseYue:
      "角色：畫面仍然只有呢一個人，仍然坐住置中，正面直望鏡頭，口部合上變成自然淺笑，雙手自然收返落大髀休息位置，坐姿穩定。",
    cameraEn:
      "Camera: a phone fixed on a phone tripod, locked. Lens is 24mm at f/1.8, the face sharp and the background a little soft. Head, torso, and both hands stay inside the frame. Do not stand up. No microphone.",
    cameraYue:
      "鏡頭：手機固定喺手機腳架，鎖定唔郁。鏡頭係 24mm f/1.8，塊臉清楚、背景少少朦。頭、上身同兩隻手都留喺畫面入面。唔好企起身，冇咪。",
    gestureEn:
      "one hand stays resting on the lap while the explaining hand makes smooth, restrained conversational beats at lower-chest height on key words and settles calmly back to the lap",
    gestureYue:
      "一隻手安放喺大髀，另一隻講解手喺胸腹前隨重點字做克制自然嘅拍點手勢，句尾自然收返落大髀",
    geminiPreviewPrompt:
      "Medium shot waist-up portrait of a young East Asian creator sitting centered on a sofa, looking directly into the camera lens with a calm warm half-smile (lips gently closed, no toothy grin), one hand resting on the lap and the other hand gently raised at lower-chest height in a natural open-palm explaining gesture, 24mm f/1.8, photorealistic.",
    previewUrl: "/talking-head-poses/seated-open-palm.webp",
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
