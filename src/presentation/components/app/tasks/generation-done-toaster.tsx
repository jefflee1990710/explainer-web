"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { armNotificationSound, playNotificationChime } from "@/presentation/components/notification-chime";
import { ToastStack, useToasts } from "@/presentation/components/toast-stack";
import { subscribeGenerationSettled } from "@/presentation/components/app/tasks/task-signal";
import type { PublicTask } from "@/service/generation/task-list";

// App-wide toast when a background image or video job finishes.
export function GenerationDoneToaster() {
  const { t } = useI18n();
  const { toasts, push, dismiss } = useToasts();
  const announced = useRef(new Set<string>());

  useEffect(() => {
    function arm() {
      armNotificationSound();
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
      let play = false;
      for (const task of tasks) {
        if (announced.current.has(task.id)) continue;
        announced.current.add(task.id);
        push(toastFor(task, t));
        if (task.stage === "done") play = true;
      }
      if (play) playNotificationChime();
    });
  }, [push, t]);

  return <ToastStack toasts={toasts} onDismiss={dismiss} />;
}

function toastFor(task: PublicTask, t: ReturnType<typeof useI18n>["t"]) {
  const detail = t(task.detailKey, task.detailParams);
  const failed = task.stage === "failed";
  return {
    tone: failed ? ("error" as const) : ("success" as const),
    title: failed ? t("tasksPage.failedToast", { detail }) : t("tasksPage.doneToast", { detail }),
    media:
      !failed && task.previewUrl
        ? { kind: task.isVideo ? ("video" as const) : ("image" as const), url: task.previewUrl }
        : undefined,
  };
}
