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
]);

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "application/ogg",
  "video/ogg",
]);

const LOW_QUALITY_TITLE_RE =
  /\b(djvu|pdf|page\s+\d+|scan|chronology|diagram|chart|plot|graph\b|map_of|coat_of_arms|flag_of|logo|icon|symbol|signature|stamp|usmc\s+\d+|geograph\.org\.uk)\b/i;

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
    const minWidth = isImage ? 800 : 480;
    const minHeight = isImage ? 500 : 360;
    if (width < minWidth || height < minHeight) continue;

    const title = cleanCommonsTitle(page.title) || "Stock Media";
    // Skip scanned book pages, old spreadsheet GIF charts, military archive serials, or icons
    if (LOW_QUALITY_TITLE_RE.test(title)) continue;

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
      system: `You are a senior short-form video editor choosing B-roll cutaway overlays for a Reel / TikTok video.
Given the spoken lines per clip:
1. Pick the best clips to overlay B-roll on (never Clip 1 hook and never the final CTA clip when there are >= 3 clips; pick at most ~50% of the clips, preferring non-adjacent clips or the strongest 2-3 middle beats so B-roll never covers the video wall-to-wall).
2. For each chosen clip, write a concrete 2-3 word English photography search query ("englishSearchQuery") that finds high-resolution real-world photography on Wikimedia Commons (e.g. "modern office workspace", "person using smartphone", "busy shopping street", "coffee shop laptop"). NEVER use words like "chart", "graph", "diagram", or "chronology" because those return low-res spreadsheet scans.`,
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
  const usedMediaIds = new Set<string>();
  for (const item of plannedQueries) {
    try {
      let hits = await searchFreeStockMedia({
        query: item.englishSearchQuery,
        mediaType,
        limit: 8,
        fetchFn,
      });
      if (hits.length === 0 && mediaType !== "all") {
        hits = await searchFreeStockMedia({
          query: item.englishSearchQuery,
          mediaType: "all",
          limit: 8,
          fetchFn,
        });
      }
      if (hits.length === 0) {
        hits = await searchFreeStockMedia({
          query: "modern office workspace",
          mediaType: "image",
          limit: 6,
          fetchFn,
        });
      }
      const picked = hits.find((h) => !usedMediaIds.has(h.id)) ?? hits[0];
      if (picked) {
        usedMediaIds.add(picked.id);
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

export type BrollLayoutMode = "pip" | "cover";
export type CharacterHorizontalSide = "left" | "right" | "center";

const CHAR_RIGHT_RE =
  /(?:立於|位於|置於|偏向|企喺|站在|在)(?:畫面)?右側|\b(?:on the right|frame right|right side of (?:the )?frame|stands? right)\b/i;
const CHAR_LEFT_RE =
  /(?:立於|位於|置於|偏向|企喺|站在|在)(?:畫面)?左側|\b(?:on the left|frame left|left side of (?:the )?frame|stands? left)\b/i;

/**
 * Infers which horizontal side of the frame the character occupies from the storyboard scene description,
 * so floating PiP B-roll cards can shift toward the opposite open space.
 */
export function inferCharacterHorizontalSide(
  explainerScene?: string | null,
): CharacterHorizontalSide {
  if (!explainerScene) return "center";
  // Inspect the opening "1) Character:" and "4) Camera:" clauses (before "結尾：" if present)
  const startPart = explainerScene.split(/結尾[：:]/)[0] ?? explainerScene;
  const charBlock = startPart.split(/2\)\s*Set[：:]/i)[0] ?? startPart.slice(0, 260);
  const camBlock = startPart.split(/4\)\s*Camera[：:]/i)[1] ?? "";
  const combined = `${charBlock} ${camBlock}`;
  if (CHAR_RIGHT_RE.test(combined)) return "right";
  if (CHAR_LEFT_RE.test(combined)) return "left";
  return "center";
}

/**
 * Computes the optimal timing window (impact beat on the second half of the clip so the opening
 * setup and clip transition stay visible) and 9:16 / 16:9 canvas transform for a B-roll overlay.
 */
export function computeBrollPlacement({
  clipStartSec,
  clipDurSec,
  canvasSize,
  sourceWidth,
  sourceHeight,
  layoutMode = "pip",
  characterSide = "center",
}: {
  clipStartSec: number;
  clipDurSec: number;
  canvasSize: { width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  layoutMode?: BrollLayoutMode;
  characterSide?: CharacterHorizontalSide;
}): {
  startTimeSeconds: number;
  durationSeconds: number;
  scaleX: number;
  scaleY: number;
  positionX: number;
  positionY: number;
} {
  // Show the main character/whiteboard for the first ~38% of the clip (setup beat),
  // then pop in the B-roll on the payoff beat for ~2.0–2.5s, ending 0.35s before the cut.
  let offsetSec = 0;
  let durationSeconds = clipDurSec;
  if (clipDurSec >= 3.2) {
    offsetSec = Math.round(clipDurSec * 0.38 * 100) / 100;
    const maxWindow = Math.max(1.4, clipDurSec - offsetSec - 0.35);
    durationSeconds = Math.round(Math.min(2.5, maxWindow) * 100) / 100;
  } else if (clipDurSec > 2.0) {
    offsetSec = 0.5;
    durationSeconds = Math.round(Math.max(1.2, clipDurSec - 0.75) * 100) / 100;
  }

  const startTimeSeconds = Math.round((clipStartSec + offsetSec) * 100) / 100;
  const safeSrcW = Math.max(1, sourceWidth);
  const safeSrcH = Math.max(1, sourceHeight);
  const isVerticalCanvas = canvasSize.height > canvasSize.width;

  if (layoutMode === "cover") {
    // OpenCut's renderer applies `containScale = min(canvasW/srcW, canvasH/srcH)` first.
    // Multiplying by `coverScale / containScale` makes any aspect-ratio photo fill 100% of the canvas.
    const containScale = Math.min(
      canvasSize.width / safeSrcW,
      canvasSize.height / safeSrcH,
    );
    const coverScale = Math.max(
      canvasSize.width / safeSrcW,
      canvasSize.height / safeSrcH,
    );
    const ratio =
      containScale > 0
        ? Math.round((coverScale / containScale) * 1000) / 1000
        : 1;
    return {
      startTimeSeconds,
      durationSeconds,
      scaleX: ratio,
      scaleY: ratio,
      positionX: 0,
      positionY: 0,
    };
  }

  // Default "pip" (Floating Picture-in-Picture Card):
  // On 9:16 vertical canvases, characters' heads & faces occupy the upper-middle band (y = 20%..45%),
  // while subtitles sit near the bottom (y = 80%..88%). Place the B-roll card at 72% width in the
  // lower-middle showcase zone (`positionY = +14%` of canvasHeight) and shift slightly opposite
  // the character's standing side so both the face and bottom subtitles stay completely unobstructed.
  if (isVerticalCanvas) {
    const horizontalShift =
      characterSide === "right"
        ? Math.round(-canvasSize.width * 0.08)
        : characterSide === "left"
          ? Math.round(canvasSize.width * 0.08)
          : 0;
    return {
      startTimeSeconds,
      durationSeconds,
      scaleX: 0.72,
      scaleY: 0.72,
      positionX: horizontalShift,
      positionY: Math.round(canvasSize.height * 0.14),
    };
  }

  // On 16:9 / 1:1 canvases, place PiP card in the upper quadrant opposite the character
  const landscapeX =
    characterSide === "right"
      ? Math.round(-canvasSize.width * 0.22)
      : Math.round(canvasSize.width * 0.22);
  return {
    startTimeSeconds,
    durationSeconds,
    scaleX: 0.48,
    scaleY: 0.48,
    positionX: landscapeX,
    positionY: Math.round(-canvasSize.height * 0.18),
  };
}
