"use client";

import { useEffect } from "react";
import { refreshGenerationAction } from "@/lib/actions/generation";
import type { PublicProject } from "@/lib/serialize";

const IN_FLIGHT = new Set<PublicProject["status"]>([
  "phase_a",
  "frames_generating",
  "approved",
  "generating",
]);

// Poll the server while a background job is running; stops on terminal states.
export function useProjectPoll(
  project: PublicProject | null,
  onUpdate: (project: PublicProject) => void,
  onError?: (message: string) => void,
) {
  const id = project?.id;
  const status = project?.status;

  useEffect(() => {
    if (!id || !status || !IN_FLIGHT.has(status)) return;
    // Storyboard writing is quick; image and video generation are slower.
    const interval =
      status === "generating" ? 4000 : status === "frames_generating" ? 3000 : 2500;
    let cancelled = false;

    const timer = window.setInterval(() => {
      void refreshGenerationAction(id).then((result) => {
        if (cancelled) return;
        if (result.ok) onUpdate(result.project);
        else onError?.(result.error);
      });
    }, interval);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, status, onUpdate, onError]);
}

export function isInFlight(status: PublicProject["status"] | undefined) {
  return Boolean(status && IN_FLIGHT.has(status));
}
