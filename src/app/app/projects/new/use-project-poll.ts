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

// Poll the selected video while a background job is running; first tick is immediate.
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
    const interval =
      status === "generating" ? 4000 : status === "frames_generating" ? 3000 : 2500;
    let cancelled = false;

    async function tick() {
      if (NEEDS_JOB_REFRESH.has(status!)) {
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
        if (!IN_FLIGHT.has(result.project.status)) router.refresh();
      } else {
        onError?.(result.error);
      }
    }

    void tick();
    const timer = window.setInterval(() => void tick(), interval);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, status, onUpdate, onError, router]);
}

export function isInFlight(status: PublicVideo["status"] | undefined) {
  return Boolean(status && IN_FLIGHT.has(status));
}
