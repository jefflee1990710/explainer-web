"use client";

import { VideoEditorTaskQueue } from "@/presentation/components/app/projects/[id]/video-editor-task-queue";

// Pending generation tasks in the video editor dialog header.
export function VideoEditorHeaderStatus({ videoId }: { videoId: string }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <VideoEditorTaskQueue videoId={videoId} />
    </div>
  );
}
