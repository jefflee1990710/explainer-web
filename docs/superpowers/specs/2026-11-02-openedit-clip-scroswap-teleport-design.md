# OpenEdit 分鏡片段套用 Scro Swap 與 Teleport

**Date:** 2026-11-02  
**Status:** 待審閱  
**Surface:** OpenEdit / OpenCut 剪輯器（`/app/projects/...` Video 分頁右側屬性面板）

## Goal

在 OpenEdit（OpenCut 內嵌剪輯器）裡，當使用者點選某一段已完成影片（`stage === "video_ready"` 且有 `videoUrl`）的分鏡片段（`Clip N`）時，右側 `ScroVideoProperties`（`Scene AI`）面板可以直接對這段片段套用 **Scro Swap 換角** 或 **Teleport 換場**。

送出後關閉精簡視窗，該分鏡片段進入 `in_progress`（`video_generating`）並在背景執行 Scro Swap 或 Teleport；完成後自動把新生成的 MP4 寫回該分鏡的 `clips.$.blobUrl` 與 `clips.$.outputUrl`，並由 OpenCut 的 `scro-clip-updated` 同步直接替換時間軸與媒體庫上的該段影片。若背景作業失敗，則保留該分鏡原本的影片，不會把既有成片清掉。

## Non-goals

- 不支援尚未產生影片的分鏡（`awaiting_frames`、`frames_generating`、`frames_ready`），也不支援使用者在媒體庫手動上傳、沒有 `scroClipNumber` 的一般素材。
- 不做「先在視窗預覽成片再手動按套用」的兩段式流程，也不把結果新增成另一條軌道素材。
- 精簡視窗不提供截取起點／秒數、17 款打光、遮罩邊距、帽子修正、動作尺寸等進階控制（鎖定整段分鏡：`sectionStart = 0`、`sectionLength = clamp(2..15, durationSeconds)`、`keepSourceAudio = true`、`applyColorFix = true`）。
- 不扣 credits，與獨立 `/app/scroswap`、`/app/teleport` 一致。

## 畫面與互動

### 1. 右側屬性面板按鈕

在 `src/opencut/embed/scro-video-properties.tsx`（抽成獨立元件 `src/opencut/embed/scro-video-jutsu-actions.tsx`）：

- 顯示條件：`Boolean(clip.videoUrl) && clip.stage === "video_ready"`。
- 位置：放在 `ScroVideoPrimaryActions` 與 `ScroVideoAiEntry` 同一區塊內（`ScroVideoAiEntry` 下方）。
- 兩個並排按鈕：
  - **Scro Swap**（繁中：`Scro Swap 換角` / 英文：`Scro Swap`）
  - **Teleport**（繁中：`Teleport 換場` / 英文：`Teleport`）
- 點擊時透過 `requestScroOpenAi` 送出 `{ type: "scro-open-ai", videoId, clipNumber: clip.clipNumber, kind: "scro-swap" | "teleport" }` 給外層 `OpenCutDirectDesk`。

### 2. 宿主精簡視窗

`OpenCutDirectDesk` 將 `characters` 傳給 `OpenCutScroAiShell`。`useOpenCutScroAiState` 新增 `clipSwapClip: number | null` 與 `clipTeleportClip: number | null`。

兩個精簡視窗皆放在 `src/presentation/components/app/projects/new/`，各自獨立檔案並加上 `"use client"`：

- `opencut-clip-scro-swap-dialog.tsx`：
  - 標題顯示目標分鏡（例如 `Clip 2 · Scro Swap 換角`）與片段秒數。
  - 預覽目前該分鏡的 `videoUrl`。
  - 角色選擇（沿用 `ScroSwapCreateDialog` 的 2 層角色選擇：Scro 角色清單 + Presets / Historical / 自訂上傳照片）。
  - 按下「套用換角」呼叫 `applyClipScroSwapAction`。
