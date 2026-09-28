"use client";

import { useState } from "react";
import { readCachedTasks } from "@/presentation/components/app/tasks/task-cache";
import { TaskListDialog } from "@/presentation/components/app/tasks/task-list-dialog";
import { useTaskPoll } from "@/presentation/components/app/tasks/use-task-poll";
import { useI18n } from "@/presentation/components/i18n-provider";
import { TaskMeter } from "@/presentation/studio/task-meter";

// Pending count for this video, pinned to the editor dialog header.
export function VideoEditorTaskQueue({ videoId }: { videoId: string }) {
  const { t } = useI18n();
  const { tasks, error, loaded } = useTaskPoll(readCachedTasks(videoId) ?? [], videoId);
  const [open, setOpen] = useState(false);
  const pending = tasks.filter((task) => task.stage !== "done" && task.stage !== "failed").length;
  return (
    <>
      <TaskMeter
        pending={pending}
        poll={false}
        videoId={videoId}
        tasksLabel={t("nav.tasks")}
        pendingLabel={t("common.pending")}
        onOpen={() => setOpen(true)}
      />
      {open ? (
        <TaskListDialog
          videoId={videoId}
          tasks={tasks}
          loaded={loaded}
          error={error}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
