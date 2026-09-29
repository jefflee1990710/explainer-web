"use client";

import { useEffect, useRef, useState } from "react";

type ShowcaseCardProps = {
  src: string;
  poster: string;
  widthClass: string;
  aspectClass: string;
  useLabel: string;
  aspect: string;
  styleLabel: string;
  topic: string;
};

// Plays the clip when the file is present. Until then the poster stays up.
export function LandingShowcaseCard({
  src,
  poster,
  widthClass,
  aspectClass,
  useLabel,
  aspect,
  styleLabel,
  topic,
}: ShowcaseCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [play, setPlay] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hide = () => setPlay(false);
    video.addEventListener("error", hide);
    if (video.error) hide();
    return () => video.removeEventListener("error", hide);
  }, []);

  return (
    <article className={`shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ${widthClass}`}>
      <div className="flex flex-col">
        <div className={`relative bg-zinc-100 ${aspectClass}`}>
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {play ? (
            <video
              ref={videoRef}
              src={src}
              poster={poster}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              controls
              onError={() => setPlay(false)}
            />
          ) : null}
        </div>
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {useLabel} · {aspect}
          </p>
          <h3 className="mt-1 font-semibold text-zinc-900">{styleLabel}</h3>
          <p className="text-sm text-zinc-600">{topic}</p>
        </div>
      </div>
    </article>
  );
}
