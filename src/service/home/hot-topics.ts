import { generateText, Output } from "ai";
import {
  charactersCollection,
  postsCollection,
  usersCollection,
  videosCollection,
} from "@/dao";
import {
  DEFAULT_HOT_TOPICS,
  hotTopicsListSchema,
  type HotTopicItem,
} from "@/model/hot-topic";
import { requireAppUser } from "@/service/auth";
import { endSceneModel } from "@/service/director/model";

export const HOT_TOPICS_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function isHotTopicsCacheFresh(
  cache: { generatedAt: Date; topics: HotTopicItem[] } | undefined,
  now = Date.now(),
): boolean {
  if (!cache || !Array.isArray(cache.topics) || cache.topics.length < 3) {
    return false;
  }
  const ts =
    cache.generatedAt instanceof Date
      ? cache.generatedAt.getTime()
      : new Date(cache.generatedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return now - ts < HOT_TOPICS_TTL_MS;
}

export function buildHotTopicsPromptFromHistory(input: {
  videoSummaries: string[];
  characterSummaries: string[];
  postSummaries: string[];
}): string {
  const sections: string[] = [];
  if (input.videoSummaries.length > 0) {
    sections.push(
      `Recent Videos created by user:\n${input.videoSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    );
  }
  if (input.characterSummaries.length > 0) {
    sections.push(
      `AI Influencers / Characters created by user:\n${input.characterSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    );
  }
  if (input.postSummaries.length > 0) {
    sections.push(
      `Recent Social Posters created by user:\n${input.postSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    );
  }

  const contextBlock =
    sections.length > 0
      ? sections.join("\n\n")
      : "The user is a new creator exploring AI Explainer videos and AI Influencer Talking-Head Reels across finance, tech, productivity, wellness, and e-commerce.";

  return [
    "Generate exactly 6 high-retention, viral short-form video topic ideas ('Hot Topics to Start Generating') tailored to this creator's niche, themes, and style based on their recently generated content below.",
    "Include a balanced mix of `explainer` (2 items), `talking-head` (2 items), and `story` (2 items) useCases.",
    "Each topic must include:",
    "- `id`: short kebab-case slug",
    "- `category`: uppercase English + Traditional Chinese category tag (e.g. `FINANCE · 投資理財`, `AI & TECH · 科技創業`, `STORY · 品牌故事`)",
    "- `useCase`: either `explainer`, `talking-head`, or `story`",
    "- `badge`: short punchy badge with an emoji (e.g. `🔥 Trending`, `⚡ Viral Hook`, `💡 High Save Rate`)",
    "- `titleZhHant`, `titleZhHans`, `titleEn`: scroll-stopping hook title in Traditional Chinese (Hong Kong colloquial style), Simplified Chinese, and English",
    "- `descZhHant`, `descZhHans`, `descEn`: 1-sentence summary of why this angle works",
    "- `promptZhHant`, `promptZhHans`, `promptEn`: a complete, ready-to-shoot 3-4 sentence script/brief (natural Hong Kong Cantonese phrasing for `promptZhHant`) that will be pre-filled directly into the AI video director when the user clicks the topic.",
    "",
    contextBlock,
  ].join("\n");
}

type HotTopicsLlmRunner = (prompt: string) => Promise<HotTopicItem[] | null>;

async function defaultRunHotTopicsLlm(prompt: string): Promise<HotTopicItem[] | null> {
  const { output } = await generateText({
    model: endSceneModel(),
    output: Output.object({ schema: hotTopicsListSchema }),
    system:
      "You are an expert short-form viral content strategist for Scro AI Studio. You analyze a creator's recent videos, characters, and posters to propose 6 fresh, high-converting next video topics with ready-to-generate scripts.",
    prompt,
  });
  return output?.topics ?? null;
}

export async function getOrGenerateUserHotTopicsAction(options?: {
  forceRefresh?: boolean;
  llmRunner?: HotTopicsLlmRunner;
}): Promise<{
  ok: true;
  topics: HotTopicItem[];
  fromCache: boolean;
  generatedAt: string;
}> {
  const user = await requireAppUser();
  const now = new Date();

  if (!options?.forceRefresh && isHotTopicsCacheFresh(user.hotTopicsCache, now.getTime())) {
    return {
      ok: true,
      topics: user.hotTopicsCache!.topics,
      fromCache: true,
      generatedAt: new Date(user.hotTopicsCache!.generatedAt).toISOString(),
    };
  }

  try {
    const [videosCol, charsCol, postsCol, usersCol] = await Promise.all([
      videosCollection(),
      charactersCollection(),
      postsCollection(),
      usersCollection(),
    ]);

    const [recentVideos, recentChars, recentPosts] = await Promise.all([
      videosCol
        .find(
          { clerkUserId: user.clerkUserId },
          {
            projection: {
              skillSlug: 1,
              source: 1,
              spokenScript: 1,
              "phaseA.localizedTitle": 1,
              "phaseA.coreMessage": 1,
            },
          },
        )
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(8)
        .toArray(),
      charsCol
        .find(
          { clerkUserId: user.clerkUserId },
          { projection: { name: 1, persona: 1, "versions.prompt": 1 } },
        )
        .sort({ updatedAt: -1 })
        .limit(5)
        .toArray(),
      postsCol
        .find(
          { clerkUserId: user.clerkUserId },
          { projection: { prompt: 1 } },
        )
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
    ]);

    const videoSummaries = recentVideos
      .map((v) => {
        const title = v.phaseA?.localizedTitle || "";
        const body = (v.spokenScript || v.source || v.phaseA?.coreMessage || "").slice(0, 180);
        return [title, body].filter(Boolean).join(" — ");
      })
      .filter(Boolean);

    const characterSummaries = recentChars
      .map((c) => {
        const latestPrompt = c.versions?.[c.versions.length - 1]?.prompt || "";
        const summary = c.persona?.summary || latestPrompt;
        return [c.name, summary.slice(0, 120)].filter(Boolean).join(": ");
      })
      .filter(Boolean);

    const postSummaries = recentPosts
      .map((p) => (p.prompt || "").slice(0, 140))
      .filter(Boolean);

    const prompt = buildHotTopicsPromptFromHistory({
      videoSummaries,
      characterSummaries,
      postSummaries,
    });

    const runner = options?.llmRunner ?? defaultRunHotTopicsLlm;
    const generated = await runner(prompt);
    const topics =
      generated && generated.length >= 3 ? generated.slice(0, 6) : [...DEFAULT_HOT_TOPICS];

    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          hotTopicsCache: {
            generatedAt: now,
            topics,
          },
          updatedAt: now,
        },
      },
    );

    return {
      ok: true,
      topics,
      fromCache: false,
      generatedAt: now.toISOString(),
    };
  } catch (error) {
    console.error("getOrGenerateUserHotTopicsAction failed, using fallback topics", error);
    const fallback = user.hotTopicsCache?.topics?.length
      ? user.hotTopicsCache.topics
      : [...DEFAULT_HOT_TOPICS];
    return {
      ok: true,
      topics: fallback,
      fromCache: true,
      generatedAt: now.toISOString(),
    };
  }
}
