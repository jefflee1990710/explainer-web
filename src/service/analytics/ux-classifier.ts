// Pure UX funnel & drop-off classifier used by `/scroadmin/analytics` and unit tests.

export type UserJourneySnapshot = {
  clerkUserId: string;
  email: string;
  name: string;
  credits: number;
  hasAcceptedLegal: boolean;
  folderCount: number;
  characterCount: number;
  completedCharacterCount: number;
  lifeShotCount: number;
  videoCount: number;
  storyboardReadyCount: number;
  keyframeReadyCount: number;
  clipVideoReadyCount: number;
  reelReadyCount: number;
  failedJobCount: number;
  creditBlockCount: number;
  lastPath?: string | null;
  lastEvent?: string | null;
  createdAt: Date;
  lastActiveAt: Date;
};

export type StuckStageId =
  | "stuck_legal_terms"
  | "blocked_insufficient_credits"
  | "blocked_generation_failed"
  | "stuck_no_first_action"
  | "stuck_character_not_completed"
  | "stuck_character_only_no_video_or_life"
  | "stuck_before_storyboard"
  | "stuck_storyboard_no_keyframes"
  | "stuck_keyframes_no_clip"
  | "activated_producing";

export type StuckStageClassification = {
  stageId: StuckStageId;
  title: string;
  reason: string;
  recommendation: string;
  severity: "high" | "medium" | "low" | "healthy";
};

export type FunnelStepMetric = {
  stepId: string;
  label: string;
  userCount: number;
  conversionFromTopPercent: number;
  conversionFromPrevPercent: number;
  dropOffCount: number;
  dropOffPercent: number;
};

// Minimum credits needed to generate one image/frame in the studio.
const MIN_ACTIONABLE_CREDITS = 5;

// Classify why a specific user stopped progressing or whether they are actively producing.
export function classifyUserStuckStage(
  snapshot: UserJourneySnapshot,
): StuckStageClassification {
  const hasProducedOutput =
    snapshot.clipVideoReadyCount > 0 ||
    snapshot.reelReadyCount > 0 ||
    snapshot.lifeShotCount > 0;

  if (!snapshot.hasAcceptedLegal) {
    return {
      stageId: "stuck_legal_terms",
      title: "卡在條款同意頁 (Legal Acceptance)",
      reason: "註冊後尚未完成服務條款與隱私權同意，無法進入 Studio。",
      recommendation: "簡化條款確認步驟或在註冊表單直接整合勾選。",
      severity: "high",
    };
  }

  if (
    !hasProducedOutput &&
    (snapshot.credits < MIN_ACTIONABLE_CREDITS || snapshot.creditBlockCount > 0)
  ) {
    return {
      stageId: "blocked_insufficient_credits",
      title: "點數不足阻斷 (Out of Credits)",
      reason: `剩餘 ${snapshot.credits} 點（或曾觸發點數不足彈窗 ${snapshot.creditBlockCount} 次），無法繼續生成分鏡圖或影片。`,
      recommendation: "檢查免費用戶初始點數是否足夠完成第一支短片，或提供首支影片體驗額度。",
      severity: "high",
    };
  }

  if (!hasProducedOutput && snapshot.failedJobCount > 0) {
    return {
      stageId: "blocked_generation_failed",
      title: "生成任務失敗阻斷 (Generation Error)",
      reason: `遇到 ${snapshot.failedJobCount} 次圖片或影片生成失敗，且尚未成功產出成品。`,
      recommendation: "檢查失敗的 GenerationJob 錯誤訊息（API 超時或安全過濾）並主動重試或通知用戶。",
      severity: "high",
    };
  }

  const totalActions =
    snapshot.characterCount + snapshot.videoCount + snapshot.lifeShotCount;

  if (totalActions === 0) {
    return {
      stageId: "stuck_no_first_action",
      title: "進入工作台但未建立角色或影片 (No First Action)",
      reason: "已完成註冊與條款，但 0 個自訂角色、0 支影片、0 張 Life 照片。",
      recommendation: "首頁工作台缺乏明確的單一「一鍵體驗範例」引導，建議加入預設腳本一鍵生成。",
      severity: "high",
    };
  }

  if (
    snapshot.characterCount > 0 &&
    snapshot.completedCharacterCount === 0 &&
    snapshot.videoCount === 0
  ) {
    return {
      stageId: "stuck_character_not_completed",
      title: "角色建立中斷 (Character Blueprint Incomplete)",
      reason: "發起了角色建立，但尚未完成角色全身定裝板 (Blueprint)。",
      recommendation: "檢查角色精靈步驟是否過長，或 Seedream 角色生成等待時間造成跳出。",
      severity: "medium",
    };
  }

  if (
    snapshot.completedCharacterCount > 0 &&
    snapshot.videoCount === 0 &&
    snapshot.lifeShotCount === 0
  ) {
    return {
      stageId: "stuck_character_only_no_video_or_life",
      title: "完成角色後未拍片或拍日常照 (Character Created, No Next Step)",
      reason: `已建立 ${snapshot.completedCharacterCount} 個角色，但未繼續製作影片或 Life 日常照。`,
      recommendation: "在角色完成頁面強化「立即用此角色拍第一支短片 / 拍日常照」CTA 按鈕。",
      severity: "medium",
    };
  }

  if (snapshot.videoCount > 0 && snapshot.storyboardReadyCount === 0) {
    return {
      stageId: "stuck_before_storyboard",
      title: "建立影片專案但未完成 AI 分鏡 (Stopped Before Storyboard)",
      reason: `建立了 ${snapshot.videoCount} 支影片草稿，但 Phase A 分鏡腳本尚未完成或失敗。`,
      recommendation: "檢查新增影片表單的必填欄位（腳本、導演選擇）是否讓用戶卡關，或 Gemini 分鏡等待過久。",
      severity: "high",
    };
  }

  if (snapshot.storyboardReadyCount > 0 && snapshot.keyframeReadyCount === 0) {
    return {
      stageId: "stuck_storyboard_no_keyframes",
      title: "分鏡完成但未生成首尾幀圖片 (Storyboard Ready, 0 Keyframes)",
      reason: `已有 ${snapshot.storyboardReadyCount} 支影片產生分鏡表，但未點擊生成任何場景首尾幀圖片 (Keyframes)。`,
      recommendation: "在分鏡產生後醒目提示「一鍵生成全部場景圖片」，減少手動逐鏡點擊的理解成本。",
      severity: "high",
    };
  }

  if (
    snapshot.keyframeReadyCount > 0 &&
    snapshot.clipVideoReadyCount === 0 &&
    snapshot.lifeShotCount === 0
  ) {
    return {
      stageId: "stuck_keyframes_no_clip",
      title: "已生場景圖但未生成動態影片 (Keyframes Ready, 0 Video Clips)",
      reason: "已完成分鏡圖片，但尚未將圖片轉為動態影片片段 (Video Clip)。",
      recommendation: "凸顯圖片完成後的「生成影片片段」步驟或啟用自動接續生成影片。",
      severity: "medium",
    };
  }

  return {
    stageId: "activated_producing",
    title: "已成功產出內容 (Activated Producer)",
    reason: `已完成 ${snapshot.clipVideoReadyCount} 支影片片段、${snapshot.reelReadyCount} 支合成短片、${snapshot.lifeShotCount} 張日常照。`,
    recommendation: "持續追蹤留存與多軌剪輯器 (OpenCut) 匯出使用率。",
    severity: "healthy",
  };
}

