"use client";

import Link from "next/link";
import type { PublicBlogPost } from "@/model/blog-post";
import { useI18n } from "@/presentation/components/i18n-provider";

// Format ISO date string into a readable date label.
function formatPostDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale || "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

// Single blog post card displayed in the /posts grid view with its feature image.
export function BlogPostCard({ post }: { post: PublicBlogPost }) {
  const { t, locale } = useI18n();

  return (
    <Link
      href={`/posts/${encodeURIComponent(post.slug)}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-16/10 w-full overflow-hidden bg-zinc-100">
        <img
          src={post.featureImage}
          alt={post.title}
          width={1600}
          height={1000}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <time dateTime={post.createdAt}>{formatPostDate(post.createdAt, locale)}</time>
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-700"
              >
                {tag}
              </span>
            ))}
          </div>
          <h2 className="line-clamp-2 text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-700">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600">
              {post.excerpt}
            </p>
          ) : null}
        </div>
        <span className="mt-4 inline-flex items-center text-sm font-medium text-zinc-900">
          {t("blogPage.readArticle")}
        </span>
      </div>
    </Link>
  );
}
