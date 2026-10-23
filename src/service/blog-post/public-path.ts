import { isArticlesRouteSlug } from "@/service/blog-post/bundled-posts";

// Canonical public path for a blog post slug (articles vs posts).
export function getBlogPostPublicPath(slug: string): string {
  const encoded = encodeURIComponent(slug);
  if (isArticlesRouteSlug(slug)) {
    return `/articles/${encoded}`;
  }
  return `/posts/${encoded}`;
}
