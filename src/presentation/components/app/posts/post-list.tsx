"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/presentation/components/i18n-provider";
import { CreatePostDialog, type PosterLayoutChoice } from "@/presentation/components/app/posts/create-post-dialog";
import { PostCard } from "@/presentation/components/app/posts/post-card";
import type { PublicPost } from "@/model/post-layers";

// Poster library. Refreshes while a preview is still running.
export function PostList({ posts, layouts }: { posts: PublicPost[]; layouts: PosterLayoutChoice[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const generating = posts.some((post) => post.previewStatus === "generating");

  useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [generating, router]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">{t("post.list.title")}</h1>
        <button
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[var(--studio-ink)] px-5 text-sm font-semibold text-[var(--studio-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)]"
          onClick={() => setOpen(true)}
        >
          {t("post.list.create")}
        </button>
      </div>
      {posts.length === 0 ? (
        <div className="mt-10 max-w-md">
          <h2 className="text-lg font-semibold">{t("post.list.emptyTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{t("post.list.emptyBody")}</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
      {open ? <CreatePostDialog layouts={layouts} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
