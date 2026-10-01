"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { refreshGenerationAction } from "@/presentation/actions/generation";
import { getProjectAction } from "@/presentation/actions/projects";
import { subscribeProjectRefresh } from "@/presentation/components/app/tasks/task-signal";
import { isProjectBusy } from "@/service/clip-stage";
import { isReelBusy } from "@/service/reel/fingerprint";
import { isFinalRunning } from "@/service/video-edit/edit-state";
import type { PublicVideo } from "@/presentation/serialize";

const INTERVAL_MS = 2500;

// Poll while the director writes, a frame/video job is in flight, the
// reel is concatenating, or the branded export is rendering. Provider
// refresh is skipped for reel-only waits.
// Each tick pushes the freshest project into React state so tiles / timeline
// flip off "生成中" as soon as webhook or status refresh settles a job.
export function useProjectPoll(
  project: PublicVideo | null,
  onUpdate: (project: PublicVideo) => void,
  onError?: (message: string) => void,
) {
  const router = useRouter();
  const id = project?.id;
  const status = project?.status;
  const clipBusy = project ? isProjectBusy(project) : false;
  const reelBusy = project ? isReelBusy(project.reelStatus) || isFinalRunning(project) : false;
  const busy = clipBusy || reelBusy;

  useEffect(() => {
    if (!id || !busy) return;
    const needsJobRefresh = clipBusy && status !== "phase_a";
    let cancelled = false;
    // A slow refresh skips the next tick instead of stacking requests.
    let inFlight = false;

    async function tick() {
      if (inFlight) return;
      inFlight = true;
      try {
        await refresh();
      } finally {
        inFlight = false;
      }
    }

    async function refresh() {
      let next: PublicVideo | null = null;

      if (needsJobRefresh) {
        const refreshed = await refreshGenerationAction(id!);
        if (cancelled) return;
        if (!refreshed.ok) {
          onError?.(refreshed.error);
          return;
        }
        // Prefer the post-refresh snapshot so the UI updates in the same tick
        // the provider status landed (no extra round-trip before paint).
        next = refreshed.project;
      } else {
        const result = await getProjectAction(id!);
        if (cancelled) return;
        if (!result.ok) {
          onError?.(result.error);
          return;
        }
        next = result.project;
      }

      if (!next) return;
      onUpdate(next);
      // Settled: refresh the server render so lists/badges catch up.
      if (!isProjectBusy(next) && !isReelBusy(next.reelStatus) && !isFinalRunning(next)) {
        router.refresh();
      }
    }

    void tick();
    const timer = window.setInterval(() => void tick(), INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, status, busy, clipBusy, onUpdate, onError, router]);

  // The task list is what lands a finished file. The editor may already
  // look idle (old still still on screen), so reload that video when its
  // background job settles.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let inFlight = false;
    let dirty = false;

    async function pull() {
      if (inFlight) {
        dirty = true;
        return;
      }
      inFlight = true;
      try {
        const result = await getProjectAction(id!);
        if (cancelled || !result.ok) return;
        onUpdate(result.project);
      } finally {
        inFlight = false;
      }
      if (dirty && !cancelled) {
        dirty = false;
        await pull();
      }
    }

    const unsubscribe = subscribeProjectRefresh((videoId) => {
      if (videoId === id) void pull();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id, onUpdate]);
}
