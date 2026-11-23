"use client";

import { useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { OutputListItem, OutputMediaKind } from "@/service/output/items";

type KindFilter = "all" | OutputMediaKind;

// Finished image, video, and audio files, one row each, with a preview.
export function OutputList({ items }: { items: OutputListItem[] }) {
  const { locale } = useI18n();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const [filter, setFilter] = useState<KindFilter>("all");
  const [preview, setPreview] = useState<OutputListItem | null>(null);
  const visible = filter === "all" ? items : items.filter((item) => item.kind === filter);
  const kindLabel = (kind: OutputMediaKind) =>
    kind === "video" ? (isZh ? "影片" : "Video") : kind === "audio" ? (isZh ? "音訊" : "Audio") : isZh ? "圖片" : "Image";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--studio-ink)]">Output</h1>
        <p className="mt-2 text-sm text-[var(--studio-muted)]">
          {isZh ? "這個帳號已完成的圖片、影片和音訊。" : "Finished images, videos, and audio for this account."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={isZh ? "類型" : "Type"}>
        {(
          [
            ["all", isZh ? "全部" : "All"],
            ["image", isZh ? "圖片" : "Image"],
            ["video", isZh ? "影片" : "Video"],
            ["audio", isZh ? "音訊" : "Audio"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
              filter === id
                ? "bg-[#c6f24b] text-[#12141c]"
                : "bg-[var(--studio-fill)] text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--studio-line)] bg-[var(--studio-panel)] px-4 py-10 text-center text-sm text-[var(--studio-muted)]">
          {isZh ? "還沒有完成的成果。" : "No finished results yet."}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)]">
          {visible.map((item) => {
            const time = new Date(item.createdAt).toLocaleString(locale, {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-[var(--studio-line)] px-3 py-2.5 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setPreview(item)}
                  className="grid h-14 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border border-[var(--studio-line)] bg-[var(--studio-canvas)]"
                >
                  <OutputThumb item={item} />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setPreview(item)}
                    className="line-clamp-1 cursor-pointer text-left text-sm font-semibold text-[var(--studio-ink)] hover:underline"
                  >
                    {item.title}
                  </button>
                  <p className="text-xs text-[var(--studio-muted)]">
                    {kindLabel(item.kind)} ·{" "}
                    <time dateTime={item.createdAt} suppressHydrationWarning>
                      {time}
                    </time>
                  </p>
                </div>
                <a
                  href={item.url}
                  download
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--studio-ink)] hover:bg-[var(--studio-fill)]"
                >
                  {isZh ? "下載" : "Download"}
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {preview ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={preview.title}
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--studio-line)] px-4 py-3">
              <p className="min-w-0 truncate text-sm font-semibold text-[var(--studio-ink)]">{preview.title}</p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-[var(--studio-muted)] hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)]"
              >
                {isZh ? "關閉" : "Close"}
              </button>
            </div>
            <div className="grid max-h-[70vh] place-items-center bg-black p-3">
              <OutputPreview item={preview} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OutputThumb({ item }: { item: OutputListItem }) {
  if (item.kind === "video") {
    return <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-contain" />;
  }
  if (item.kind === "audio") {
    return <span className="text-[10px] font-bold tracking-wide text-[var(--studio-muted)]">AUDIO</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt="" loading="lazy" className="h-full w-full object-contain" />
  );
}

function OutputPreview({ item }: { item: OutputListItem }) {
  if (item.kind === "video") {
    return <video src={item.url} controls autoPlay className="max-h-[64vh] w-full" />;
  }
  if (item.kind === "audio") {
    return <audio src={item.url} controls autoPlay className="w-full" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt="" className="max-h-[64vh] w-full object-contain" />
  );
}
