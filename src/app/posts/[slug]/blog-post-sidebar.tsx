"use client";

import Link from "next/link";
import type { PublicBlogPost } from "@/model/blog-post";
import { useI18n } from "@/presentation/components/i18n-provider";
import { BlogPostRegisterCta } from "@/app/posts/[slug]/blog-post-register-cta";

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

// Right-hand sticky sidebar on post detail pages: Recommended Reading list + Register Scro CTA below it.
export function BlogPostSidebar({
  recommendedPosts,
  signedIn = false,
}: {
  recommendedPosts: PublicBlogPost[];
  signedIn?: boolean;
}) {
  const { locale } = useI18n();
  const isZh = locale.startsWith("zh");

  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      {recommendedPosts.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-900">
              {isZh ? "推薦閱讀 · Recommended" : "Recommended Reading"}
            </h2>
            <Link
              href="/posts"
              className="text-xs font-semibold text-zinc-500 transition hover:text-zinc-900"
            >
              {isZh ? "全部文章 →" : "All posts →"}
            </Link>
          </div>

          <div className="mt-4 space-y-4">
            {recommendedPosts.map((item) => (
              <Link
                key={item.id}
                href={`/posts/${encodeURIComponent(item.slug)}`}
                className="group flex items-start gap-3 rounded-xl p-1.5 transition hover:bg-zinc-50"
              >
                {item.featureImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.featureImage}
                    alt={item.title}
                    loading="lazy"
                    className="h-16 w-24 shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 object-cover transition group-hover:scale-[1.03]"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-900 group-hover:text-[#ff4d2e]">
                    {item.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                    <time dateTime={item.createdAt}>{formatShortDate(item.createdAt)}</time>
                    {item.tags[0] ? (
                      <>
                        <span>·</span>
                        <span className="truncate font-medium text-zinc-600">{item.tags[0]}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Register Scro CTA directly under Recommended Reading */}
      <BlogPostRegisterCta variant="sidebar" signedIn={signedIn} />
    </aside>
  );
}
