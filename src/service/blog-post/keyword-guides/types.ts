import type { BlogLocale } from "@/model/blog-post";

// One long-tail article. The body is rendered from these fields, not from a shared essay.
export type KeywordGuideSpec = {
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
  // Scene for the Gemini still. No words, logos, or celebrity likenesses.
  scene: string;
  cta: string;
};
