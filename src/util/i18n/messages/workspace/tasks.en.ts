import type { MessageShape } from "@/util/i18n/messages/workspace/message-shape";

export const tasksPageEn = {
  title: "Generation tasks",
  active: "{n} tasks in progress · updates every 5s",
  empty: "No tasks in progress",
  attempt: " · attempt {n}",
  stage: {
    queued: "Queued",
    sending: "Sending",
    generating: "Generating",
    done: "Done",
    failed: "Failed",
  },
  detail: {
    characterStill: "Character still",
    characterBlueprint: "Character blueprint",
    characterProfile: "Character profile",
    stylePreview: "Style preview",
    directorPreview: "Director preview",
    postPreview: "Poster preview",
    reelCover: "Video cover",
    clipVideo: "Clip {n} · video",
    clipFrameStart: "Clip {n} · start frame",
    clipFrameEnd: "Clip {n} · end frame",
    reel: "Final reel",
  },
  doneToast: "{detail} is ready",
  failedToast: "{detail} failed",
  loadFailed: "Could not load tasks",
  clock: {
    started: "Started",
    elapsed: "Elapsed",
    took: "Took",
    elapsedHms: "{h}h {m}m {s}s",
    elapsedMs: "{m}m {s}s",
    elapsedS: "{s}s",
  },
  videoDialog: {
    title: "Tasks for this video",
    refreshingPending: "Refreshing… {n} in progress",
    refreshing: "Refreshing…",
    pending: "{n} in progress",
    idle: "No tasks in progress",
    loading: "Loading…",
  },
} as const;


export type TasksPageMessages = MessageShape<typeof tasksPageEn>;
