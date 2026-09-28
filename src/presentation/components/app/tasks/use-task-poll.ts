"use client";

import { useEffect, useRef, useState } from "react";
import { listTasksAction } from "@/presentation/actions/tasks";
import type { PublicTask } from "@/service/generation/task-list";

const POLL_MS = 5_000;

// Refresh the task list every few seconds while mounted.
export function useTaskPoll(initial: PublicTask[], videoId?: string) {
  const [tasks, setTasks] = useState(initial);
  const [error, setError] = useState("");
  // False until the first server response lands (lets callers show a spinner).
  const [loaded, setLoaded] = useState(initial.length > 0);
  // True while a request is out; slow responses skip the next tick instead of piling up.
  const inFlight = useRef(false);
  useEffect(() => {
    let alive = true;
    async function tick() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await listTasksAction(videoId);
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
  }, [videoId]);
  return { tasks, error, loaded };
}
