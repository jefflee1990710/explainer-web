"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { refreshGenerationAction } from "@/presentation/actions/generation";
import type { PublicVideoCard } from "@/presentation/serialize";

const INTERVAL_MS = 4000;

// Keep list tags current while a storyboard or a clip scene/video is in flight.
export function useFolderGenerationPoll(videos: PublicVideoCard[], enabled: boolean) {
  const router = useRouter();
  const jobIds = videos
    .filter((video) => video.tags.some((tag) => tag.state === "busy"))
    .map((video) => video.id)
    .join(",");
  const phaseA = videos.some((video) => video.status === "phase_a");

  useEffect(() => {
    if (!enabled || (!jobIds && !phaseA)) return;
    const ids = jobIds ? jobIds.split(",") : [];
    let cancelled = false;
    let inFlight = false;

    async function tick() {
      if (inFlight) return;
      inFlight = true;
      try {
        if (ids.length) await Promise.all(ids.map((id) => refreshGenerationAction(id)));
        if (!cancelled) router.refresh();
      } finally {
        inFlight = false;
      }
    }

    void tick();
    const timer = window.setInterval(() => void tick(), INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, jobIds, phaseA, router]);
}
