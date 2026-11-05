import type { BlogLocale } from "@/model/blog-post";

// One visual example inside a 5-example showcase article.
// Each example generates its own Seedream 5.0 Pro 16:9 WebP still and renders as an H2 + <figure> + guide text.
export type VisualExampleItem = {
  key: string;
  h: string;
  alt: string;
  scene: string;
  p: string;
};

export type VisualPlaybookSpec = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  locale: BlogLocale;
  landingPath: string;
  tags: string[];
  scene: string;
  cta: string;
  answer: string;
  examples: [
    VisualExampleItem,
    VisualExampleItem,
    VisualExampleItem,
    VisualExampleItem,
    VisualExampleItem,
  ];
  workedExample: string;
  bridge: string;
  checks: [string, string, string];
};
