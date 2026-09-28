"use client";

import { useState } from "react";
import { TaskListDialog } from "@/presentation/components/app/tasks/task-list-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { TaskMeter } from "@/presentation/studio/task-meter";

// Pending count for this video, pinned to the editor dialog header.
export function VideoEditorTaskQueue({ videoId }: { videoId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <TaskMeter
        pending={0}
        videoId={videoId}
        tasksLabel={t("nav.tasks")}
        pendingLabel={t("common.pending")}
        onOpen={() => setOpen(true)}
      />
      {open ? <TaskListDialog videoId={videoId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
