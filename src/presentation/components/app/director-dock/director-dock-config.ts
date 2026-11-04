export type DirectorStudioKind =
  | "explainer"
  | "talking-head"
  | "life"
  | "scroswap"
  | "teleport";

export interface HeroShowcaseCard {
  imageUrl: string;
  tag: string;
  title: string;
}

export interface DirectorHeroCopy {
  headline: string;
  subtitle: string;
  cards: [HeroShowcaseCard, HeroShowcaseCard, HeroShowcaseCard];
}

export function getDirectorHeroCopy(
  kind: DirectorStudioKind,
  locale: "zh-Hant" | "zh-Hans" | "en",
): DirectorHeroCopy {
  switch (kind) {
    case "explainer":
      return {
        headline:
          locale === "zh-Hant"
            ? "讓你的故事鮮活起來"
            : locale === "zh-Hans"
              ? "让你的故事鲜活起来"
              : "Bring Your Story to Life",
        subtitle:
          locale === "zh-Hant"
            ? "AI 導演自動分鏡、配音與視覺風格一氣呵成"
            : locale === "zh-Hans"
              ? "AI 导演自动分镜、配音与视觉风格一气呵成"
              : "AI storyboard, voiceover, and visual direction in one studio dock",
        cards: [
          {
            imageUrl: "/hero/styles/paper-cutout.webp",
            tag: "PAPER CUTOUT",
            title: "Storybook Explainer",
          },
          {
            imageUrl: "/hero/outputs/explainer.webp",
            tag: "CINEMA STUDIO",
            title: "FIRST AI EXPLAINER REEL",
          },
          {
            imageUrl: "/hero/styles/ray-traced.webp",
            tag: "3D CINEMA",
            title: "Visual Hook Series",
          },
        ],
      };
    case "talking-head":
      return {
        headline:
          locale === "zh-Hant"
            ? "讓你的角色開口說話"
            : locale === "zh-Hans"
              ? "让你的角色开口说话"
              : "Make Your Creator Speak",
        subtitle:
          locale === "zh-Hant"
            ? "輸入講稿或上傳錄音，生成自然眼神與嘴型同步的真人開講短片"
            : locale === "zh-Hans"
              ? "输入讲稿或上传录音，生成自然眼神与嘴型同步的真人开讲短片"
              : "Type a script or upload audio for lifelike lip-sync talking-head reels",
        cards: [
          {
            imageUrl: "/talking-head-backgrounds/creator-podcast-desk.webp",
            tag: "PODCAST DESK",
            title: "Creator Studio",
          },
          {
            imageUrl: "/talking-head-backgrounds/hk-seaview-office.webp",
            tag: "TALKING HEAD",
            title: "AI INFLUENCER ON CAMERA",
          },
          {
            imageUrl: "/talking-head-backgrounds/sunlit-cafe-window.webp",
            tag: "LIFESTYLE",
            title: "Warm Cafe Vlog",
          },
        ],
      };
    case "life":
      return {
        headline:
          locale === "zh-Hant"
            ? "定格角色的每個生活瞬間"
            : locale === "zh-Hans"
              ? "定格角色的每个生活瞬间"
              : "Capture Every Life Moment",
        subtitle:
          locale === "zh-Hant"
            ? "貼文模板、融入實景或局部換人，一鍵生成 IG 級別生活照"
            : locale === "zh-Hans"
              ? "贴文模板、融入实景或局部换人，一键生成 IG 级别生活照"
              : "Post templates, real-world scenes, and person replacement for your AI creator",
        cards: [
          {
            imageUrl: "/talking-head-backgrounds/sunlit-cafe-window.webp",
            tag: "CAFE VIBE",
            title: "Afternoon Espresso",
          },
          {
            imageUrl: "/hero/outputs/life-cafe.webp",
            tag: "LIFE STUDIO",
            title: "CANDID LIFESTYLE SHOT",
          },
          {
            imageUrl: "/talking-head-backgrounds/minimalist-loft-plant.webp",
            tag: "OOTD LOOK",
            title: "Minimalist Loft",
          },
        ],
      };
    case "scroswap":
      return {
        headline:
          locale === "zh-Hant"
            ? "將任何動作遷移到你的角色"
            : locale === "zh-Hans"
              ? "将任何动作迁移到你的角色"
              : "Swap Any Motion Into Your Character",
        subtitle:
          locale === "zh-Hant"
            ? "SAM 3 自動偵測畫面人物，保留原片肢體律動、光影與聲音"
            : locale === "zh-Hans"
              ? "SAM 3 自动侦测画面人物，保留原片肢体律动、光影与声音"
              : "SAM 3 multi-person detection with full-body motion, relighting, and lip-sync",
        cards: [
          {
            imageUrl: "/relight/golden_halo.webp",
            tag: "RELIGHT",
            title: "Golden Halo",
          },
          {
            imageUrl: "/showcase/scro-reel.png",
            tag: "SCRO SWAP",
            title: "CHARACTER MOTION SWAP",
          },
          {
            imageUrl: "/relight/cyan_orb.webp",
            tag: "NEON GEL",
            title: "Cyber Studio",
          },
        ],
      };
    case "teleport":
      return {
        headline:
          locale === "zh-Hant"
            ? "一鍵將人物瞬移到全新場景"
            : locale === "zh-Hans"
              ? "一键将人物瞬移到全新场景"
              : "Teleport Your Subject Anywhere",
        subtitle:
          locale === "zh-Hant"
            ? "保留原片人物動作與神態，用場景圖或文字描述瞬間切換背景與光線"
            : locale === "zh-Hans"
              ? "保留原片人物动作与神态，用场景图或文字描述瞬间切换背景与光线"
              : "Preserve subject identity and motion while relocating into any scene or mood",
        cards: [
          {
            imageUrl: "/talking-head-backgrounds/hk-seaview-office.webp",
            tag: "HARBOUR VIEW",
            title: "Penthouse Skyline",
          },
          {
            imageUrl: "/showcase/product-marketing.png",
            tag: "TELEPORT 2K",
            title: "SCENE RELOCATION STUDIO",
          },
          {
            imageUrl: "/relight/sunset_window.webp",
            tag: "SUNSET MOOD",
            title: "Golden Hour",
          },
        ],
      };
  }
}

export function cycleOption<T>(
  options: readonly T[],
  current: T,
  delta: 1 | -1,
): T {
  if (options.length === 0) return current;
  const idx = options.indexOf(current);
  if (idx === -1) return options[0]!;
  const nextIndex = (idx + delta + options.length) % options.length;
  return options[nextIndex]!;
}

export function buildCastSlotItems<
  T extends { id: string; name: string; previewUrl?: string },
>(
  selectedIds: readonly string[],
  allCharacters: readonly T[],
  slotCount: number,
): Array<{ index: number; character: T | null }> {
  const count = Math.max(1, slotCount);
  const picked = selectedIds
    .map((id) => allCharacters.find((c) => c.id === id) ?? null)
    .filter((c): c is T => c !== null);
  const result: Array<{ index: number; character: T | null }> = [];
  for (let i = 0; i < count; i++) {
    result.push({
      index: i,
      character: picked[i] ?? null,
    });
  }
  return result;
}
