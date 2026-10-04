import type { TasksPageMessages } from "@/util/i18n/messages/workspace/tasks.en";

export const tasksPageZhHant = {
  title: "生成任務",
  active: "{n} 個任務進行中，每 5 秒更新",
  empty: "沒有進行中的任務",
  attempt: " · 第 {n} 次嘗試",
  stage: {
    queued: "排隊中",
    sending: "送出中",
    generating: "生成中",
    done: "完成",
    failed: "失敗",
  },
  detail: {
    characterStill: "角色定裝圖",
    characterBlueprint: "角色藍圖",
    stylePreview: "風格預覽",
    reelCover: "成片封面",
    clipVideo: "Clip {n} · 影片",
    clipFrameStart: "Clip {n} · 起始畫格",
    clipFrameEnd: "Clip {n} · 結尾畫格",
    reel: "成片合成",
  },
  doneToast: "{detail} 完成",
  failedToast: "{detail} 失敗",
  loadFailed: "讀取任務失敗",
  clock: {
    started: "開始",
    elapsed: "已過",
    took: "耗時",
    elapsedHms: "{h} 小時 {m} 分 {s} 秒",
    elapsedMs: "{m} 分 {s} 秒",
    elapsedS: "{s} 秒",
  },
  videoDialog: {
    title: "這支影片的生成任務",
    refreshingPending: "更新中… {n} 個進行中",
    refreshing: "更新中…",
    pending: "{n} 個進行中",
    idle: "沒有進行中的任務",
    loading: "載入中…",
  },
} satisfies TasksPageMessages;
