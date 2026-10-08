"use client";

import { useEffect } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  armBrowserNotifications,
  showBrowserGenerationNotice,
} from "@/presentation/components/app/tasks/browser-generation-notice";
import { taskNoticeTag } from "@/presentation/components/app/tasks/generation-notice-tag";
import { subscribeGenerationSettled } from "@/presentation/components/app/tasks/task-signal";

// OS notification when a background image or video job finishes. No in-app toast.
export function GenerationDoneNotifier() {
  const { t } = useI18n();

  useEffect(() => {
    let asked = false;
    function arm() {
      if (asked) return;
      asked = true;
      armBrowserNotifications();
    }
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  useEffect(() => {
    return subscribeGenerationSettled((tasks) => {
      for (const task of tasks) {
        const detail = t(task.detailKey, task.detailParams);
        const title =
          task.stage === "failed"
            ? t("tasksPage.failedToast", { detail })
            : t("tasksPage.doneToast", { detail });
        void showBrowserGenerationNotice({
          tag: taskNoticeTag(task),
          title,
          body: task.stage === "failed" && task.error ? task.error : task.title,
          href: task.href,
        });
      }
    });
  }, [t]);

  return null;
}
