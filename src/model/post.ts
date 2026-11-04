import type { ObjectId } from "mongodb";

function toHexId(val: unknown): string {
  if (typeof val === "string") return val;
  if (
    val &&
    typeof val === "object" &&
    "toHexString" in val &&
    typeof (val as { toHexString: unknown }).toHexString === "function"
  ) {
    return (val as { toHexString: () => string }).toHexString();
  }
  return "";
}

export const POST_ASPECT_RATIOS = ["9:16", "1:1", "16:9", "2:3"] as const;
export type PostAspectRatio = (typeof POST_ASPECT_RATIOS)[number];

export const POST_ELEMENT_CATEGORIES = ["person", "object", "text"] as const;
export type PostElementCategory = (typeof POST_ELEMENT_CATEGORIES)[number];

export const POST_ELEMENT_EDIT_MODES = [
  "swap_character",
  "replace_product",
  "change",
  "remove",
] as const;
export type PostElementEditMode = (typeof POST_ELEMENT_EDIT_MODES)[number];

export const POST_PROMPT_MAX = 2000;

export type DetectedPostElement = {
  id: string;
  category: PostElementCategory;
  categoryIndex: number;
  label: string;
  labelZh?: string;
  rle: string;
  width: number;
  height: number;
  score: number;
  box: { x: number; y: number; width: number; height: number };
  anchorPoint: { x: number; y: number };
};

export type PostRevision = {
  revisionId: string;
  imageUrl: string;
  prompt: string;
  editSummary?: string;
  targetElementId?: string;
  targetCategory?: PostElementCategory;
  editMode?: PostElementEditMode;
  detectedElements?: DetectedPostElement[];
  createdAt: string;
};

export type PostJobStatus = "rendering" | "completed" | "failed";

export type PostCastMember = {
  characterId: ObjectId;
  name: string;
  lookUrl: string;
  outfitSpec?: string;
};

export type PostProductItem = {
  productId: ObjectId;
  name: string;
  blueprintUrl: string;
};

export type Post = {
  _id: ObjectId;
  userId?: ObjectId;
  clerkUserId: string;
  status: PostJobStatus;
  prompt: string;
  aspectRatio: PostAspectRatio;
  styleId?: string;
  cast?: PostCastMember[];
  products?: PostProductItem[];
  referenceImageUrl?: string;
  currentImageUrl?: string;
  detectedElements?: DetectedPostElement[];
  revisions: PostRevision[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicPost = {
  id: string;
  status: PostJobStatus;
  prompt: string;
  aspectRatio: PostAspectRatio;
  styleId?: string;
  cast?: Array<{
    characterId: string;
    name: string;
    lookUrl: string;
    outfitSpec?: string;
  }>;
  products?: Array<{
    productId: string;
    name: string;
    blueprintUrl: string;
  }>;
  referenceImageUrl?: string;
  currentImageUrl?: string;
  detectedElements: DetectedPostElement[];
  revisions: PostRevision[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export function isPostAspectRatio(value: string): value is PostAspectRatio {
  return (POST_ASPECT_RATIOS as readonly string[]).includes(value);
}

function normalizeStatus(raw: Record<string, unknown>): PostJobStatus {
  const status = raw.status;
  if (status === "rendering" || status === "completed" || status === "failed") {
    return status;
  }
  const previewStatus = raw.previewStatus;
  if (previewStatus === "ready") return "completed";
  if (previewStatus === "generating") return "rendering";
  if (previewStatus === "failed") return "failed";
  return typeof raw.currentImageUrl === "string" || typeof raw.previewUrl === "string"
    ? "completed"
    : "failed";
}

function normalizeIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return new Date(0).toISOString();
}

/**
 * Serialize a MongoDB `posts` document (supporting both new SAM Post Studio docs
 * and legacy SVG poster docs) into a client-safe `PublicPost`.
 */
export function toPublicPost(
  doc: Record<string, unknown> & { _id: ObjectId },
): PublicPost {
  const promptRaw =
    typeof doc.prompt === "string" && doc.prompt.trim()
      ? doc.prompt.trim()
      : typeof doc.instruction === "string"
        ? doc.instruction.trim()
        : "";

  const currentImageUrl =
    typeof doc.currentImageUrl === "string" && doc.currentImageUrl.trim()
      ? doc.currentImageUrl.trim()
      : typeof doc.thumbnailUrl === "string" && doc.thumbnailUrl.trim()
        ? doc.thumbnailUrl.trim()
        : typeof doc.previewUrl === "string" && doc.previewUrl.trim()
          ? doc.previewUrl.trim()
          : undefined;

  const rawRatio = typeof doc.aspectRatio === "string" ? doc.aspectRatio : "9:16";
  const aspectRatio: PostAspectRatio = isPostAspectRatio(rawRatio) ? rawRatio : "2:3";
  const status = normalizeStatus(doc);
  const createdAt = normalizeIsoDate(doc.createdAt);
  const updatedAt = normalizeIsoDate(doc.updatedAt ?? doc.createdAt);

  const detectedElements = Array.isArray(doc.detectedElements)
    ? (doc.detectedElements as DetectedPostElement[])
    : [];

  let revisions: PostRevision[] = Array.isArray(doc.revisions)
    ? (doc.revisions as PostRevision[])
    : [];

  if (revisions.length === 0 && currentImageUrl) {
    revisions = [
      {
        revisionId: "rev-1",
        imageUrl: currentImageUrl,
        prompt: promptRaw,
        detectedElements,
        createdAt,
      },
    ];
  }

  const cast = Array.isArray(doc.cast)
    ? doc.cast
        .map((item) => {
          const rec = (item ?? {}) as Record<string, unknown>;
          const cid = toHexId(rec.characterId);
          const lookUrl =
            typeof rec.lookUrl === "string"
              ? rec.lookUrl
              : typeof rec.blueprintUrl === "string"
                ? rec.blueprintUrl
                : "";
          if (!cid || !lookUrl) return null;
          return {
            characterId: cid,
            name: typeof rec.name === "string" ? rec.name : "",
            lookUrl,
            ...(typeof rec.outfitSpec === "string" && rec.outfitSpec.trim()
              ? { outfitSpec: rec.outfitSpec.trim() }
              : {}),
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
    : undefined;

  const products = Array.isArray(doc.products)
    ? doc.products
        .map((item) => {
          const rec = (item ?? {}) as Record<string, unknown>;
          const pid = toHexId(rec.productId);
          const blueprintUrl = typeof rec.blueprintUrl === "string" ? rec.blueprintUrl : "";
          if (!pid || !blueprintUrl) return null;
          return {
            productId: pid,
            name: typeof rec.name === "string" ? rec.name : "",
            blueprintUrl,
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
    : undefined;

  return {
    id: doc._id.toHexString(),
    status,
    prompt: promptRaw,
    aspectRatio,
    ...(typeof doc.styleId === "string" && doc.styleId.trim()
      ? { styleId: doc.styleId.trim() }
      : {}),
    ...(cast && cast.length > 0 ? { cast } : {}),
    ...(products && products.length > 0 ? { products } : {}),
    ...(typeof doc.referenceImageUrl === "string" && doc.referenceImageUrl.trim()
      ? { referenceImageUrl: doc.referenceImageUrl.trim() }
      : {}),
    ...(currentImageUrl ? { currentImageUrl } : {}),
    detectedElements,
    revisions,
    ...(typeof doc.error === "string" && doc.error.trim() ? { error: doc.error.trim() } : {}),
    createdAt,
    updatedAt,
  };
}