- `opencut-clip-teleport-dialog.tsx`：
  - 標題顯示目標分鏡（例如 `Clip 2 · Teleport 換場`）與片段秒數。
  - 預覽目前該分鏡的 `videoUrl`。
  - 場景照片上傳（`BrandUploadButton`）與場景文字輸入（至少填一項；兩者皆有時，照片為地點、文字修改氣氛）。
  - 按下「套用換場」呼叫 `applyClipTeleportAction`。

送出成功後：關閉視窗、以回傳的 `PublicVideo` 更新 `onProject(result.project)`，並呼叫 `notifyTasksChanged()`。

## 資料模型與目標綁定

### 1. `JutsuJob` 與 `TeleportJob` 目標欄位

在 `src/model/jutsu-job.ts`（`JutsuJob`、`PublicJutsuJob`）與 `src/model/teleport-job.ts`（`TeleportJob`、`PublicTeleportJob`）新增可選欄位：

- `targetVideoId?: ObjectId`（公開 DTO 為 `targetVideoId?: string`）
- `targetClipNumber?: number`
- `previousClipVideoUrl?: string`（記錄啟動前該分鏡原本的 MP4 URL，供失敗時還原）

同時放寬 `TeleportJob.aspectRatio` 型別為 `AspectRatio`（`"9:16" | "16:9" | "1:1"`）：

- 獨立 `/app/teleport` 頁面建立時仍預設 `"9:16"`。
- 從 OpenEdit 分鏡啟動時，傳入該專案的 `project.aspectRatio`，讓 Seedream 5.0 Pro（場景板與換場首尾幀）、MiniMax H3 `ref2va` 與 OpenRouter `minimax/hailuo-3` 都維持與該分鏡相同的比例。

### 2. `ProjectClip` 與對帳保護

當分鏡正在跑 Scro Swap 或 Teleport 時，`project.clips` 內該筆 `ProjectClip` 會設為：

- `status: "in_progress"`
- `submittedAt: new Date().toISOString()`
- `error: undefined`

為什麼用 `"in_progress"` 而不是 `"queued"`：

1. `orphanQueuedClips`（`src/service/higgsfield/job-attempts.ts`）只檢查 `status === "queued"`，因此不會因為 `generation_jobs` 裡沒有新的 `kind: "video"` 紀錄而在 2 分鐘後把該分鏡誤判為孤兒並標成 `failed`。
2. `reconcileClips`（`src/service/higgsfield/reconcile.ts`）對 `job.createdAt < Date.parse(clip.submittedAt)` 的舊 `generation_jobs` 會直接略過（`appliesToClaim`），因此該分鏡先前的 `generation_jobs` 不會覆蓋掉新的 `"in_progress"` 狀態，也不會在完成後把舊影片蓋回來。

## 引擎與完成寫回

### 1. 啟動 Server Actions

新增 `src/service/opencut/clip-jutsu.ts` 與 `src/presentation/actions/opencut-clip-jutsu.ts`（`"use server"`）：

- `applyClipScroSwapAction(input: { videoId: string; clipNumber: number; characterId?: string; referenceImageUrl?: string })`
- `applyClipTeleportAction(input: { videoId: string; clipNumber: number; sceneImageUrl?: string; scenePrompt?: string })`

共同檢查與步驟：

1. 驗證使用者擁有該 `videoId`（`videosCollection`），且 `phaseA` 與對應 `clipNumber` 存在。
2. 檢查該分鏡在 `project.clips` 已有完成的影片（`status === "completed"` 且 `mediaSrc(clip)` 為有效 `https://` URL）。若該分鏡正在產生中，回傳錯誤「這一段影片正在產生中，請稍候」。
3. 計算 `sectionStart = 0`，`sectionLength = Math.min(15, Math.max(2, Math.round(row.durationSeconds || clip.durationSeconds || 6)))`。
4. 呼叫 `startScroSwapJob` 或 `startTeleportJob`，帶入 `targetVideoId: project._id`、`targetClipNumber: clipNumber`、`previousClipVideoUrl: mediaSrc(clip)`，以及（Teleport 時）`aspectRatio: project.aspectRatio`。
5. 若啟動失敗，直接回傳 `{ ok: false, error }`，不動 `project.clips`。
6. 若啟動成功，更新 `videos` 內該筆 `clips.$`：`status = "in_progress"`、`submittedAt = now.toISOString()`，並清除 `error`；回傳 `{ ok: true, project: toPublicVideo(updated) }`。

