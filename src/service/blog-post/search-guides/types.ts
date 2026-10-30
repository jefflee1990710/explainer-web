import type { BlogLocale } from "@/model/blog-post";

export type SearchGuide = {
  group: string;
  locale: BlogLocale;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featureImage: string;
  tags: string[];
  landingPath: string;
};

export const GUIDE_IMAGES = {
  explainer: "https://www.scro.io/showcase/scro-reel.png",
  product: "https://www.scro.io/showcase/product-marketing.png",
  host: "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/projects/6ac8efc9969a0d0a6433ec18/frames/clip-1-start-waist-up-seated-mic-1793289924954.png",
} as const;
