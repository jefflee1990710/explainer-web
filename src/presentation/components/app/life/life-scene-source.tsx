"use client";

import type { LifeSceneHit } from "@/service/character/life-prompt";

// Search hits or one uploaded photo. Either one becomes the scene reference.
export function LifeSceneSource({
  mode,
  hits,
  selectedUrl,
  uploadUrl,
  onPick,
}: {
  mode: "search" | "upload";
  hits: LifeSceneHit[];
  selectedUrl: string;
  uploadUrl: string;
  onPick: (url: string) => void;
}) {
  const items = mode === "upload" && uploadUrl ? [{ title: "upload", thumbUrl: uploadUrl }] : hits;
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((hit) => {
        const active = hit.thumbUrl === selectedUrl;
        return (
          <button
            key={hit.thumbUrl}
            type="button"
            onClick={() => onPick(hit.thumbUrl)}
            className={`cursor-pointer overflow-hidden rounded-xl border ${
              active ? "border-accent-ink" : "border-accent-ink/10"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hit.thumbUrl} alt="" className="aspect-square w-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}
