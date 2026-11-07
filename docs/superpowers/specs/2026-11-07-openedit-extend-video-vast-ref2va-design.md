# OpenEdit Extend Video（Vast MiniMax H3 `ref2va` 39 幀 Latent 延展）、一般分鏡 Vast `ref2va` 開關與 Edit with AI 修復設計規格

**Date:** 2026-11-07  
**Status:** Draft (Pending Approval)  
**Surface:** OpenEdit / OpenCut 剪輯器（`/app/projects/...`）、Vast ComfyUI 管線（`src/service/comfy/`）、分鏡影片生成管線（`src/service/higgsfield/`）

---

## 1. Intent & Why

在 OpenEdit 剪輯器中，使用者選取一段已完成的影片分鏡（`Clip N`）時，常需要從該片段結尾無縫往後延展一段新的 6 秒鏡頭（成為時間軸上的新片段 `Clip N+1`），同時維持人物五官穿搭、場景環境與產品道具的一致性，且在接縫處不能跳幀。

此外：
1. **Extend Video、Scro Swap、Teleport** 統一優先使用自架 Vast ComfyUI 上的 `minimax_h3_ref2va_pruned_int8_convrot.safetensors`（因雲端 API 不支援直接操作 Latent Prefix 與 Denoise Mask）。
2. **一般分鏡影片生成**預設保留雲端 OpenRouter 平行併發，並提供環境變數開關（`COMFY_CLIP_VIDEO_ENABLED=true`）按需切換至 Vast `ref2va`（支援首尾幀 + 角色／場景／產品多圖參考）。
3. **修復 OpenEdit 右下角「EDIT WITH AI」無反應問題**：解決改寫文字後 `staleVideo` 觸發時間軸刪除 `video` 元素並重掛 Inspector 導致回應消失、缺少 `motionCamera` diff 比對與缺少 `.catch()` 的問題。

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- 在 OpenEdit 已完成分鏡（`stage === "video_ready"`）的右側屬性面板新增 **Extend Video（延展片段）** 按鈕與精簡設定視窗。
- 自動從專案與該分鏡帶入 **Character Ref（角色參考圖）**、**Scene Ref（場景背景板／參考圖）** 與 **Props / Product Ref（產品／道具參考圖）**，並允許使用者在視窗內取消勾選或上傳自訂參考圖。
- 送出時立即透過 `insertClips` 在 `Clip N` 後方插入新的 **`Clip N+1`**（後續分鏡順延為 `N+2...`），以 `Clip N` 的尾幀（或靜態畫格）作為 `Clip N+1` 的起始縮圖占位，讓時間軸立刻顯示 `Clip N+1`（狀態為 `in_progress`）。
- 在 Vast ComfyUI 建立 `extend` 工作流（`src/service/comfy/workflows/extend.api.json` 與 `buildExtendGraph`）：
  - 取 `Clip N` **最後 39 幀（1.625s，對應 12 個 video latent steps + 65 個 audio latent steps）** 經 `MiniMaxH3ChainExternalVideo`（`prepend_original: false`）與 `MiniMaxH3ChainContext`（`Soft AV` / `Hard picture + smooth audio`）編碼為受保護的 Target Latent Prefix（`denoise mask = 0`）。
  - 取 `Clip N` **最後最多 6 秒影片（144 幀）** 作為 `MiniMaxH3ReferenceToVideo` 的 `ref_videos.ref_video_0`，連同角色／場景／道具參考圖（`ref_images.ref_image_0..2`）與延展 Prompt 輸入 `ref2va` 模型。
  - 經 `MiniMaxH3LoopTrim`（`trim_frames = 39`）移除重疊前綴，**僅輸出新生成的 ~6.375 秒（153 幀）延展 MP4**，完成後寫入 `Clip N+1`。
