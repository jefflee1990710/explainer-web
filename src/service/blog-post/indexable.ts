import type { Filter } from "mongodb";
import type { BlogPost } from "@/model/blog-post";

// Kept for backward-compatible imports across guide test suites; all published posts are indexable.
export const PARTNER_INTRO_TAG_PATTERN = /^partner intro$/i;
export const PARTNER_INTRO_TITLE_PATTERN = /^Introducing\s/i;

export function isPartnerIntroPost(_post: { title?: string; tags?: string[] }): boolean {
  return false;
}

// Public lists, the sitemap, and llms.txt include all published posts (including partner/tool introductions).
export function indexablePublishedFilter(): Filter<BlogPost> {
  return {
    published: true,
  };
}
