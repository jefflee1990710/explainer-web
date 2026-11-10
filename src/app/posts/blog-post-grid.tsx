"use client";

import type { PublicBlogPost } from "@/model/blog-post";
import { BlogPostCard } from "@/app/posts/blog-post-card";
import { useI18n } from "@/presentation/components/i18n-provider";

// Grid view displaying all published blog posts with their feature images.
export function BlogPostGrid({ posts }: { posts: PublicBlogPost[] }) {
  const { t } = useI18n();

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-[#131722] px-6 py-16 text-center">
        <p className="text-base font-medium text-zinc-200">{t("blogPage.emptyTitle")}</p>
        <p className="mt-1 text-sm text-zinc-400">
          {t("blogPage.emptyBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <BlogPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