- 新增環境變數 `COMFY_CLIP_VIDEO_ENABLED=true`：開啟且 Vast ComfyUI 可用時，一般寫實風格分鏡生片（`submitClipVideo`）改走 Vast `ref2va`（傳入首尾幀與角色／場景／產品參考圖）；預設關閉以保留雲端 OpenRouter 平行併發。
- 修復 OpenEdit `ScroSceneEditInput`（「EDIT WITH AI」）：保留時間軸已完成影片元素不被降級為靜態圖、回傳並顯示 AI 修改摘要、補齊 `diffScroSeedClips` 的 `motionCamera`/`startVo`/`endVo` 比對與 `.catch()` 錯誤處理。

### Non-Goals
- 不修改 Vast 機器上的實體模型安裝腳本（100% 使用現有已安裝的 `minimax_h3_ref2va_pruned_int8_convrot.safetensors`、`DMAD LoRA`、`Qwen3-VL` 與 `ComfyUI-MiniMaxH3-Context-Loop`）。
- 不強制把所有使用者的一般分鏡批量生片預設導向單卡 Vast（預設維持雲端 OpenRouter 併發，僅在 `COMFY_CLIP_VIDEO_ENABLED=true` 時導向 Vast）。

### Anti-Goals
- 嚴禁在 H3 `ref2va` 延展 Prompt 中把靜態 `<Picture 1..3>` 寫成姿勢錨點，避免移動中的角色被拉回參考圖的靜態站姿。
- 嚴禁在單元測試中發起任何真實外部付費 API 或真實 Vast GPU 請求。

---

## 3. Approaches Considered

1. **方案 1（已選用）：送出時立即在 `Clip N` 後方插入新分鏡 `Clip N+1` + Vast ComfyUI `prepend_original: false` 單段無重疊延展**
   - 送出當下即呼叫 `insertClips` 建立 `Clip N+1` 並顯示於 OpenCut 時間軸；Vast 透過 `MiniMaxH3ChainExternalVideo (prepend_original: false)` + `MiniMaxH3ChainContext` 鎖定最後 39 幀 Latent Prefix，並由 `MiniMaxH3LoopTrim` 裁去前 39 幀，只把新生成的 ~6 秒 MP4 寫入 `Clip N+1`。
   - **取捨**：完全重用現有 `insertClips`、`reconcileClips` 與 `settleTargetClipFromEngineJob`，時間軸即時回饋最佳。
2. **方案 2（不採用）：原地接長 `Clip N`（輸出 12 秒合併片覆蓋 `Clip N`）**
   - 不符合在剪輯器中看到獨立新片段 `Clip N+1` 的剪輯需求。
3. **方案 3（不採用）：背景算完後才動態插入 `Clip N+1`**
   - 等待期間時間軸無進度占位，且使用者若在等待期間調整時間軸容易發生順序衝突。

---

## 4. Technical Design

### 4.1 自動解析分鏡參考圖（`resolveClipExtendReferences`）

在 `src/service/opencut/clip-jutsu.ts` 新增純函式 `resolveClipExtendReferences(project, clipNumber)`，從 `project` 與 `phaseA.clips[clipNumber]` 提取三類預設參考圖：

1. **Character Refs（`characterImageUrls: string[]`，上限 6 張）**：
   - 優先取 `row.cast`（若無則取 `project.cast`）中所有有效的 `imageUrl`。
   - 若無 `cast`，取 `project.characterStillUrl` 或 `project.characterImageUrl`。
   - 多於 1 張角色圖時，送往 ComfyUI 前沿用 `composeJutsuCharacterReferenceSheet`（`src/service/comfy/submit-swap.ts`）合成單張高解析度角色參考圖板作為 `<Picture 1>`。
2. **Scene Ref（`sceneImageUrl?: string`）**：
   - 優先取 `project.backgroundPlates` 中對應 `row.backgroundSetId` 的 `plate.url`。
   - 其次取 `row.backgroundImageUrls?.[0]` 或 `project.backgroundImageUrls?.[0]`。
   - 再次取 `project.referenceImages` 中對應 `row.referenceImageIds` 的第一張 `url`。
