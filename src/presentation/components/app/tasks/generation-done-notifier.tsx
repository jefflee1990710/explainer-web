"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/presentation/components/i18n-provider";
import { subscribeGenerationSettled } from "@/presentation/components/app/tasks/task-signal";
import type { PublicTask } from "@/service/generation/task-list";

// Ask once, on a click or key press. Browsers ignore permission prompts that are not tied to a gesture.
function armBrowserNotifications() {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  void Notification.requestPermission();
}

function showGenerationNotice(task: PublicTask, title: string, open: (href: string) => void) {
  const failed = task.stage === "failed";
  const icon = !failed && task.previewUrl && !task.isVideo ? task.previewUrl : undefined;
  const notice = new Notification(title, {
    body: failed && task.error ? task.error : task.title,
    icon,
    tag: task.id,
  });
  notice.onclick = () => {
    window.focus();
    notice.close();
    if (task.href) open(task.href);
  };
}

// OS notification when a background image or video job finishes. No in-app toast.
export function GenerationDoneNotifier() {
  const { t } = useI18n();
  const router = useRouter();
  const announced = useRef(new Set<string>());

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
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      for (const task of tasks) {
        if (announced.current.has(task.id)) continue;
        announced.current.add(task.id);
        const detail = t(task.detailKey, task.detailParams);
        const title =
          task.stage === "failed"
            ? t("tasksPage.failedToast", { detail })
            : t("tasksPage.doneToast", { detail });
        showGenerationNotice(task, title, (href) => router.push(href));
      }
    });
  }, [router, t]);

  return null;
}
