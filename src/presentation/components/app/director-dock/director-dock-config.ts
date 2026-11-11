export type DirectorStudioKind =
  | "simple"
  | "explainer"
  | "talking-head"
  | "story"
  | "life"
  | "scroswap"
  | "teleport"
  | "posts";

export interface HeroShowcaseCard {
  imageUrl: string;
  videoUrl?: string;
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
    case "simple":
      return {
        headline:
          locale === "zh-Hant"
            ? "一鍵生成單鏡電影短片"
            : locale === "zh-Hans"
              ? "一键生成单镜电影短片"
              : "Bring Your Shot to Life",
        subtitle:
          locale === "zh-Hant"
            ? "輸入鏡頭焦距、角度與動作描述，結合首尾幀與角色一鍵生成電影級單鏡影片"
            : locale === "zh-Hans"
              ? "输入镜头焦距、角度与动作描述，结合首尾帧与角色一键生成电影级单镜影片"
              : "Camera-first single-shot video generation with start/end frames and character lock",
        cards: [
          {
            imageUrl: "/hero/tools/simple/left.webp",
            tag: "FIRST FRAME",
            title: "Start Keyframe",
          },
          {
            imageUrl: "/hero/tools/simple/center.webp",
            videoUrl: "/hero/tools/simple/center.mp4",
            tag: "SIMPLE VIDEO",
            title: "2K CAMERA-FIRST SHOT",
          },
          {
            imageUrl: "/hero/tools/simple/right.webp",
            tag: "LAST FRAME",
            title: "End Keyframe",
          },
        ],
      };
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
            imageUrl: "/hero/tools/explainer/left.webp",
            tag: "WHITEBOARD DOODLE",
            title: "Visual Diagram",
          },
          {
            imageUrl: "/hero/tools/explainer/center.webp",
            videoUrl: "/hero/tools/explainer/center.mp4",
            tag: "EXPLAINER REEL",
            title: "AI EXPLAINER DIRECTOR",
          },
          {
            imageUrl: "/hero/tools/explainer/right.webp",
            tag: "PAPER CUTOUT",
            title: "Storybook Collage",
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
            imageUrl: "/hero/tools/talking-head/left.webp",
            tag: "PODCAST DESK",
            title: "Creator Studio",
          },
          {
            imageUrl: "/hero/tools/talking-head/center.webp",
            videoUrl: "/hero/tools/talking-head/center.mp4",
            tag: "TALKING HEAD",
            title: "AI INFLUENCER ON CAMERA",
          },
          {
            imageUrl: "/hero/tools/talking-head/right.webp",
            tag: "LIFESTYLE",
            title: "Warm Cafe Vlog",
          },
        ],
      };
    case "story":
      return {
        headline:
          locale === "zh-Hant"
            ? "把故事拍成電影感短劇"
            : locale === "zh-Hans"
              ? "把故事拍成电影感短剧"
              : "Direct Your Short Film Story",
        subtitle:
          locale === "zh-Hant"
            ? "由短片導演（Short Film Director）編排角色對白、情緒轉折與電影級運鏡"
            : locale === "zh-Hans"
              ? "由短片导演（Short Film Director）编排角色对白、情绪转折与电影级运镜"
              : "Character-driven narrative short films with emotional beats and cinematic camera work",
        cards: [
          {
            imageUrl: "/hero/tools/story/left.webp",
            tag: "DRAMA BEAT",
            title: "Golden Hour Scene",
          },
          {
            imageUrl: "/hero/tools/story/center.webp",
            videoUrl: "/hero/tools/story/center.mp4",
            tag: "SHORT FILM",
            title: "CINEMATIC STORY DIRECTOR",
          },
          {
            imageUrl: "/hero/tools/story/right.webp",
            tag: "NEON MOOD",
            title: "Night Dialogue",
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
            imageUrl: "/hero/tools/life/left.webp",
            tag: "CAFE VIBE",
            title: "Afternoon Espresso",
          },
          {
            imageUrl: "/hero/tools/life/center.webp",
            videoUrl: "/hero/tools/life/center.mp4",
            tag: "LIFE STUDIO",
            title: "CANDID LIFESTYLE SHOT",
          },
          {
            imageUrl: "/hero/tools/life/right.webp",
            tag: "OOTD LOOK",
            title: "Street Fashion Feed",
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
            ? "自動偵測畫面人物，保留原片肢體律動、光影與聲音"
            : locale === "zh-Hans"
              ? "自动侦测画面人物，保留原片肢体律动、光影与声音"
              : "Multi-person detection with full-body motion, relighting, and lip-sync",
        cards: [
          {
            imageUrl: "/hero/tools/scroswap/left.webp",
            tag: "SOURCE MOTION",
            title: "Original Action Clip",
          },
          {
            imageUrl: "/hero/tools/scroswap/center.webp",
            videoUrl: "/hero/tools/scroswap/center.mp4",
            tag: "SCRO SWAP",
            title: "CHARACTER MOTION SWAP",
          },
          {
            imageUrl: "/hero/tools/scroswap/right.webp",
            tag: "TARGET CAST",
            title: "Swapped Identity & Light",
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
            imageUrl: "/hero/tools/teleport/left.webp",
            tag: "ORIGINAL CLIP",
            title: "Subject & Motion",
          },
          {
            imageUrl: "/hero/tools/teleport/center.webp",
            videoUrl: "/hero/tools/teleport/center.mp4",
            tag: "TELEPORT 2K",
            title: "SCENE RELOCATION STUDIO",
          },
          {
            imageUrl: "/hero/tools/teleport/right.webp",
            tag: "NEW SCENE",
            title: "Relocated Destination",
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
              : "Create Posters & Edit Any Element",
        subtitle:
          locale === "zh-Hant"
            ? "生成 2K 海報貼文，自動分離人物、物件與文字供你單獨重繪"
            : locale === "zh-Hans"
              ? "生成 2K 海报贴文，自动分离人物、物件与文字供你单独重绘"
              : "2K poster generation with element editing for people, objects, and text",
        cards: [
          {
            imageUrl: "/hero/tools/posts/left.webp",
            tag: "CHARACTER & PRODUCT",
            title: "Brand Assets",
          },
          {
            imageUrl: "/hero/tools/posts/center.webp",
            videoUrl: "/hero/tools/posts/center.mp4",
            tag: "POSTER CREATOR",
            title: "2K SAM-3 POSTER STUDIO",
          },
          {
            imageUrl: "/hero/tools/posts/right.webp",
            tag: "LAYER INPAINT",
            title: "Click-to-Edit Elements",
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

  if (targetStyleId === "papercraft-diorama") {
    return { styleId: targetStyleId, characterIds: [] };
  }
  const targetCount =
    nextCastNeed > 0 ? nextCastNeed : currentCharacterIds.length > 0 ? 1 : 0;
  if (targetCount <= 0) {
    return { styleId: targetStyleId, characterIds: [] };
  }
  if (kept.length >= targetCount) {
    return { styleId: targetStyleId, characterIds: kept.slice(0, targetCount) };
  }
  const pool = characters.filter(matchesStyle);
  const aera = pool.find((c) => /aera/i.test(c.name));
  const ordered = aera ? [aera, ...pool.filter((c) => c.id !== aera.id)] : pool;
  const merged = [...kept];
  for (const c of ordered) {
    if (merged.length >= targetCount) break;
    if (!merged.includes(c.id)) merged.push(c.id);
  }
  return { styleId: targetStyleId, characterIds: merged };
}

export function resolveModeSwitchSkillSlug(
  targetMode: "explainer" | "talking-head" | "story",
  skills: readonly { slug: string; behaviorSlug?: string; isCustom?: boolean }[],
): string | null {
  if (targetMode === "story") {
    const exact = skills.find((s) => s.slug === "story-short-director");
    if (exact) return exact.slug;
    const oneTake = skills.find((s) => s.slug === "one-take-director");
    if (oneTake) return oneTake.slug;
    const anyStory = skills.find(
      (s) =>
        s.slug === "story-short-director" ||
        s.behaviorSlug === "story-short-director" ||
        s.slug === "one-take-director" ||
        s.behaviorSlug === "one-take-director",
    );
    return anyStory?.slug ?? null;
  }
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
    /^\/app\/(room|explainers|talking-heads|stories|life|scroswap|teleport|posts|simple)(\/|$)/.test(
      pathname,
    ) ||
    /^\/app\/videos\/.+/.test(pathname) ||
    /^\/app\/projects\/[^/]+\/videos(\/|$)/.test(pathname)
  );
}

export function getAspectRatioIconSizeClass(aspectRatio?: string | null): string {
  if (aspectRatio === "16:9") return "h-2 w-3";
  if (aspectRatio === "1:1") return "h-2.5 w-2.5";
  return "h-3 w-2";
}