3. **Props / Product Refs（`propImageUrls: string[]`，上限 4 張）**：
   - 取 `row.products`（若無則取 `project.products`）中所有有效的 `imageUrl`，以及 `project.objectSheetUrl`（若存在）。
   - 多於 1 張道具／產品圖時，同樣以 `composeJutsuCharacterReferenceSheet` 合成單張道具參考圖板作為下一張 `<Picture N>`。

### 4.2 Vast ComfyUI `ref2va` 延展工作流（`src/service/comfy/workflows/extend.api.json` & `buildExtendGraph`）

在 `src/service/comfy/openjutsu-graph.ts` 新增 `ExtendGraphInput` 與 `buildExtendGraph(input: ExtendGraphInput): ApiGraph`：

- **輸入（`ExtendGraphInput`）**：
  - `videoName: string`（上傳至 ComfyUI 的 `Clip N` MP4）
  - `clipDurationSeconds: number`（`Clip N` 實際秒數，用於計算最後 6 秒起點：`skip_first_frames = Math.max(0, Math.round((clipDurationSeconds - 6) * 24))`，`frame_load_cap = 144`）
  - `extensionPrompt: string`（使用者輸入的延展動作／鏡頭描述）
  - `characterImageName?: string | null`
  - `sceneImageName?: string | null`
  - `propImageName?: string | null`
  - `aspectRatio: AspectRatio`（`"9:16"` → `736x1312`；`"16:9"` → `1312x736`；`"1:1"` → `736x736`）
  - `seed: number`
  - `runId: string`
- **ComfyUI 節點拓撲**：
  1. `VHS_LoadVideo`（搭配 `H3SoundtrackOrSilence`）：載入 `Clip N` 的最後最多 6 秒（`force_rate: 24`, `skip_first_frames`, `frame_load_cap: 144`），確保至少包含最後 39 幀與最多 6 秒（144 幀）的參考片段。
  2. `ImageScaleToMaxDimension`（`largest_size: 512`）：將這最後 6 秒影片縮放為動作／動態參考影片，連入 `MiniMaxH3ReferenceToVideo` 的 `ref_videos.ref_video_0`（音軌連入 `ref_video_audios.ref_video_audio_0`）。
  3. 靜態參考圖載入（`LoadImage`）：
     - 若有角色圖、場景圖、道具圖，依序連入 `MiniMaxH3ReferenceToVideo` 的 `ref_images.ref_image_0`、`ref_images.ref_image_1`、`ref_images.ref_image_2`（`ref_image_size: "max"`）。
  4. **H3 `ref2va` 六段式延展 Prompt 組裝（`buildH3ExtendPrompt`）**：
     - `subject_definitions`：
       - 宣告 `<Video 1>` 為前一段鏡頭最後 6 秒的動態與運鏡參考。
       - 依序宣告已連接的 `<Picture N>`（角色身份與服裝 `<Subject 1>`、場景環境、道具／產品外觀）。
     - `summary`：
       - `[video continuation + reference generation] The target video continues directly from the protected 39-frame audiovisual prefix of <Video 1> as one seamless shot, following the user's continuation direction while locking subject identity, environment, and props from the reference pictures.`
     - `retention_analysis`：
       - 明確指示：`<Picture N>: fully_preserved - retain facial identity, outfit, scene geometry, and prop details without pulling the moving subject back to the static reference pose; the incoming 39-frame protected latent prefix and <Video 1> control live pose, momentum, camera trajectory, and lighting.`
     - `detailed_description`：
       - `[Shot 1] Continue immediately from the protected ending of the incoming footage with no cut, reset, or jump. ${extensionPrompt}`
     - `overall_soundscape` / `non_diegetic_music`：延續自然環境音與動作音效。
  5. **39 幀 Latent Prefix 編碼與注入**：
     - `MiniMaxH3GenerationProfile`：`scene_continuity = "Hard picture + smooth audio"`（`Soft AV`），`audio_profile = "Generate audio"`。
     - `MiniMaxH3ChainPlanModern`：單一 Shot（`length: 192`，即 39 幀受保護前綴 + 153 幀新生成畫面 = `6.375s`；`steps: 6`；`width` / `height` 對應 `aspectRatio`；`encode_mode: "video"`；`crop: "center"`；`video_blend_frames: 0`）。
     - `MiniMaxH3ChainExternalVideo`：`prepend_original: false`，`source_fps: 24`，輸入 `VHS_LoadVideo` 的畫面與音軌，輸出 `external_context`（僅包含最後 39 幀畫面與音訊）至 `MiniMaxH3ChainLoopStart`。
     - `MiniMaxH3ChainContext`：將最後 39 幀透過 `Video VAE` 與 `Audio VAE` 編碼進 `MiniMaxH3ReferenceToVideo` 產生的空白 Target Latent 開頭（前 12 個 video steps 與 65 個 audio steps 設為 `denoise mask = 0`），並輸出 `trim_frames = 39`。
  6. **採樣、裁切與輸出**：
     - `SamplerCustomAdvanced` → `VAEDecode` / `VAEDecodeAudio` → `MiniMaxH3LoopTrim`（`trim_frames = 39`，裁除前 39 幀重疊區，只保留新生成的 153 幀 = `6.375s` 畫面與同步音訊）→ `MiniMaxH3ChainSegmentSave` → `MiniMaxH3ChainReview (enabled: false)` → `MiniMaxH3ChainLoopEnd` → `MiniMaxH3ChainAssemble`（`audio_source: "generated"`, `copy_to_output: true`, `output_subfolder: "h3_oneclick_extend"`, `filename: "extend_${runId}"`）。
  7. 在 `src/service/comfy/openjutsu-client.ts` 的 `scoreVideo` 擴充正則為 `/(^|\/)h3_oneclick_(swap|edit|extend)$/`，使其優先取回 `h3_oneclick_extend` 下組裝完成的延展 MP4。