### 2. 完成與失敗同步回 `videos`

新增共用 helper `settleTargetClipFromEngineJob`（位於 `src/service/opencut/clip-jutsu.ts`）：

- **當作業完成（`finalizeJutsuRenderedVideo` / `finalizeTeleportRenderedVideo`）**：
  - 若 `job.targetVideoId` 與 `job.targetClipNumber` 存在，更新 `videos` 中該筆 `clips.$`：
    - `status: "completed"`
    - `blobUrl: outputVideoUrl`
    - `outputUrl: outputVideoUrl`
    - `error: undefined`
    - `unsent: false`
  - 重新計算 `status: nextProjectStatus(updatedProject)` 並呼叫 `queueReelIfReady(updatedProject)`。
- **當作業失敗或逾時（`runScroSwapJobInBackground`、`advanceJutsuJobs`、`pollJutsuJobStatus`、`runTeleportJobInBackground`、`advanceTeleportJobs`、`pollTeleportJobStatus`）**：
  - 若 `job.targetVideoId` 與 `job.targetClipNumber` 存在：
    - 若 `job.previousClipVideoUrl` 存在，將該筆 `clips.$` 還原為 `status: "completed"`、`blobUrl: job.previousClipVideoUrl`、`outputUrl: job.previousClipVideoUrl`、`error: msg`，保留原本影片不丟失。
    - 若沒有 `previousClipVideoUrl`，才設為 `status: "failed"`、`error: msg`。

### 3. 剪輯器輪詢與任務清單

- `refreshGenerationAction(projectId)`（`src/service/generation/actions.ts`）：在 `refreshProjectJobs(id)` 旁一併執行 `advanceJutsuJobs(clerkUserId)` 與 `advanceTeleportJobs(clerkUserId)`（各自 `catch` 記 log，不中斷輪詢）。因為該分鏡處於 `in_progress`，`useProjectPoll` 每 2.5 秒會自動呼叫 `refreshGenerationAction`，即使 `after()` 在背景中斷也能推進直到成片落盤。
- `listTasks(clerkUserId, { videoId })`（`src/service/generation/task-list.ts`）：
  - 當 `options.videoId` 存在且為有效 `ObjectId` 時，`jutsu_jobs` 與 `teleport_jobs` 改用 `{ clerkUserId, targetVideoId: new ObjectId(options.videoId), ... }` 查詢（不再無條件跳過）。
  - `scroSwapTask` 與 `teleportTask`：當 `job.targetVideoId` 存在時，回傳的 `PublicTask` 帶上 `videoId: job.targetVideoId.toHexString()`，且 `href` 指向該專案剪輯器，讓剪輯器頂部 `VideoEditorTaskQueue` 能顯示進度並在完成時觸發專案刷新。

### 4. OpenCut 時間軸自動替換

當 `useProjectPoll` 拿到更新後的 `PublicVideo`：

1. `OpenCutDirectDesk` 的 `buildSeedClips(project)` 算出新的 `clip.videoUrl`。
2. `diffScroSeedClips` 偵測到 `before.videoUrl !== clip.videoUrl` 與 `before.stage !== clip.stage`，發送 `scro-clip-updated` 給 OpenCut。
3. `scro-video-sync.tsx` 的 `updateClip` 呼叫 `ensureMedia` 下載新 MP4、清除舊媒體快取，並透過 `editor.timeline.updateElements` 原地更新主軌道上該 `scroClipNumber` 的 `mediaId` 與長度。

## 測試與驗證約束

