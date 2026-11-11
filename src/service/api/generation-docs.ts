export type GenerationApiFeatureId =
  | "simple"
  | "explainer"
  | "talking"
  | "story"
  | "swap"
  | "teleport"
  | "poster"
  | "life";

export const GENERATION_API_FEATURES: readonly GenerationApiFeatureId[] = [
  "simple",
  "explainer",
  "talking",
  "story",
  "swap",
  "teleport",
  "poster",
  "life",
] as const;

export interface GenerationApiParamDoc {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface GenerationApiEndpointDoc {
  id: GenerationApiFeatureId;
  title: string;
  badge: string;
  summary: string;
  creditCost: string;
  method: "POST";
  endpoint: string;
  pollEndpoint: string;
  actionEndpoint?: string;
  parameters: GenerationApiParamDoc[];
  sampleBody: Record<string, unknown>;
  sampleResponse: Record<string, unknown>;
}

export function buildGenerationCurlExample(
  doc: GenerationApiEndpointDoc,
  baseUrl: string,
  apiKey = "exp_live_YOUR_API_KEY",
): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const json = JSON.stringify(doc.sampleBody, null, 2);
  return [
    `curl -X ${doc.method} "${cleanBase}${doc.endpoint}" \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${json}'`,
  ].join("\n");
}

export function buildPollCurlExample(
  doc: GenerationApiEndpointDoc,
  baseUrl: string,
  apiKey = "exp_live_YOUR_API_KEY",
): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return [
    `curl -X GET "${cleanBase}${doc.pollEndpoint}" \\`,
    `  -H "Authorization: Bearer ${apiKey}"`,
  ].join("\n");
}