### 4.3 Extend Job 資料模型與管線（`src/model/extend-job.ts` & `src/service/extend/pipeline.ts`）

為避免污染 `jutsu_jobs` 或 `teleport_jobs`，建立輕量獨立的 `extend_jobs` collection（`extendJobsCollection` in `src/dao/extend-jobs.ts`）與服務 `src/service/extend/pipeline.ts`：

- **`ExtendJob` 模型（`src/model/extend-job.ts`）**：
  - `_id`, `userId`, `clerkUserId`, `status: "rendering" | "completed" | "failed"`
  - `sourceVideoUrl: string`, `sourceDurationSeconds: number`, `aspectRatio: AspectRatio`
  - `prompt: string`
  - `characterImageUrls?: string[]`, `sceneImageUrl?: string`, `propImageUrls?: string[]`
  - `posterFrameUrl?: string`
  - `openRouterRequestId?: string`, `openRouterStatusUrl?: string`（儲存 `comfy://prompt/<id>` 或雲端備援 URL）
  - `outputVideoUrl?: string`
  - `targetVideoId: ObjectId`, `targetClipNumber: number`（指向新插入的 `Clip N+1`）
  - `creditsCharged?: number`, `creditsRefunded?: boolean`, `error?: string`, `createdAt: Date`, `updatedAt: Date`
