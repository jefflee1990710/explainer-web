"use client";

// Reads duration, pixel size, and in-point from a video URL in the browser.

import { useEffect, useState } from "react";
import type { SourceVideoMeasure } from "@/app/app/canvas/nodes/source-video-section";

export function useSourceVideoProbe(url: string | undefined): SourceVideoMeasure | null {
  const [probe, setProbe] = useState<{ url: string; measure: SourceVideoMeasure } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.preload = "metadata";
    const publish = (measure: SourceVideoMeasure) => {
      if (!cancelled) setProbe({ url, measure });
    };
    const finish = () => {
      const start = video.seekable.length > 0 ? video.seekable.start(0) : 0;
      const duration = video.duration;
      publish({
        ...(Number.isFinite(duration) && duration > 0 ? { durationSeconds: duration } : {}),
        ...(video.videoWidth > 0 ? { width: video.videoWidth } : {}),
        ...(video.videoHeight > 0 ? { height: video.videoHeight } : {}),
        ...(Number.isFinite(start) ? { inPointSeconds: start } : {}),
      });
    };
    const fail = () => publish({});
    video.addEventListener("loadedmetadata", finish);
    video.addEventListener("error", fail);
    video.src = url;
    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", finish);
      video.removeEventListener("error", fail);
      video.removeAttribute("src");
      video.load();
    };
  }, [url]);

  if (!url || probe?.url !== url) return null;
  return probe.measure;
}