- **零外部付費呼叫**：所有單元測試與驗證嚴禁呼叫 Seedream、MiniMax、Hailuo、fal 或 Higgsfield。
- 單元測試涵蓋：
  - `ScroVideoSeedClip` 判斷是否可顯示 Scro Swap / Teleport 按鈕的純函式（僅 `stage === "video_ready"` 且有 `videoUrl` 時為 `true`）。
  - `isEditorToHostMessage` 對 `{ type: "scro-open-ai", videoId, clipNumber, kind: "scro-swap" | "teleport" }` 的驗證。
  - `TeleportJob` 帶入專案 `aspectRatio`（`"16:9"`、`"1:1"`、`"9:16"`）時的提示與正規化檢查。
  - `scroSwapTask` 與 `teleportTask` 在有 `targetVideoId` 時設定 `videoId` 的純函式測試。
  - `settleTargetClipFromEngineJob` 在成功時覆寫 `blobUrl`/`outputUrl`、在失敗且有 `previousClipVideoUrl` 時保留原影片並寫入 `error` 的單元測試。

## 檔案清單

- `src/service/opencut/messages.ts`、`src/service/opencut/messages.test.ts` — 擴充 `ScroOpenAiMessage["kind"]` 支援 `"scro-swap" | "teleport"`。
- `src/opencut/embed/scro-video-actions.ts` — `requestScroOpenAi` 支援 `"scro-swap" | "teleport"`。
- `src/opencut/embed/scro-video-jutsu-actions.tsx` — 新元件：在已就緒的分鏡屬性面板顯示 Scro Swap 與 Teleport 按鈕，並匯出純判斷函式 `canApplyClipJutsu(clip)`。
- `src/opencut/embed/scro-video-properties.tsx` — 掛載 `ScroVideoJutsuActions`。
- `src/opencut/i18n/locales/en.ts`、`src/opencut/i18n/locales/zh-Hant.ts`、`src/opencut/i18n/locales/zh-Hans.ts` — 新增屬性面板按鈕文案。
- `src/model/jutsu-job.ts`、`src/model/teleport-job.ts` — 新增 `targetVideoId`、`targetClipNumber`、`previousClipVideoUrl`；`TeleportJob.aspectRatio` 使用 `AspectRatio`。
- `src/service/teleport/start-input.ts`、`src/service/teleport/prompts.ts`、`src/service/teleport/pipeline.ts` — 支援可選 `aspectRatio`（預設 `"9:16"`）與目標分鏡欄位；完成／失敗時呼叫 `settleTargetClipFromEngineJob`。
- `src/service/jutsu/pipeline.ts` — `StartScroSwapInput` 支援目標分鏡欄位；完成／失敗時呼叫 `settleTargetClipFromEngineJob`。
- `src/service/opencut/clip-jutsu.ts`、`src/service/opencut/clip-jutsu.test.ts` — 啟動與寫回目標分鏡的服務邏輯與測試。
- `src/presentation/actions/opencut-clip-jutsu.ts` — `"use server"` actions（`applyClipScroSwapAction`、`applyClipTeleportAction`）。
- `src/service/generation/actions.ts` — `refreshGenerationAction` 一併推進 `advanceJutsuJobs` 與 `advanceTeleportJobs`。
- `src/service/generation/task-list.ts` — 支援 `options.videoId` 篩選 `targetVideoId` 並回傳 `videoId`。
- `src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx` — 剪輯器專用 Scro Swap 精簡視窗。
- `src/presentation/components/app/projects/new/opencut-clip-teleport-dialog.tsx` — 剪輯器專用 Teleport 精簡視窗。
- `src/presentation/components/app/projects/new/opencut-scro-ai-shell.tsx`、`src/presentation/components/app/projects/new/opencut-direct-desk.tsx` — 串接 `scro-open-ai` 事件與兩個精簡視窗。
- `pipeline-models.md`、`AGENTS.md` — 同步更新模型說明（記錄 OpenEdit 分鏡可直接套用 Scro Swap / Teleport 並沿用分鏡比例）。