// Compute the 7-stage retrospective activation funnel across all user snapshots.
export function buildRetrospectiveFunnel(
  snapshots: UserJourneySnapshot[],
): FunnelStepMetric[] {
  const total = snapshots.length;
  const stages: Array<{
    stepId: string;
    label: string;
    predicate: (s: UserJourneySnapshot) => boolean;
  }> = [
    {
      stepId: "signed_up",
      label: "1. 註冊帳號 (Signed Up)",
      predicate: () => true,
    },
    {
      stepId: "accepted_legal",
      label: "2. 同意條款進入工作台 (Accepted Terms)",
      predicate: (s) => s.hasAcceptedLegal,
    },
    {
      stepId: "started_creation",
      label: "3. 發起首次創作：建立角色 / 影片 / Life (Started Creation)",
      predicate: (s) =>
        s.characterCount > 0 || s.videoCount > 0 || s.lifeShotCount > 0,
    },
    {
      stepId: "storyboard_or_blueprint_ready",
      label: "4. 完成 AI 分鏡或角色定裝板 (Storyboard / Character Ready)",
      predicate: (s) =>
        s.storyboardReadyCount > 0 ||
        s.completedCharacterCount > 0 ||
        s.lifeShotCount > 0,
    },
    {
      stepId: "visual_frame_generated",
      label: "5. 產出場景圖片或日常照 (Scene Keyframe / Life Photo Ready)",
      predicate: (s) => s.keyframeReadyCount > 0 || s.lifeShotCount > 0,
    },
    {
      stepId: "video_clip_generated",
      label: "6. 產出動態影片片段 (Video Clip Generated)",
      predicate: (s) => s.clipVideoReadyCount > 0,
    },
    {
      stepId: "reel_or_life_completed",
      label: "7. 完成合成短片或成片產出 (Reel Assembled / Final Output)",
      predicate: (s) => s.reelReadyCount > 0 || s.clipVideoReadyCount > 0,
    },
  ];

  let prevCount = total;
  return stages.map((stage, index) => {
    const userCount = snapshots.filter(stage.predicate).length;
    const conversionFromTopPercent =
      total > 0 ? Math.round((userCount / total) * 1000) / 10 : 0;
    const conversionFromPrevPercent =
      index === 0
        ? 100
        : prevCount > 0
          ? Math.round((userCount / prevCount) * 1000) / 10
          : 0;
    const dropOffCount = index === 0 ? 0 : Math.max(0, prevCount - userCount);
    const dropOffPercent =
      index === 0 || prevCount === 0
        ? 0
        : Math.round((dropOffCount / prevCount) * 1000) / 10;
    prevCount = userCount;

    return {
      stepId: stage.stepId,
      label: stage.label,
      userCount,
      conversionFromTopPercent,
      conversionFromPrevPercent,
      dropOffCount,
      dropOffPercent,
    };
  });
}
