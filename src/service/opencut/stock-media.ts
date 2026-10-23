import { generateText, Output } from "ai";
import { z } from "zod";
import { directorModel } from "@/service/director/model";

export type FreeStockMediaItem = {
  id: string;
  title: string;
  type: "image" | "video";
  thumbUrl: string;
  sourceUrl: string;
  width: number;
  height: number;
  duration?: number;
  author?: string;
  sourceLabel: string;
};

type CommonsPage = {
  pageid?: number;
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
    width?: number;
    height?: number;
    duration?: number;
    user?: string;
  }>;
};

type CommonsQueryResponse = {
  query?: {
    pages?: Record<string, CommonsPage>;
  };
};

function cleanCommonsTitle(rawTitle = ""): string {
  return rawTitle
    .replace(/^File:/i, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "application/ogg",
  "video/ogg",
]);

export function parseWikimediaMediaSearch(
  payload: unknown,
  filterType: "all" | "image" | "video" = "all",
): FreeStockMediaItem[] {
  if (!payload || typeof payload !== "object") return [];
  const pages = (payload as CommonsQueryResponse).query?.pages;
  if (!pages || typeof pages !== "object") return [];

  const items: FreeStockMediaItem[] = [];
  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url || !info.mime) continue;
    const mime = info.mime.toLowerCase();
    const isImage = IMAGE_MIMES.has(mime);
    const isVideo = VIDEO_MIMES.has(mime);
    if (!isImage && !isVideo) continue;

    const itemType: "image" | "video" = isVideo ? "video" : "image";
    if (filterType !== "all" && itemType !== filterType) continue;

    const width = info.width ?? 1280;
    const height = info.height ?? 720;
    if (width < 240 || height < 240) continue;

    const title = cleanCommonsTitle(page.title) || "Stock Media";
    // Skip scanned book pages or document scans
    if (/\b(djvu|pdf|page\s+\d+|scan)\b/i.test(title)) continue;

    items.push({
      id: `commons-${page.pageid ?? items.length + 1}`,
      title: title.slice(0, 80),
      type: itemType,
      thumbUrl: info.thumburl || info.url,
      sourceUrl: isImage ? info.thumburl || info.url : info.url,
      width,
      height,
      ...(isVideo && info.duration ? { duration: Math.min(15, Math.max(2, Math.round(info.duration * 10) / 10)) } : {}),
      author: info.user,
      sourceLabel: "Wikimedia Commons (Free)",
    });
  }
  return items;
}

/**
 * Search Wikimedia Commons for free-to-use images and videos.
 */
export async function searchFreeStockMedia({
  query,
  mediaType = "all",
  limit = 18,
  fetchFn = fetch,
}: {
  query: string;
  mediaType?: "all" | "image" | "video";
  limit?: number;
  fetchFn?: typeof fetch;
}): Promise<FreeStockMediaItem[]> {
  const trimmed = query.trim().slice(0, 120);
  if (!trimmed) return [];

  const searchTerm =
    mediaType === "video"
      ? `${trimmed} filetype:video`
      : mediaType === "image"
        ? `${trimmed} filetype:bitmap`
        : trimmed;

  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", searchTerm);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", String(Math.min(30, limit * 2)));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime|size|user");
  url.searchParams.set("iiurlwidth", "1080");
  url.searchParams.set("format", "json");

  const response = await fetchFn(url, {
    headers: { "User-Agent": "Scro/1.0 (opencut-stock-media-search)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error("搜尋免費素材失敗");
  }
  const payload = (await response.json()) as unknown;
  return parseWikimediaMediaSearch(payload, mediaType).slice(0, limit);
}

export type PlannedBrollInsertion = {
  clipNumber: number;
  query: string;
  reason: string;
  media: FreeStockMediaItem;
};

const brollPlanSchema = z.object({
  insertions: z
    .array(
      z.object({
        clipNumber: z.number().int().min(1),
        englishSearchQuery: z
          .string()
          .describe(
            "2 to 4 concrete English nouns for searching Wikimedia Commons photos/videos (e.g. 'stock market chart', 'smartphone social media', 'busy office desk', 'coffee shop laptop').",
          ),
        reason: z.string(),
      }),
    )
    .min(1)
    .max(8),
});

/**
 * Uses Gemini to pick which clips in a Talking-Head / VO video benefit from B-roll cutaways
 * and fetches matching free stock media for each selected clip.
 */
export async function planAutoBrollInsertions({
  clips,
  mediaType = "image",
  fetchFn = fetch,
}: {
  clips: Array<{ clipNumber: number; line: string }>;
  mediaType?: "all" | "image" | "video";
  fetchFn?: typeof fetch;
}): Promise<PlannedBrollInsertion[]> {
  const validClips = clips.filter((c) => c.line.trim().length > 0);
  if (validClips.length === 0) return [];

  // Default heuristic target clips: middle/key clips (or every other clip starting from Clip 2; if only 1 clip, Clip 1).
  let plannedQueries: Array<{ clipNumber: number; englishSearchQuery: string; reason: string }> = [];

  try {
    const generated = await generateText({
      model: directorModel(),
      output: Output.object({ schema: brollPlanSchema }),
      system: `You are a video editor choosing B-roll cutaway overlays for a talking-head / explainer video.
Given the spoken lines per clip:
1. Pick the best clips to overlay B-roll images/videos on (usually Clip 2, Clip 3, etc., or ~50-70% of the clips so the speaker is still seen on the opening hook and closing CTA; if there are only 1-2 clips, pick at least 1).
2. For each chosen clip, write a simple, concrete 2-3 word English visual search query ("englishSearchQuery") that finds good real-world photography on Wikimedia Commons (e.g. "office teamwork", "financial chart", "smartphone app", "city street"). Avoid abstract words.`,
      prompt: validClips
        .map((c) => `Clip ${c.clipNumber}: ${c.line}`)
        .join("\n"),
    });
    if (generated.output?.insertions?.length) {
      plannedQueries = generated.output.insertions;
    }
  } catch {
    // Fallback if AI call fails: pick every clip from Clip 2 onwards (or Clip 1 if single clip)
    const targets = validClips.length > 1 ? validClips.slice(1) : validClips;
    plannedQueries = targets.slice(0, 5).map((c) => ({
      clipNumber: c.clipNumber,
      englishSearchQuery: "business technology workspace",
      reason: c.line.slice(0, 40),
    }));
  }

  const results: PlannedBrollInsertion[] = [];
  for (const item of plannedQueries) {
    try {
      let hits = await searchFreeStockMedia({
        query: item.englishSearchQuery,
        mediaType,
        limit: 4,
        fetchFn,
      });
      if (hits.length === 0 && mediaType !== "all") {
        hits = await searchFreeStockMedia({
          query: item.englishSearchQuery,
          mediaType: "all",
          limit: 4,
          fetchFn,
        });
      }
      if (hits.length === 0) {
        hits = await searchFreeStockMedia({
          query: "modern city technology",
          mediaType: "image",
          limit: 2,
          fetchFn,
        });
      }
      const picked = hits[0];
      if (picked) {
        results.push({
          clipNumber: item.clipNumber,
          query: item.englishSearchQuery,
          reason: item.reason,
          media: picked,
        });
      }
    } catch {
      // Skip failed individual query
    }
  }

  return results;
}
