import type { Filter } from "mongodb";
import type { BlogPost } from "@/model/blog-post";

// Partner roundups are published for old links, and kept out of the index.
export const PARTNER_INTRO_TAG_PATTERN = /^partner intro$/i;
export const PARTNER_INTRO_TITLE_PATTERN = /^Introducing\s/i;

export function isPartnerIntroPost(post: { title?: string; tags?: string[] }): boolean {
  const tags = post.tags ?? [];
  if (tags.some((tag) => PARTNER_INTRO_TAG_PATTERN.test(tag.trim()))) return true;
  return PARTNER_INTRO_TITLE_PATTERN.test((post.title ?? "").trim());
}

// Public lists, the sitemap, and llms.txt use this. Admin views do not.
export function indexablePublishedFilter(): Filter<BlogPost> {
  return {
    published: true,
    $nor: [
      { tags: { $regex: PARTNER_INTRO_TAG_PATTERN } },
      { title: { $regex: PARTNER_INTRO_TITLE_PATTERN } },
    ],
  };
}
