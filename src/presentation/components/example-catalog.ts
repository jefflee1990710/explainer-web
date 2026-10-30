import type { StyleId } from "@/service/style";

export type ExampleItem = {
  id: string;
  src: string;
  poster: string;
  styleId: StyleId;
  aspect: "9:16" | "16:9" | "1:1";
  landingPath: string;
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
  durationSeconds: number;
  uploadDate: string;
};

// The only durable public talking-head on file. Signed provider URLs expire, so the
// talking-head, Cantonese, and AI Influencer cards share this finished host reel.
const CANTONESE_HOST = {
  src: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/projects/6ac8efc9969a0d0a6433ec18/clips/clip-1-waist-up-dim2-fixed-1793290524170.mp4",
  poster:
    "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/projects/6ac8efc9969a0d0a6433ec18/frames/clip-1-start-waist-up-seated-mic-1793289924954.png",
  durationSeconds: 23,
  uploadDate: "2026-10-29",
} as const;

// One finished, crawlable video per product direction.
export const EXAMPLE_ITEMS: ExampleItem[] = [
  {
    id: "explainer",
    src: "/showcase/scro-reel.mp4",
    poster: "/showcase/scro-reel.png",
    styleId: "doodle",
    aspect: "9:16",
    landingPath: "/explainer",
    titleKey: "examples.explainer.title",
    bodyKey: "examples.explainer.body",
    ctaKey: "examples.explainer.cta",
    durationSeconds: 5,
    uploadDate: "2026-09-29",
  },
  {
    id: "product-promo",
    src: "/showcase/product-marketing.mp4",
    poster: "/showcase/product-marketing.png",
    styleId: "clay",
    aspect: "1:1",
    landingPath: "/product-promo",
    titleKey: "examples.productPromo.title",
    bodyKey: "examples.productPromo.body",
    ctaKey: "examples.productPromo.cta",
    durationSeconds: 7,
    uploadDate: "2026-09-29",
  },
  {
    id: "cantonese",
    ...CANTONESE_HOST,
    styleId: "realistic",
    aspect: "9:16",
    landingPath: "/cantonese",
    titleKey: "examples.cantonese.title",
    bodyKey: "examples.cantonese.body",
    ctaKey: "examples.cantonese.cta",
  },
  {
    id: "talking-head",
    ...CANTONESE_HOST,
    styleId: "realistic",
    aspect: "9:16",
    landingPath: "/talking-head",
    titleKey: "examples.talkingHead.title",
    bodyKey: "examples.talkingHead.body",
    ctaKey: "examples.talkingHead.cta",
  },
  {
    id: "ai-influencer",
    ...CANTONESE_HOST,
    styleId: "realistic",
    aspect: "9:16",
    landingPath: "/ai-influencer",
    titleKey: "examples.aiInfluencer.title",
    bodyKey: "examples.aiInfluencer.body",
    ctaKey: "examples.aiInfluencer.cta",
  },
];

export const EXAMPLE_FRAME: Record<ExampleItem["aspect"], { width: string; aspect: string }> = {
  "9:16": { width: "w-[min(28rem,92%)]", aspect: "aspect-[9/16]" },
  "16:9": { width: "w-full", aspect: "aspect-video" },
  "1:1": { width: "w-[min(32rem,92%)]", aspect: "aspect-square" },
};

function absoluteMediaUrl(siteUrl: string, src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const base = siteUrl.replace(/\/$/, "");
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
}

function isoDuration(seconds: number): string {
  return `PT${Math.max(1, Math.round(seconds))}S`;
}

// One VideoObject per file. The shared host reel is named once, from the Cantonese card.
export function exampleVideoJsonLd(
  siteUrl: string,
  items: Array<ExampleItem & { name: string; description: string }>,
): Record<string, unknown> {
  const seen = new Set<string>();
  const graph = items.flatMap((item) => {
    if (seen.has(item.src)) return [];
    seen.add(item.src);
    const pageUrl = `${siteUrl.replace(/\/$/, "")}/examples#${item.id}`;
    return [{
      "@type": "VideoObject",
      name: item.name,
      description: item.description,
      thumbnailUrl: [absoluteMediaUrl(siteUrl, item.poster)],
      contentUrl: absoluteMediaUrl(siteUrl, item.src),
      uploadDate: item.uploadDate,
      duration: isoDuration(item.durationSeconds),
      embedUrl: pageUrl,
    }];
  });
  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
