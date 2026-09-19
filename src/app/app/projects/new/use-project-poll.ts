"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { refreshGenerationAction } from "@/lib/actions/generation";
import { getProjectAction } from "@/lib/actions/projects";
import { isProjectBusy } from "@/lib/clip-stage";
import { isReelBusy } from "@/lib/reel/fingerprint";
import type { PublicVideo } from "@/lib/serialize";

const INTERVAL_MS = 3000;

// Poll while the director writes, a frame/video job is in flight, or the
// reel is concatenating. Provider refresh is skipped for reel-only waits.
export function useProjectPoll(
  project: PublicVideo | null,
  onUpdate: (project: PublicVideo) => void,
  onError?: (message: string) => void,
) {
  const router = useRouter();
  const id = project?.id;
  const status = project?.status;
  const clipBusy = project ? isProjectBusy(project) : false;
  const reelBusy = project ? isReelBusy(project.reelStatus) : false;
  const busy = clipBusy || reelBusy;

  useEffect(() => {
    if (!id || !busy) return;
    const needsJobRefresh = clipBusy && status !== "phase_a";
    let cancelled = false;

    async function tick() {
      if (needsJobRefresh) {
        const refreshed = await refreshGenerationAction(id!);
        if (cancelled) return;
        if (!refreshed.ok) {
          onError?.(refreshed.error);
          return;
        }
      }

      const result = await getProjectAction(id!);
      if (cancelled) return;
      if (result.ok) {
        onUpdate(result.project);
        // Settled: refresh the server render so lists/badges catch up.
        if (!isProjectBusy(result.project) && !isReelBusy(result.project.reelStatus)) {
          router.refresh();
        }
      } else {
        onError?.(result.error);
      }
    }

    void tick();
    const timer = window.setInterval(() => void tick(), INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, status, busy, clipBusy, onUpdate, onError, router]);
}