- **啟動與插入 `Clip N+1`（`applyClipExtend` in `src/service/opencut/clip-jutsu.ts`）**：
  1. 檢查 `Clip N` 已完成且有有效 `sourceVideoUrl`。
  2. 決定新片段 `Clip N+1` 的暫代縮圖 `posterUrl`：優先取 `Clip N` 的完成尾幀（`end` frame）或首幀（`start` frame）。
  3. 建立新 `StoryboardRow`（`durationSeconds: 6`, `narrativeJob: "Extend"`, `explainerScene: prompt`, `motionCamera: prompt`, `englishVo: "(no dialogue)"`, `bgmSfx: "Continue ambient soundscape"`，並繼承 `Clip N` 的 `styleId`、`cast`、`products`、`backgroundSetId`）。
  4. 呼叫 `insertClips(project, [newRow], clipNumber + 1)` 將新分鏡插入在 `Clip N` 後方（自動順延後續分鏡與相關陣列）。
  5. 在插入後的 `project.frames` 為 `Clip N+1` 寫入一張已完成的 `start` frame（`outputUrl: posterUrl`, `blobUrl: posterUrl`），並在 `project.clips` 為 `Clip N+1` 寫入 `status: "in_progress"`, `durationSeconds: 6`, `prompt`, `submittedAt: now.toISOString()`。
  6. 建立 `extend_jobs` 紀錄（`targetVideoId: project._id`, `targetClipNumber: clipNumber + 1`），並透過 `after()` 啟動 `runExtendJobInBackground(jobId)`。
  7. 若沒有設定 `COMFY_BASE_URL`（雲端備援），則擷取 `Clip N` 最後一幀與最後 6 秒影片，優先呼叫官方 `MiniMax-H3` `ref2va`（或 OpenRouter `minimax/hailuo-3` 首幀生片）。
  8. 在 `refreshGenerationAction`（`src/service/generation/actions.ts`）、`/api/cron/refresh-jobs` 與 `listTasks`（`src/service/generation/task-list.ts`）加入 `advanceExtendJobs`，完成時透過 `settleTargetClipFromEngineJob` 將生成的 6 秒 MP4 寫入 `Clip N+1`。

### 4.4 一般分鏡生片可選切換至 Vast `ref2va`（`COMFY_CLIP_VIDEO_ENABLED`）

在 `src/service/comfy/submit-clip-video.ts` 與 `src/service/higgsfield/generate.ts`：

- 新增 `shouldUseComfyForClipVideo(input)`：
  - 當 `process.env.COMFY_CLIP_VIDEO_ENABLED === "true"` 且 `hasComfyEndpoint()` 為 `true`、目標模型為 `OPENROUTER_HAILUO_3_VIDEO_MODEL`（寫實風格非 Avatar IV 對嘴片段）且無外部 TTS `audioUrl` 時回傳 `true`；預設為 `false`（維持雲端 OpenRouter 平行併發）。
- 當 `shouldUseComfyForClipVideo` 為 `true` 時：
  - `submitClipVideo` 呼叫 `submitComfyStoryboardClipVideo`：上傳 `startImageUrl`（以及 `endImageUrl` 與額外 `referenceImageUrls`），建立單段 `ref2va` 圖表（將 `startImageUrl` 透過 `MiniMaxH3MotionContext` 釘在第 0 幀，並將 `startImageUrl`/`endImageUrl` 與角色／產品參考圖作為 `MiniMaxH3ReferenceToVideo` 的 `ref_images`），回傳 `{ request_id, status_url: "comfy://prompt/<id>", status: "processing" }`。
  - 在 `fetchHiggsfieldStatus`（`src/service/higgsfield/generate.ts`）支援 `isComfyPromptStatusUrl(statusUrl)` 呼叫 `fetchComfyPromptStatus(statusUrl)`，並在 `persistMedia`（`src/service/higgsfield/persist.ts`）下載 ComfyUI `/view` 影片時自動附帶 `comfyViewAuthHeaders(url)`。

### 4.5 修復 OpenEdit「EDIT WITH AI（`ScroSceneEditInput`）」無反應問題

1. **`src/opencut/embed/scro-video-sync.tsx`**：
   - 當分鏡已有完成的影片（`clip.videoUrl` 存在且 `clip.stage === "video_ready"`）時，即使使用者剛透過 AI 改寫分鏡文字使 `clip.staleVideo` 變為 `true`，`ensureMedia` 與 `upgradeStandIns` 仍維持 `useVideo = Boolean(clip.videoUrl)`（不將時間軸上的 `<video>` 元素刪除降級為 `<image>` 元素）。這樣時間軸選取狀態不會被清空，右側 `ScroVideoProperties` 與 `ScroSceneEditInput` 也不會被卸載重掛。
2. **`src/service/scro-video/timeline-seed.ts`**：
   - 在 `diffScroSeedClips` 補上 `before.motionCamera !== clip.motionCamera`、`before.startVo !== clip.startVo` 與 `before.endVo !== clip.endVo`，確保 AI 修改運鏡或雙段口白後右側屬性面板文字立即更新。
