"use client";

import { useEffect, useRef, useState } from "react";
import { readCachedTasks } from "@/presentation/components/app/tasks/task-cache";
import { listTasksOnce } from "@/presentation/components/app/tasks/task-fetch";
import type { PublicTask } from "@/service/generation/task-list";

const POLL_MS = 5_000;

// Refresh the task list every few seconds while mounted.
export function useTaskPoll(initial: PublicTask[], videoId?: string, enabled = true) {
  const cached = readCachedTasks(videoId);
  const [tasks, setTasks] = useState(cached ?? initial);
  const [error, setError] = useState("");
  // Cache or SSR seed means the dialog can paint rows before the next fetch.
  const [loaded, setLoaded] = useState(Boolean(cached) || initial.length > 0);
  // True while a request is out; slow responses skip the next tick instead of piling up.
  const inFlight = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    async function tick() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await listTasksOnce(videoId);
        if (!alive) return;
        setLoaded(true);
        if (result.ok) {
          setTasks(result.tasks);
          setError("");
        } else {
          setError(result.error);
        }
      } finally {
        inFlight.current = false;
      }
    }
    void tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [videoId, enabled]);
  return { tasks, error, loaded };
}
