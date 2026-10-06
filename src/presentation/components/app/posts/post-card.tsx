"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/presentation/components/i18n-provider";
import { retryPostPreviewAction } from "@/presentation/actions/posts";
import type { PublicPost } from "@/model/post-layers";

// One poster in the list. The card opens the editor; retry stays on the list.
export function PostCard({ post }: { post: PublicPost }) {
  const { t } = useI18n();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const image = post.thumbnailUrl || post.previewUrl;
  const headline = post.layers.find((layer) => layer.type === "text" && layer.text.trim());
  const title = headline && headline.type === "text" ? headline.text : t("post.list.untitled");
  const failed = post.previewStatus === "failed" && !post.thumbnailUrl;

  async function retry() {
    setRetrying(true);
    await retryPostPreviewAction(post.id);
    setRetrying(false);
    router.refresh();
  }

  return (
    <article className="flex flex-col gap-2">
      <Link
        href={`/app/posts/${post.id}`}
        className="block overflow-hidden rounded-2xl bg-[var(--studio-fill)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)]"
      >
        <div className="relative aspect-[2/3] w-full">
          {image ? (
            // The poster is the content of the card.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div
              className={`grid h-full place-items-center bg-[var(--studio-fill)] text-sm text-muted motion-reduce:animate-none ${
                post.previewStatus === "generating" ? "animate-pulse" : ""
              }`}
            >
              {post.previewStatus === "generating" ? t("post.list.generating") : t("post.list.failed")}
            </div>
          )}
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{title}</p>
        {failed ? (
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full px-3 text-sm font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-teal)] disabled:opacity-50"
            disabled={retrying}
            onClick={() => void retry()}
          >
            {t("post.list.retry")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
