"use client";

import { useEffect, useRef, useState } from "react";
import {
  mergeOptimisticTasks,
  readOptimisticTasks,
} from "@/presentation/components/app/tasks/optimistic-tasks";
import { readCachedTasks } from "@/presentation/components/app/tasks/task-cache";
import { listTasksOnce } from "@/presentation/components/app/tasks/task-fetch";
import { isTaskRefreshing, subscribeTaskRefresh } from "@/presentation/components/app/tasks/task-refresh";
import { subscribeTaskChanges } from "@/presentation/components/app/tasks/task-signal";
import type { PublicTask } from "@/service/generation/task-list";

const POLL_MS = 5_000;

// Refresh the task list every few seconds while mounted.
export function useTaskPoll(initial: PublicTask[], videoId?: string, enabled = true) {
  const cached = readCachedTasks(videoId);
  const [tasks, setTasks] = useState(() =>
    mergeOptimisticTasks(cached ?? initial, readOptimisticTasks(videoId)),
  );
  const [error, setError] = useState("");
  // Cache or SSR seed means the dialog can paint rows before the next fetch.
  const [loaded, setLoaded] = useState(Boolean(cached) || initial.length > 0);
  const [refreshing, setRefreshing] = useState(false);
  // True while a request is out; slow responses skip the next tick instead of piling up.
  const inFlight = useRef(false);

  useEffect(() => {
    return subscribeTaskRefresh(() => {
      setRefreshing(isTaskRefreshing() || inFlight.current);
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    // A change signal that arrives mid-request queues one more fetch.
    let dirty = false;
    function paint() {
      setTasks((current) => mergeOptimisticTasks(current, readOptimisticTasks(videoId)));
    }
    async function tick(advance: boolean) {
      if (inFlight.current) {
        dirty = true;
        return;
      }
      inFlight.current = true;
      setRefreshing(true);
      try {
        const result = await listTasksOnce(videoId, { advance });
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
      if (dirty && alive) {
        dirty = false;
        await tick(advance);
        return;
      }
      if (alive) setRefreshing(isTaskRefreshing());
    }
    void tick(false);
    const timer = window.setInterval(() => void tick(true), POLL_MS);
    // Paint the click-time queue first, then fetch without waiting on provider refresh.
    const unsubscribe = subscribeTaskChanges(() => {
      paint();
      void tick(false);
    });
    return () => {
      alive = false;
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [videoId, enabled]);
  return { tasks, error, loaded, refreshing };
}
