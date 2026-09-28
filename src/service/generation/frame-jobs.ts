import type { ObjectId } from "mongodb";
import type { NewJob } from "@/service/generation/task-store";
import type { FrameSubmitTarget } from "@/service/higgsfield/clip-keyframes";

// A waiting end job must never be claimed by the cron; the start's completion
// moves `nextAttemptAt` back to now and kicks it.
export const WAIT_FOR_START = new Date("2100-01-01T00:00:00.000Z");

// Job docs for one click: ready stills go out now, ends without a start file
// are queued too (so the task list shows both) but wait for the start.
export function frameJobDocs(
  projectId: ObjectId,
  ready: FrameSubmitTarget[],
  deferred: FrameSubmitTarget[],
  now = new Date(),
): NewJob[] {
  const base = (target: FrameSubmitTarget) => ({
    projectId,
    clipIndex: target.clipNumber - 1,
    kind: "frame" as const,
    framePosition: target.position,
  });
  return [
    ...ready.map((target) => ({ ...base(target), nextAttemptAt: now })),
    ...deferred.map((target) => ({
      ...base(target),
      awaits: "start" as const,
      nextAttemptAt: WAIT_FOR_START,
    })),
  ];
}
