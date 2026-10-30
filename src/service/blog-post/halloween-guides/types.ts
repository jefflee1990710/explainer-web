import type { BlogLocale } from "@/model/blog-post";

// One in-article still. The alt is the caption under the picture.
export type HalloweenFigure = {
  key: string;
  alt: string;
  scene: string;
};

// One Hong Kong Cantonese Halloween tip.
export type HalloweenGuideSpec = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  locale: BlogLocale;
  landingPath: string;
  tags: string[];
  answer: string;
  points: { h: string; p: string }[];
  example: string;
  bridge: string;
  checks: [string, string, string];
  scene: string;
  cta: string;
  figure?: HalloweenFigure;
};
