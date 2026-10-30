import Link from "next/link";
import type { PublicBlogPost } from "@/model/blog-post";
import {
  BLOG_LOCALES,
  blogLocaleLabel,
  resolveBlogLandingPath,
} from "@/service/blog-post/translations";

// Sibling articles and the product page this post should send a reader to.
export function BlogPostLinks({
  post,
  productLabel,
}: {
  post: PublicBlogPost;
  productLabel: string;
}) {
  const landingPath = resolveBlogLandingPath(post);
  const siblings = BLOG_LOCALES.flatMap((code) => {
    if (code === post.locale) return [];
    const slug = post.translations?.[code]?.trim();
    if (!slug || slug === post.slug) return [];
    return [{ code, slug }];
  });
  if (!landingPath && siblings.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2 text-sm">
      {siblings.length > 0 ? (
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {siblings.map((item) => (
            <Link
              key={item.code}
              href={`/posts/${encodeURIComponent(item.slug)}`}
              hrefLang={item.code}
              className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
            >
              {blogLocaleLabel(item.code)}
            </Link>
          ))}
        </p>
      ) : null}
      {landingPath ? (
        <Link
          href={landingPath}
          className="font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700"
        >
          {productLabel}
        </Link>
      ) : null}
    </div>
  );
}
