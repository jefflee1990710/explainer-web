"use client";

import { useEffect, useRef, useState } from "react";

// Public Instagram embed for a Reel or post permalink. Keeps the preview on the Academy page.
export function instagramEmbedSrc(permalink: string): string | null {
  const match = permalink.match(/https:\/\/www\.instagram\.com\/(p|reel)\/([^/?#]+)/);
  const kind = match?.[1];
  const code = match?.[2];
  if (!kind || !code) return null;
  return `https://www.instagram.com/${kind}/${code}/embed/?hidecaption=true`;
}

function measureHeight(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const details = (data as { details?: { height?: unknown } }).details;
  const height = details?.height;
  return typeof height === "number" && height >= 240 && height <= 900 ? height : null;
}

export function AcademyInstagramPreview({ url, title }: { url: string; title: string }) {
  const src = instagramEmbedSrc(url);
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(560);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://www.instagram.com") return;
      if (event.source !== frame.current?.contentWindow) return;
      const payload = typeof event.data === "string" ? parseMessage(event.data) : event.data;
      const next = measureHeight(payload);
      if (next) setHeight(next);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!src) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
      <iframe
        ref={frame}
        src={src}
        title={title}
        loading="lazy"
        className="w-full bg-white"
        style={{ height }}
        allow="encrypted-media; picture-in-picture; fullscreen"
      />
    </div>
  );
}

function parseMessage(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