3. **`src/service/clip/scene-chat-actions.ts`、`src/service/opencut/messages.ts`、`src/presentation/components/app/projects/new/opencut-direct-desk.tsx`、`src/opencut/embed/scro-scene-edit-input.tsx`**：
   - `sendClipSceneChatAction` 回傳 `{ ok: true, project, summary: assistantMsg.content }`。
   - `ScroSceneEditResultMessage` 新增可選欄位 `summary?: string`。
   - `opencut-direct-desk.tsx` 處理 `scro-scene-edit` 時加上 `.catch()` 保護，並將 `result.summary` 傳回 `scro-scene-edit-result`。
   - `ScroSceneEditInput` 收到 `scro-scene-edit-result` 後顯示 AI 的具體修改摘要（`data.summary || oc.inspector.updated`）。

---

## 5. File List

- `src/service/comfy/workflows/extend.api.json` — 新增 Vast ComfyUI MiniMax H3 `ref2va` 39 幀 Latent 延展工作流模板。
- `src/service/comfy/openjutsu-graph.ts`、`src/service/comfy/openjutsu-graph.test.ts` — 新增 `buildExtendGraph`、`buildH3ExtendPrompt` 與單元測試。
- `src/service/comfy/openjutsu-client.ts` — 新增 `submitOpenJutsuExtend`，並讓 `scoreVideo` 支援 `h3_oneclick_extend`。
- `src/service/comfy/submit-clip-video.ts`、`src/service/higgsfield/generate.ts`、`src/service/higgsfield/persist.ts` — 新增 `COMFY_CLIP_VIDEO_ENABLED` 環境變數開關與 `fetchHiggsfieldStatus` / `persistMedia` 的 ComfyUI 狀態查詢與下載 Header 支援。
- `src/model/extend-job.ts`、`src/dao/extend-jobs.ts`、`src/dao/index.ts` — 新增 `ExtendJob` 資料模型與 MongoDB collection accessor。
- `src/service/extend/pipeline.ts` — 新增 Extend Video 背景執行、Vast ComfyUI 提交與雲端備援、輪詢推進（`advanceExtendJobs`）與完成寫回（`settleTargetClipFromEngineJob`）。
- `src/service/opencut/clip-jutsu.ts`、`src/service/opencut/clip-jutsu.test.ts` — 新增 `resolveClipExtendReferences` 與 `applyClipExtend`（呼叫 `insertClips` 插入 `Clip N+1` 並啟動 `startExtendJob`）。
- `src/presentation/actions/opencut-clip-jutsu.ts` — 新增 `applyClipExtendAction`。
- `src/service/generation/actions.ts`、`src/presentation/api/cron/refresh-jobs/route.ts`、`src/service/generation/task-list.ts` — 串接 `advanceExtendJobs` 與 `extendTask`。
- `src/opencut/embed/scro-video-jutsu-actions.tsx`、`src/opencut/embed/scro-video-properties.tsx`、`src/opencut/embed/scro-video-actions.ts`、`src/service/opencut/messages.ts`、`src/opencut/i18n/use-opencut-i18n.ts` — 新增 `extend-video` 按鈕與事件訊息。
- `src/presentation/components/app/projects/new/opencut-clip-extend-dialog.tsx`、`src/presentation/components/app/projects/new/opencut-scro-ai-shell.tsx`、`src/presentation/components/app/projects/new/opencut-direct-desk.tsx` — 新增 OpenEdit Extend Video 視窗與狀態串接。
- `src/opencut/embed/scro-video-sync.tsx`、`src/service/scro-video/timeline-seed.ts`、`src/service/clip/scene-chat-actions.ts`、`src/opencut/embed/scro-scene-edit-input.tsx` — 修復「EDIT WITH AI」無反應與時間軸元素重掛問題。
- `pipeline-models.md`、`AGENTS.md` — 更新模型與管線文件。
