import type { BlogLocale } from "@/model/blog-post";

// One seasonal how-to. The body is rendered from these fields.
export type SeasonGuideSpec = {
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
  // English scene for the Gemini still. No words, logos, children, or celebrity likenesses.
  scene: string;
  cta: string;
};