export function getGenerationApiDocs(locale: string): GenerationApiEndpointDoc[] {
  const isEn = locale === "en";
  const isHans = locale === "zh-Hans";
  const tr = (zhHant: string, zhHans: string, en: string) =>
    isEn ? en : isHans ? zhHans : zhHant;

  return [
    {
      id: "simple",
      title: tr("Simple 極簡單鏡短片", "Simple 极简单镜短片", "Simple Single-Shot Video"),
      badge: "VIDEO · 5–12s",
      summary: tr(
        "輸入鏡頭優先（Camera-First）Prompt，結合選填首尾幀與角色一鍵生成單鏡無對白短片，無需分鏡審核直接進入渲染。",
        "输入镜头优先（Camera-First）Prompt，结合选填首尾帧与角色一键生成单镜无对白短片，无需分镜审核直接进入渲染。",
        "Camera-first single-shot silent video generation with optional start/end keyframes and character lock.",
      ),
      creditCost: tr(
        "首幀 4 credits（若未上傳）+ 影片 2 credits/s",
        "首帧 4 credits（若未上传）+ 影片 2 credits/s",
        "4 cr start frame (if auto-generated) + 2 cr/s video",
      ),
      method: "POST",
      endpoint: "/api/v1/simple",
      pollEndpoint: "/api/v1/videos/:id",
      parameters: [
        {
          name: "prompt",
          type: "string",
          required: true,
          description: tr(
            "鏡頭焦距、角度與畫面動作描述（例：24mm 低角度鏡頭推進，主角走向鏡頭）",
            "镜头焦距、角度与画面动作描述（例：24mm 低角度镜头推进，主角走向镜头）",
            "Camera lens, angle, and motion description",
          ),
        },
        {
          name: "aspectRatio",
          type: '"9:16" | "16:9" | "1:1"',
          required: false,
          description: tr("畫面比例（預設 9:16）", "画面比例（默认 9:16）", "Video aspect ratio (default 9:16)"),
        },
        {
          name: "durationSeconds",
          type: "number (5..12)",
          required: false,
          description: tr("秒數 5–12 秒（預設 6）", "秒数 5–12 秒（默认 6）", "Clip duration in seconds (default 6)"),
        },
        {
          name: "styleId",
          type: "string",
          required: false,
          description: tr("視覺風格 ID（預設 realistic）", "视觉风格 ID（默认 realistic）", "Visual style ID (default realistic)"),
        },
        {
          name: "videoQualityTier",
          type: '"2k_cinema"',
          required: false,
          description: tr("畫質方案（預設 2k_cinema）", "画质方案（默认 2k_cinema）", "Quality tier (default 2k_cinema)"),
        },
        {
          name: "characterId",
          type: "string",
          required: false,
          description: tr("鎖定角色 ID（選填）", "锁定角色 ID（选填）", "Optional locked Character ID"),
        },
        {
          name: "firstFrameUrl",
          type: "string (https)",
          required: false,
          description: tr("自訂首幀圖片網址（選填）", "自定义首帧图片网址（选填）", "Optional custom start frame HTTPS URL"),
        },
        {
          name: "lastFrameUrl",
          type: "string (https)",
          required: false,
          description: tr("自訂尾幀圖片網址（選填）", "自定义尾帧图片网址（选填）", "Optional custom end frame HTTPS URL"),
        },
        {
          name: "referenceImageUrls",
          type: "string[]",
          required: false,
          description: tr("最多 4 張場景或構圖參考圖網址", "最多 4 张场景或构图参考图网址", "Up to 4 scene/reference image URLs"),
        },
      ],
      sampleBody: {
        prompt:
          "24mm camera pointing to character from low level, smooth tracking motion as the protagonist walks toward camera through a neon-lit rain street at night.",
        aspectRatio: "9:16",
        durationSeconds: 6,
        styleId: "realistic",
        videoQualityTier: "2k_cinema",
      },
      sampleResponse: {
        project: {
          id: "681f2a9c4b0e1a2b3c4d5e6f",
          status: "production",
          aspectRatio: "9:16",
          styleId: "realistic",
        },
      },
    },
    {
      id: "explainer",
      title: tr("Explainer 解說動畫導演", "Explainer 解说动画导演", "Explainer Video Director"),
      badge: "DIRECTOR · STORYBOARD + REEL",
      summary: tr(
        "將產品介紹、教學或文章交給 AI 解說導演（白板塗鴉、剪紙拼貼、扁平向量等），自動規劃多段分鏡、旁白與圖解動畫。",
        "将产品介绍、教学或文章交给 AI 解说导演（白板涂鸦、剪纸拼贴、扁平向量等），自动规划多段分镜、旁白与图解动画。",
        "Turn product briefs or notes into multi-clip whiteboard doodle, paper cutout, or flat-vector explainer videos.",
      ),
      creditCost: tr(
        "分鏡草稿免費 · 畫格 4 credits/張 · 影片 2 credits/s",
        "分镜草稿免费 · 画格 4 credits/张 · 影片 2 credits/s",
        "Free storyboard draft · 4 cr/frame · 2 cr/s video",
      ),
      method: "POST",
      endpoint: "/api/v1/explainers",
      pollEndpoint: "/api/v1/videos/:id",
      actionEndpoint: "/api/v1/videos/:id/actions",
      parameters: [
        {
          name: "source",
          type: "string",
          required: true,
          description: tr("解說主題、大綱或產品重點", "解说主题、大纲或产品重点", "Topic, product brief, or script notes"),
        },
        {
          name: "skillSlug",
          type: "string",
          required: false,
          description: tr(
            "解說導演 Slug（預設 cartoon-explainer-video-director，或 paper-cutout-explainer-video-director 等）",
            "解说导演 Slug（默认 cartoon-explainer-video-director，或 paper-cutout-explainer-video-director 等）",
            "Explainer director slug (default cartoon-explainer-video-director)",
          ),
        },
        {
          name: "styleId",
          type: "string",
          required: false,
          description: tr("視覺風格 ID（預設 doodle / paper-cutout）", "视觉风格 ID（默认 doodle / paper-cutout）", "Visual style ID (e.g. doodle, paper-cutout, flat-vector)"),
        },
        {
          name: "aspectRatio",
          type: '"9:16" | "16:9" | "1:1"',
          required: false,
          description: tr("畫面比例（預設 9:16）", "画面比例（默认 9:16）", "Aspect ratio (default 9:16)"),
        },
        {
          name: "durationPreset",
          type: '"micro" | "short" | "standard" | "60s" | "90s"',
          required: false,
          description: tr("影片長度檔位（預設 short）", "影片长度档位（默认 short）", "Duration preset (default short)"),
        },
        {
          name: "language",
          type: '"yue" | "en" | "zh" | ...',
          required: false,
          description: tr("旁白語言（支援 21 種語言，預設 yue 廣東話或 en）", "旁白语言（支持 21 种语言，默认 yue 广东话或 en）", "Voiceover language code (21 languages supported)"),
        },
        {
          name: "autoApprove",
          type: "boolean",
          required: false,
          description: tr(
            "設為 true 時，亦可於分鏡完成後呼叫 POST /api/v1/videos/:id/actions { action: 'generateRemaining' } 自動生成全部畫格與影片",
            "设为 true 时，亦可于分镜完成后调用 POST /api/v1/videos/:id/actions { action: 'generateRemaining' } 自动生成全部画格与影片",
            "After Phase A completes, call POST /api/v1/videos/:id/actions with { action: 'generateRemaining' } to render all frames and clips",
          ),
        },
      ],
      sampleBody: {
        source:
          "Explain in 3 simple steps how small coffee shops use AI loyalty cards to double repeat customers.",
        skillSlug: "cartoon-explainer-video-director",
        styleId: "doodle",
        aspectRatio: "9:16",
        durationPreset: "short",
        language: "en",
      },
      sampleResponse: {
        project: {
          id: "681f2a9c4b0e1a2b3c4d5e70",
          status: "phase_a",
          skillSlug: "cartoon-explainer-video-director",
          styleId: "doodle",
        },
      },
    },
    {
      id: "talking",
      title: tr("Talking 真人口播與對談", "Talking 真人口播与对谈", "Talking-Head & Lip-Sync Video"),
      badge: "HEYGEN AVATAR IV · 1080p",
      summary: tr(
        "選擇 AI 網紅角色與穿搭，輸入逐字講稿或上傳錄音，一鍵生成最長 120 秒、自然眼神與嘴型同步的 1080p 口播短片。",
        "选择 AI 网红角色与穿搭，输入逐字讲稿或上传录音，一键生成最长 120 秒、自然眼神与嘴型同步的 1080p 口播短片。",
        "Generate up to 120s 1080p lip-synced talking-head videos with your AI Influencer character, script, or uploaded audio.",
      ),
      creditCost: tr(
        "畫格 4 credits/張 · 1080p 口播影片 4 credits/s（含語音合成與對嘴）",
        "画格 4 credits/张 · 1080p 口播影片 4 credits/s（含语音合成与对嘴）",
        "4 cr/frame · 4 cr/s for 1080p lip-synced video (TTS voice included)",
      ),
      method: "POST",
      endpoint: "/api/v1/talking",
      pollEndpoint: "/api/v1/videos/:id",
      actionEndpoint: "/api/v1/videos/:id/actions",
      parameters: [
        {
          name: "characterIds",
          type: "string[]",
          required: true,
          description: tr("主講角色 ID 陣列（至少 1 位）", "主讲角色 ID 数组（至少 1 位）", "Speaker Character IDs (at least 1 required)"),
        },
        {
          name: "spokenScript",
          type: "string",
          required: false,
          description: tr("逐字口播講稿（若提供將原字照讀）", "逐字口播讲稿（若提供将原字照读）", "Verbatim script for the creator to speak"),
        },
        {
          name: "source",
          type: "string",
          required: false,
          description: tr("口播主題或情境補充說明", "口播主题或情境补充说明", "Topic brief or scene direction"),
        },
        {
          name: "language",
          type: '"yue" | "en" | "zh" | ...',
          required: false,
          description: tr("口播語言（例：yue 香港廣東話、en、zh）", "口播语言（例：yue 香港广东话、en、zh）", "Spoken language code (e.g. yue, en, zh)"),
        },
        {
          name: "talkingHeadPoseId",
          type: '"collarbone-close" | "chest-up" | "waist-up" | "full-body" | "handheld-selfie"',
          required: false,
          description: tr("鏡位構圖（預設 chest-up）", "镜位构图（默认 chest-up）", "Camera framing pose preset"),
        },
        {
          name: "talkingHeadBackgroundId",
          type: "string",
          required: false,
          description: tr("預設攝影棚／辦公室／咖啡廳背景 ID", "预设摄影棚／办公室／咖啡厅背景 ID", "Built-in studio/office/cafe background preset ID"),
        },
        {
          name: "uploadedVoUrl",
          type: "string (https)",
          required: false,
          description: tr("自訂上傳的真人錄音 MP3/WAV 網址（選填）", "自定义上传的真人录音 MP3/WAV 网址（选填）", "Optional custom uploaded voiceover audio URL"),
        },
      ],
      sampleBody: {
        characterIds: ["681f00000000000000000001"],
        spokenScript:
          "今日同大家分享三個用 AI 網紅拍 Reels 嘅秘訣，唔使自己出鏡都可以日日出片！",
        source: "Warm creator podcast studio talking-head reel",
        language: "yue",
        aspectRatio: "9:16",
        talkingHeadPoseId: "chest-up",
        talkingHeadBackgroundId: "creator-podcast-desk",
      },
      sampleResponse: {
        project: {
          id: "681f2a9c4b0e1a2b3c4d5e71",
          status: "phase_a",
          skillSlug: "talking-head-director",
          styleId: "realistic",
        },
      },
    },
    {
      id: "story",
      title: tr("Story 電影感短劇導演", "Story 电影感短剧导演", "Story Short Film Director"),
      badge: "MINIMAX HAILUO 3 · 2K",
      summary: tr(
        "由短片導演（story-short-director / one-take-director）編排角色對白、情緒轉折與 2K 電影級運鏡。",
        "由短片导演（story-short-director / one-take-director）编排角色对白、情绪转折与 2K 电影级运镜。",
        "Direct narrative short films and one-take dramatic videos with multi-character dialogue and 2K camera choreography.",
      ),
      creditCost: tr(
        "分鏡草稿免費 · 畫格 4 credits/張 · 2K 電影影片 2 credits/s",
        "分镜草稿免费 · 画格 4 credits/张 · 2K 电影影片 2 credits/s",
        "Free storyboard draft · 4 cr/frame · 2 cr/s cinema video",
      ),
      method: "POST",
      endpoint: "/api/v1/stories",
      pollEndpoint: "/api/v1/videos/:id",
      actionEndpoint: "/api/v1/videos/:id/actions",
      parameters: [
        {
          name: "source",
          type: "string",
          required: true,
          description: tr("故事劇情大綱、對白或分場描述", "故事剧情大纲、对白或分场描述", "Story plot, dramatic beats, or script"),
        },
        {
          name: "characterIds",
          type: "string[]",
          required: false,
          description: tr("參演角色 ID 陣列（最多 4 位）", "参演角色 ID 数组（最多 4 位）", "Cast Character IDs (up to 4)"),
        },
        {
          name: "skillSlug",
          type: '"story-short-director" | "one-take-director"',
          required: false,
          description: tr("短劇導演模式（預設 story-short-director）", "短剧导演模式（默认 story-short-director）", "Story director slug (default story-short-director)"),
        },
        {
          name: "styleId",
          type: "string",
          required: false,
          description: tr("視覺風格 ID（預設 realistic）", "视觉风格 ID（默认 realistic）", "Visual style ID (default realistic)"),
        },
        {
          name: "aspectRatio",
          type: '"9:16" | "16:9" | "1:1"',
          required: false,
          description: tr("畫面比例（預設 9:16）", "画面比例（默认 9:16）", "Aspect ratio (default 9:16)"),
        },
        {
          name: "language",
          type: '"yue" | "en" | "zh" | ...',
          required: false,
          description: tr("對白語言（預設 yue 或 en）", "对白语言（默认 yue 或 en）", "Dialogue language code"),
        },
      ],
      sampleBody: {
        source:
          "A tense cyberpunk rooftop reunion in the rain where two former partners discover the encrypted drive is missing.",
        skillSlug: "story-short-director",
        styleId: "realistic",
        aspectRatio: "16:9",
        durationPreset: "short",
        language: "en",
      },
      sampleResponse: {
        project: {
          id: "681f2a9c4b0e1a2b3c4d5e72",
          status: "phase_a",
          skillSlug: "story-short-director",
          styleId: "realistic",
        },
      },
    },
    {
      id: "swap",
      title: tr("Swap 角色動作遷移與打光", "Swap 角色动作迁移与打光", "Scro Swap (Motion & Relight)"),
      badge: "SAM-3 + H3 2K",
      summary: tr(
        "上傳原片並指定你的 AI 角色或參考圖，保留原片人物全身動作、表情律動與聲音，一鍵完成角色替換、物件替換或 17 種電影打光。",
        "上传原片并指定你的 AI 角色或参考图，保留原片人物全身动作、表情律动与声音，一键完成角色替换、物件替换或 17 种电影打光。",
        "Swap characters, replace objects/wardrobe, or apply 17 cinematic relight looks while preserving source motion and audio.",
      ),
      creditCost: tr(
        "首幀預覽 4 credits + 2K 動作遷移影片 2 credits/s",
        "首帧预览 4 credits + 2K 动作迁移影片 2 credits/s",
        "4 cr keyframe prep + 2 cr/s for 2K motion-swap video",
      ),
      method: "POST",
      endpoint: "/api/v1/swap",
      pollEndpoint: "/api/v1/swap/:id",
      parameters: [
        {
          name: "sourceVideoUrl",
          type: "string (https)",
          required: true,
          description: tr(
            "來源影片網址（透過 POST /api/v1/uploads 上傳取得）",
            "来源影片网址（通过 POST /api/v1/uploads 上传取得）",
            "Source video HTTPS URL (uploaded via POST /api/v1/uploads)",
          ),
        },
        {
          name: "mode",
          type: '"character" | "object" | "relight" | "color"',
          required: false,
          description: tr("換角模式（預設 character）", "换角模式（默认 character）", "Swap mode (default character)"),
        },
        {
          name: "characterId",
          type: "string",
          required: false,
          description: tr("目標 AI 網紅角色 ID", "目标 AI 网红角色 ID", "Target AI Influencer Character ID"),
        },
        {
          name: "referenceImageUrls",
          type: "string[]",
          required: false,
          description: tr("自訂角色或物件參考圖網址陣列", "自定义角色或物件参考图网址数组", "Custom donor character or object reference image URLs"),
        },
        {
          name: "sectionStart",
          type: "number",
          required: false,
          description: tr("擷取起始秒數（預設 0）", "截取起始秒数（默认 0）", "Source clip start offset in seconds (default 0)"),
        },
        {
          name: "sectionLength",
          type: "number (2..15)",
          required: false,
          description: tr("擷取秒數（預設 6）", "截取秒数（默认 6）", "Section length in seconds (default 6)"),
        },
        {
          name: "relightId",
          type: "string",
          required: false,
          description: tr("電影打光預設 ID（例：golden_halo, cyan_orb, sunset_window）", "电影打光预设 ID（例：golden_halo, cyan_orb, sunset_window）", "Optional 17-look relight preset ID"),
        },
        {
          name: "keepSourceAudio",
          type: "boolean",
          required: false,
          description: tr("是否保留原片音訊與對嘴（預設 true）", "是否保留原片音频与对嘴（默认 true）", "Preserve source audio and lip-sync (default true)"),
        },
      ],
      sampleBody: {
        mode: "character",
        sourceVideoUrl: "https://example.public.blob.vercel-storage.com/source.mp4",
        characterId: "681f00000000000000000001",
        sectionStart: 0,
        sectionLength: 6,
        keepSourceAudio: true,
      },
      sampleResponse: {
        job: {
          id: "681f2a9c4b0e1a2b3c4d5e73",
          mode: "character",
          status: "rendering",
          creditCost: 94,
        },
      },
    },
    {
      id: "teleport",
      title: tr("Teleport 角色瞬移換場", "Teleport 角色瞬移换场", "Teleport Scene Relocation"),
      badge: "SAM-3 + H3 2K",
      summary: tr(
        "保留原片人物身份、肢體動作與說話嘴型，透過場景參考圖或文字描述將主角瞬移到全新 2K 場景並自動匹配環境光影。",
        "保留原片人物身份、肢体动作与说话嘴型，通过场景参考图或文字描述将主角瞬移到全新 2K 场景并自动匹配环境光影。",
        "Relocate the speaker from a source video into any new scene photo or text-prompted 2K environment while preserving identity and motion.",
      ),
      creditCost: tr(
        "場景重定位 4 credits + 2K 影片 2 credits/s",
        "场景重定位 4 credits + 2K 影片 2 credits/s",
        "4 cr scene plate + 2 cr/s for 2K relocated video",
      ),
      method: "POST",
      endpoint: "/api/v1/teleport",
      pollEndpoint: "/api/v1/teleport/:id",
      parameters: [
        {
          name: "sourceVideoUrl",
          type: "string (https)",
          required: true,
          description: tr(
            "來源影片網址（透過 POST /api/v1/uploads 上傳取得）",
            "来源影片网址（通过 POST /api/v1/uploads 上传取得）",
            "Source video HTTPS URL (uploaded via POST /api/v1/uploads)",
          ),
        },
        {
          name: "scenePrompt",
          type: "string",
          required: false,
          description: tr(
            "新場景文字描述（與 sceneImageUrl 二擇一或同時提供）",
            "新场景文字描述（与 sceneImageUrl 二选一或同时提供）",
            "Target scene description (required if sceneImageUrl is omitted)",
          ),
        },
        {
          name: "sceneImageUrl",
          type: "string (https)",
          required: false,
          description: tr("目標場景圖片網址（選填）", "目标场景图片网址（选填）", "Optional target scene reference photo URL"),
        },
        {
          name: "aspectRatio",
          type: '"9:16" | "16:9" | "1:1"',
          required: false,
          description: tr("輸出畫面比例（預設 9:16）", "输出画面比例（默认 9:16）", "Output aspect ratio (default 9:16)"),
        },
        {
          name: "sectionStart",
          type: "number",
          required: false,
          description: tr("擷取起始秒數（預設 0）", "截取起始秒数（默认 0）", "Start offset in seconds (default 0)"),
        },
        {
          name: "sectionLength",
          type: "number (2..15)",
          required: false,
          description: tr("擷取秒數（預設 6）", "截取秒数（默认 6）", "Clip duration in seconds (default 6)"),
        },
        {
          name: "keepSourceAudio",
          type: "boolean",
          required: false,
          description: tr("保留原片人聲與音訊（預設 true）", "保留原片人声与音频（默认 true）", "Keep original voice audio (default true)"),
        },
      ],
      sampleBody: {
        sourceVideoUrl: "https://example.public.blob.vercel-storage.com/speaker.mp4",
        scenePrompt:
          "Sunlit luxury penthouse overlooking the Victoria Harbour skyline at golden hour with warm rim light",
        aspectRatio: "9:16",
        sectionStart: 0,
        sectionLength: 6,
        keepSourceAudio: true,
      },
      sampleResponse: {
        job: {
          id: "681f2a9c4b0e1a2b3c4d5e74",
          status: "rendering",
          aspectRatio: "9:16",
          creditCost: 98,
        },
      },
    },
    {
      id: "poster",
      title: tr("Poster 2K 海報生成與元素改圖", "Poster 2K 海报生成与元素改图", "Poster 2K SAM-3 Studio"),
      badge: "SEEDREAM 5 PRO · 2K + SAM-3",
      summary: tr(
        "生成 2K 商業海報與社群貼文，並自動透過 SAM-3 偵測人物、物件與文字圖層，支援針對單一元素即時局部重繪。",
        "生成 2K 商业海报与社群贴文，并自动通过 SAM-3 检测人物、物件与文字图层，支持针对单一元素即时局部重绘。",
        "Generate 2K social posters with automatic SAM-3 segmentation of people, objects, and text for in-place element editing.",
      ),
      creditCost: tr(
        "生成或局部改圖每次 4 credits",
        "生成或局部改图每次 4 credits",
        "4 credits per poster generation or element edit",
      ),
      method: "POST",
      endpoint: "/api/v1/posters",
      pollEndpoint: "/api/v1/posters/:id",
      actionEndpoint: "/api/v1/posters/:id",
      parameters: [
        {
          name: "prompt",
          type: "string",
          required: true,
          description: tr("海報主題、構圖與視覺文案描述", "海报主题、构图与视觉文案描述", "Poster concept, layout, and visual prompt"),
        },
        {
          name: "aspectRatio",
          type: '"9:16" | "1:1" | "16:9" | "2:3"',
          required: false,
          description: tr("海報比例（預設 9:16）", "海报比例（默认 9:16）", "Poster aspect ratio (default 9:16)"),
        },
        {
          name: "styleId",
          type: "string",
          required: false,
          description: tr("視覺風格 ID（預設 realistic）", "视觉风格 ID（默认 realistic）", "Style ID (default realistic)"),
        },
        {
          name: "characterIds",
          type: "string[]",
          required: false,
          description: tr("海報主角 ID 陣列（最多 4 位）", "海报主角 ID 数组（最多 4 位）", "Character IDs to feature in the poster"),
        },
        {
          name: "productIds",
          type: "string[]",
          required: false,
          description: tr("商品資產 ID 陣列（最多 4 件）", "商品资产 ID 数组（最多 4 件）", "Product asset IDs to feature"),
        },
        {
          name: "referenceImageUrl",
          type: "string (https)",
          required: false,
          description: tr("版面構圖參考圖網址（選填）", "版面构图参考图网址（选填）", "Optional layout reference image URL"),
        },
      ],
      sampleBody: {
        prompt:
          "High-fashion summer skincare campaign poster featuring the creator holding the botanical serum bottle with tropical leaves and bold headline 'GLOW DAILY'",
        aspectRatio: "9:16",
        styleId: "realistic",
        characterIds: ["681f00000000000000000001"],
      },
      sampleResponse: {
        post: {
          id: "681f2a9c4b0e1a2b3c4d5e75",
          status: "completed",
          aspectRatio: "9:16",
          imageUrl: "https://example.public.blob.vercel-storage.com/poster.png",
          elements: [
            { id: "person-1", category: "person", label: "Person 1" },
            { id: "object-1", category: "object", label: "Serum Bottle" },
          ],
        },
      },
    },
    {
      id: "life",
      title: tr("Life AI 網紅日常照工作室", "Life AI 网红日常照工作室", "Life AI Influencer Photo Studio"),
      badge: "SEEDREAM 5 PRO · IG FEED",
      summary: tr(
        "使用 IG 貼文模板、融入真實場景照或局部圈選換人，為你的 AI 網紅一鍵生成高質感日常社群照片。",
        "使用 IG 贴文模板、融入真实场景照或局部圈选换人，为你的 AI 网红一键生成高质感日常社群照片。",
        "Generate daily Instagram lifestyle photos for your AI Influencer using post templates, real-world scene placement, or person replacement.",
      ),
      creditCost: tr("每張生活照 4 credits", "每张生活照 4 credits", "4 credits per Life photo"),
      method: "POST",
      endpoint: "/api/v1/life",
      pollEndpoint: "/api/v1/life",
      parameters: [
        {
          name: "characterId",
          type: "string",
          required: true,
          description: tr("已完成鎖臉的角色 ID", "已完成锁脸的角色 ID", "Ready Character ID"),
        },
        {
          name: "source",
          type: '"preset" | "search" | "upload"',
          required: true,
          description: tr("場景來源模式（preset 模板 / search 搜尋 / upload 上傳）", "场景来源模式（preset 模板 / search 搜索 / upload 上传）", "Scene source mode (preset | search | upload)"),
        },
        {
          name: "createMode",
          type: '"post-template" | "scene-place" | "replace-person"',
          required: false,
          description: tr("生成模式（預設 post-template）", "生成模式（默认 post-template）", "Creation mode (default post-template)"),
        },
        {
          name: "templateId",
          type: "string",
          required: false,
          description: tr("IG 貼文模板 ID（例：cafe-latte, street-crosswalk, rooftop-sunset）", "IG 贴文模板 ID（例：cafe-latte, street-crosswalk, rooftop-sunset）", "Life post template ID"),
        },
        {
          name: "place",
          type: "string",
          required: false,
          description: tr("地點或場景描述", "地点或场景描述", "Location or scene description"),
        },
        {
          name: "poseId",
          type: "string",
          required: false,
          description: tr("姿勢預設 ID（選填）", "姿势预设 ID（选填）", "Optional pose preset ID"),
        },
        {
          name: "customInstruction",
          type: "string",
          required: false,
          description: tr("自訂拍攝指令或表情細節", "自定义拍摄指令或表情细节", "Custom photography or expression instruction"),
        },
      ],
      sampleBody: {
        characterId: "681f00000000000000000001",
        source: "preset",
        createMode: "post-template",
        templateId: "cafe-latte",
        place: "Sunlit artisan coffee shop in Sheung Wan",
        customInstruction: "Holding an iced matcha latte and smiling candidly at the camera",
      },
      sampleResponse: {
        shot: {
          id: "681f2a9c4b0e1a2b3c4d5e76",
          characterId: "681f00000000000000000001",
          status: "generating",
          place: "Sunlit artisan coffee shop in Sheung Wan",
        },
      },
    },
  ];
}
