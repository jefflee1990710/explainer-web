"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import type { PublicPost } from "@/model/post";
import { useI18n } from "@/presentation/components/i18n-provider";

export function PostHistoryDialog({
  open,
  onClose,
  posts,
  activePostId,
  onSelectPost,
  onDeletePost,
}: {
  open: boolean;
  onClose: () => void;
  posts: PublicPost[];
  activePostId: string | null;
  onSelectPost: (post: PublicPost) => void;
  onDeletePost: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const host = document.getElementById("studio-dialog-root") ?? document.body;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[140] grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <h2 id={titleId} className="font-display text-xl font-bold">
            {isEn ? "Post History" : "海報貼文歷史紀錄 · Post History"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-accent-ink/20 py-14 text-center text-sm text-muted">
              {isEn ? "No generated posts yet." : "尚無生成的海報貼文紀錄。"}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {posts.map((post) => {
                const isActive = post.id === activePostId;
                return (
                  <div
                    key={post.id}
                    className={`flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-3 transition ${
                      isActive
                        ? "border-2 border-accent-ink ring-2 ring-[#c6f24b]"
                        : "border-accent-ink/15 hover:border-accent-ink/40"
                    }`}
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPost(post);
                          onClose();
                        }}
                        className="relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-xl bg-zinc-900"
                      >
                        {post.currentImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.currentImageUrl}
                            alt={post.prompt}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                            {post.status === "rendering"
                              ? isEn
                                ? "Generating…"
                                : "生成中…"
                              : isEn
                                ? "No image"
                                : "無圖片"}
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-[#c6f24b]">
                            V{Math.max(1, post.revisions.length)}
                          </span>
                          <span className="rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
                            {post.aspectRatio}
                          </span>
                        </div>
                      </button>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold text-foreground">
                        {post.prompt || (isEn ? "Untitled Post" : "未命名貼文")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {isEn
                          ? `${post.detectedElements.length} SAM elements`
                          : `已分離 ${post.detectedElements.length} 個 SAM 元素`}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-accent-ink/10">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPost(post);
                          onClose();
                        }}
                        className="cursor-pointer rounded-full bg-accent-ink px-3 py-1 text-xs font-bold text-[#c6f24b]"
                      >
                        {isEn ? "Edit in SAM" : "開啟 SAM 編輯"}
                      </button>
                      <div className="flex items-center gap-1.5">
                        {post.currentImageUrl ? (
                          <a
                            href={post.currentImageUrl}
                            download={`post-${post.id}.webp`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-accent-ink/20 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-accent-ink"
                          >
                            {isEn ? "Download" : "下載"}
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onDeletePost(post.id)}
                          className="cursor-pointer rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                        >
                          {isEn ? "Delete" : "刪除"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    host,
  );
}
