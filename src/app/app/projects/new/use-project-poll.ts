"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { refreshGenerationAction } from "@/lib/actions/generation";
import { getProjectAction } from "@/lib/actions/projects";
import type { PublicVideo } from "@/lib/serialize";

const IN_FLIGHT = new Set<PublicVideo["status"]>([
  "phase_a",
  "frames_generating",
  "approved",
  "generating",
]);

const NEEDS_JOB_REFRESH = new Set<PublicVideo["status"]>([
  "frames_generating",
  "generating",
]);

// Poll the selected video while a background job is running; stops on terminal states.
export function useProjectPoll(
  project: PublicVideo | null,
  onUpdate: (project: PublicVideo) => void,
  onError?: (message: string) => void,
) {
  const router = useRouter();
  const id = project?.id;
  const status = project?.status;

  useEffect(() => {
    if (!id || !status || !IN_FLIGHT.has(status)) return;
    // Storyboard writing is quick; image and video generation are slower.
    const interval =
      status === "generating" ? 4000 : status === "frames_generating" ? 3000 : 2500;
    let cancelled = false;

    const timer = window.setInterval(() => {
      void (async () => {
        // Higgsfield jobs only advance when refreshProjectJobs runs.
        if (NEEDS_JOB_REFRESH.has(status)) {
          const refreshed = await refreshGenerationAction(id);
          if (cancelled) return;
          if (!refreshed.ok) {
            onError?.(refreshed.error);
            return;
          }
        }

        const result = await getProjectAction(id);
        if (cancelled) return;
        if (result.ok) {
          onUpdate(result.project);
          router.refresh();
        } else {
          onError?.(result.error);
        }
      })();
    }, interval);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, status, onUpdate, onError, router]);
}

export function isInFlight(status: PublicVideo["status"] | undefined) {
  return Boolean(status && IN_FLIGHT.has(status));
}
