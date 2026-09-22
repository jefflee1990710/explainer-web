"use client";

import { useState } from "react";
import type { PublicProject } from "@/presentation/serialize";

export function ClipPlayer({ project }: { project: PublicProject }) {
  const clips = project.clips.filter((clip) => clip.blobUrl || clip.outputUrl);
  const [index, setIndex] = useState(0);
  const current = clips[index];
  if (!current) return null;

  const src = current.blobUrl || current.outputUrl;
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">成品播放</h2>
        <p className="text-sm text-muted">
          {index + 1} / {clips.length}
        </p>
      </div>
      <video
        key={src}
        className="mt-4 w-full rounded-xl bg-black"
        src={src}
        controls
        autoPlay
        onEnded={() => setIndex((value) => Math.min(clips.length - 1, value + 1))}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {clips.map((clip, clipIndex) => {
          return (
            <button
              key={clip.clipNumber}
              type="button"
              onClick={() => setIndex(clipIndex)}
              className={`rounded-full px-3 py-1 text-xs ${
                clipIndex === index ? "bg-accent text-white" : "border border-line"
              }`}
            >
              Clip {clip.clipNumber}
            </button>
          );
        })}
      </div>
      {src ? (
        <a href={src} download className="mt-4 inline-block text-sm underline">
          下載目前片段
        </a>
      ) : null}
    </section>
  );
}
