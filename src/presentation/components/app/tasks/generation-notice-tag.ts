import type { PublicTask } from "@/service/generation/task-list";

// One tag per finished still or clip, shared by the editor poll and the task list.
export function frameNoticeTag(videoId: string, clipNumber: number, position: string) {
  return `gen:frame:${videoId}:${clipNumber}:${position}`;
}

export function videoNoticeTag(videoId: string, clipNumber: number) {
  return `gen:video:${videoId}:${clipNumber}`;
}

export function taskNoticeTag(task: PublicTask) {
  const clipNumber = Number(task.detailParams?.n);
  if (task.videoId && task.kind === "video" && clipNumber) {
    return videoNoticeTag(task.videoId, clipNumber);
  }
  if (task.videoId && task.kind === "frame" && clipNumber) {
    const position = task.detailKey.endsWith("clipFrameEnd") ? "end" : "start";
    return frameNoticeTag(task.videoId, clipNumber, position);
  }
  return `gen:task:${task.id}`;
}
