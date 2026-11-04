export type DirectorStudioKind =
  | "explainer"
  | "talking-head"
  | "life"
  | "scroswap"
  | "teleport"
  | "posts";

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
  locale: string,
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
            ? "一鍵將角色瞬移到全新場景"
            : locale === "zh-Hans"
              ? "一键将角色瞬移到全新场景"
              : "Teleport Your Character Anywhere",
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
    case "posts":
      return {
        headline:
          locale === "zh-Hant"
            ? "生成海報貼文，點選任意元素即時改圖"
            : locale === "zh-Hans"
              ? "生成海报贴文，点选任意元素即时改图"
              : "Create Posts & Edit Any Element with SAM",
        subtitle:
          locale === "zh-Hant"
            ? "Seedream 5.0 Pro 生成 2K 貼文，SAM 3 自動分離人物、物件與文字供你單獨重繪"
            : locale === "zh-Hans"
              ? "Seedream 5.0 Pro 生成 2K 贴文，SAM 3 自动分离人物、物件与文字供你单独重绘"
              : "Seedream 5.0 Pro 2K generation + SAM 3 segmentation for people, objects, and text",
        cards: [
          {
            imageUrl: "/hero/outputs/life-cafe.webp",
            tag: "SAM PERSON",
            title: "Character Swap",
          },
          {
            imageUrl: "/showcase/product-marketing.png",
            tag: "POST STUDIO 2K",
            title: "SEEDREAM 5 + SAM 3 EDIT",
          },
          {
            imageUrl: "/hero/styles/paper-cutout.webp",
            tag: "SAM TEXT & OBJECT",
            title: "In-Place Poster Edit",
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

export const LIFE_REMARK_STAGE_CLASS =
  "relative mx-auto w-fit max-h-[14rem] overflow-hidden rounded-xl border border-accent-ink/15 bg-zinc-900 select-none";

export function resolveCastSlotCount(
  kind: DirectorStudioKind,
  castNeed: number,
): number {
  if (kind === "life" || kind === "scroswap") return 1;
  return Math.max(1, castNeed);
}

export function computeSkillSwitchState<
  T extends {
    id: string;
    name: string;
    styleId?: string;
    styleIds?: readonly string[];
    previewUrl?: string | null;
  },
>({
  currentStyleId,
  preferredStyleId,
  nextCastNeed,
  characters,
  currentCharacterIds,
}: {
  currentStyleId: string;
  preferredStyleId?: string;
  nextCastNeed: number;
  characters: readonly T[];
  currentCharacterIds: readonly string[];
}): { styleId: string; characterIds: string[] } {
  const targetStyleId = preferredStyleId || currentStyleId;
  const matchesStyle = (c: T) => {
    const styles = c.styleIds?.length ? c.styleIds : c.styleId ? [c.styleId] : [];
    return Boolean(c.previewUrl) && styles.includes(targetStyleId);
  };
  const kept = currentCharacterIds.filter((cid) => {
    const found = characters.find((c) => c.id === cid);
    return found ? matchesStyle(found) : false;
  });

  if (nextCastNeed <= 0) {
    return { styleId: targetStyleId, characterIds: kept.slice(0, 1) };
  }
  if (kept.length >= nextCastNeed) {
    return { styleId: targetStyleId, characterIds: kept.slice(0, nextCastNeed) };
  }
  const pool = characters.filter(matchesStyle);
  const aera = pool.find((c) => /aera/i.test(c.name));
  const ordered = aera ? [aera, ...pool.filter((c) => c.id !== aera.id)] : pool;
  const merged = [...kept];
  for (const c of ordered) {
    if (merged.length >= nextCastNeed) break;
    if (!merged.includes(c.id)) merged.push(c.id);
  }
  return { styleId: targetStyleId, characterIds: merged };
}

export function resolveModeSwitchSkillSlug(
  targetMode: "explainer" | "talking-head",
  skills: readonly { slug: string; behaviorSlug?: string; isCustom?: boolean }[],
): string | null {
  if (targetMode === "talking-head") {
    const exact = skills.find((s) => s.slug === "talking-head-director");
    if (exact) return exact.slug;
    const anyTh = skills.find(
      (s) =>
        s.slug === "talking-head-director" ||
        s.behaviorSlug === "talking-head-director",
    );
    return anyTh?.slug ?? null;
  }
  const preferredExplainers = [
    "paper-cutout-explainer-video-director",
    "cartoon-explainer-video-director",
    "mentalok-explainer-video-director",
  ];
  for (const slug of preferredExplainers) {
    const found = skills.find((s) => !s.isCustom && s.slug === slug);
    if (found) return found.slug;
  }
  const fallback = skills.find(
    (s) =>
      !s.isCustom &&
      s.slug !== "talking-head-director" &&
      s.slug !== "dialogue-qa-director",
  );
  return fallback?.slug ?? skills.find((s) => s.slug !== "talking-head-director")?.slug ?? null;
}

export function isFullBleedStudioPath(pathname: string): boolean {
  return (
    /^\/app\/(room|explainers|talking-heads|life|scroswap|teleport|posts|videos)(\/|$)/.test(
      pathname,
    ) || /^\/app\/projects\/[^/]+\/videos(\/|$)/.test(pathname)
  );
}


