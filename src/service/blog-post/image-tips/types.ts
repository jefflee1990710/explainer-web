import type { BlogLocale } from "@/model/blog-post";

// One in-article still. The alt becomes the caption under the image.
export type ImageTipFigure = {
  key: string;
  alt: string;
  scene: string;
};

// One craft article. The body is rendered from these fields.
export type ImageTipSpec = {
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
  figure?: ImageTipFigure;
};
