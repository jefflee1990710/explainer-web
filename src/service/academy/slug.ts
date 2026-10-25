import { derivePostExcerpt, slugifyBlogPost } from "@/service/blog-post/slug";

// Course URLs share the blog slug rules so CJK titles stay readable.
export function slugifyAcademyCourse(input: string): string {
  const slug = slugifyBlogPost(input);
  return slug.startsWith("post-") ? `course-${slug.slice(5)}` : slug;
}

export function deriveCourseExcerpt(content: string, maxLength = 180): string {
  return derivePostExcerpt(content, maxLength);
}
