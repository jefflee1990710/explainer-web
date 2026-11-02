# Teleport 換場

**Date:** 2026-11-02  
**Status:** 已核准  
**Surface:** `/app/teleport`（側欄在 Scro Swap 正下方）

## Goal

在 Scro Swap 下面加一個獨立功能 Teleport。使用者上傳一段有人的短片，再給一個新場景。引擎把原來的人放進那個場景：臉、身體、穿搭，以及影片裡的動作留住；人在畫面裡的位置、大小、光線可以配合新地方。

場景可以是一張照片、一段文字，或兩者一起。有照片時，照片是地點，文字只改氣氛（例如同一間咖啡館，改成下雨夜晚）。只有文字時，先生成一張沒有人的場景板，再把人放進去。

## Non-goals

- 不在 `jutsu_jobs` 加模式，也不改 Scro Swap 的換角流程。
- 沒有角色選擇、17 款打光、遮罩邊距、帽子修正、口型開關、動作尺寸這些進階控制。
- 不扣 credits，和現有 Scro Swap 一樣。
- 沒有可重複使用的場景庫。My Room 仍是試衣間。
- 成片比例只有 `9:16`。
- 不做「人留在原位、只換身後背景」的去背貼圖模式。

## 畫面

側欄「建立」區，Scro Swap 的下一項：

- `href`: `/app/teleport`
- 英文：`Teleport`
- 中文：`Teleport 換場`
- icon 用現有的 `room`。Scro Swap 維持 `styles`。不新增 icon 種類

頁面結構對齊 Scro Swap 工作室：

- 最近 24 筆自己的作業
- 建立按鈕打開大型對話框
- 右側結果：狀態、秒數、`9:16`、場景靜幀、換場後的起始幀、完成的影片與下載
- 進行中的作業每 4.5 秒用 Server Action 查一次
- 可刪除自己的作業。刪除只移除該筆文件，不刪 Blob，和 Scro Swap 一樣

建立對話框：

1. 上傳來源影片，加上片段起點（秒，最小 0）和長度（2–15 秒，預設 6）。
2. 場景照片（可空）與場景文字（可空）。至少要有其中一個。空白文字視同沒有文字。
3. 進階：保留原片聲音（預設開）、H3 Soft 調色（預設開）。
4. Generate 後對話框關閉，新作業立刻以 `rendering` 出現在清單。

導覽：現有四步改成五步。Scro Swap 仍是第 4 步，Teleport 是第 5 步。繁中、簡中、英文的 `stepNumber` 都改成 `n / 5`。Teleport 文案說明：上傳短片，把原來的人放進新背景與場景，動作留住。

## 作業文件

MongoDB collection：`teleport_jobs`。型別 `TeleportJob`。Accessor 使用 `db.collection<OptionalId<TeleportJob>>("teleport_jobs")`，並建立與 `jutsu_jobs` 相同的索引：`{ clerkUserId: 1, createdAt: -1 }`、`{ status: 1, updatedAt: -1 }`。

欄位：

- `userId`, `clerkUserId`
- `status`: `rendering` | `completed` | `failed`
- `sourceVideoUrl`, `aspectRatio`（固定 `"9:16"`）, `sectionStart`, `sectionLength`
- `sceneImageUrl`：使用者上傳的場景照，或只有文字時生成的場景板
- `scenePrompt`：使用者的場景文字；沒有則不存
- `scenePlateGenerated`：只有「沒有上傳照片、由文字生成場景板」時為 `true`。有上傳照片時為 `false`，即使同時有文字
- `rawStartFrameUrl`, `rawEndFrameUrl`
- `identityFrameUrl`：去背後的人；去背失敗時改存原始起始幀
- `preparedStartFrameUrl`, `preparedEndFrameUrl`
- `mannequinVideoUrl`
- `editPrompt`, `motionDescription`
- `keepSourceAudio`（預設 `true`）, `applyColorFix`（預設 `true`）
- `openRouterRequestId`, `openRouterStatusUrl`：MiniMax 與 OpenRouter 都沿用這兩個欄位，方便輪詢
- `outputVideoUrl`, `error`
- `createdAt`, `updatedAt`

公開 DTO 用字串 `id` 與 ISO 時間，不露出 `userId` / `clerkUserId`。

## 引擎

獨立服務 `src/service/teleport/`。重用 Scro Swap 已 export 的抽幀、SAM 假人、原聲混流、H3 Soft 調色、MiniMax H3 `ref2va` 提交。不把 Teleport 接進 `JutsuMode`。

假人參數固定為 Scro Swap 的預設：遮罩 `normal`、動作尺寸 `512`、`hatFix` false。多人同框時，跟 Scro Swap 一樣用同一套人物遮罩，被追到的表演者進新場景。不另做選人器。

H3 不送 `reference_audio`，也不把 `noLipSync` 設成會加上「嘴巴保持放鬆」的那句。原聲在成片後混進片段。H3 請求不可同時帶 `first_frame` / `last_frame`。

影片提交秒數沿用 Scro Swap：`Math.min(15, Math.max(5, Math.round(sectionLength)))`。使用者選 2–4 秒時，檔案仍記實際長度，送給模型的 duration 是 5 秒。

步驟：

1. **建立。** 檢查通過後立刻插入 `rendering` 作業，回傳給頁面，再用 `after()` 在背景跑。背景程序沒跑完時，由工作清單輪詢與 `/api/cron/refresh-jobs` 接手。
2. **抽幀。** 下載來源影片，抽出片段的起始幀與結束幀。
3. **身份幀。** 用 SAM 把起始幀的人去背，放到素底上，作為臉和穿搭的鎖。去背失敗就改用原始起始幀，之後的影片提示要忽略那張圖的背景。
4. **場景板。**
   - 有上傳照片：那張照片就是地點，不另生成一張新地點。
   - 只有文字：用 `bytedance-seed/seedream-5-0-pro`（`2K`，`9:16`）生成一張沒有人的場景板，寫入 `sceneImageUrl`，`scenePlateGenerated = true`。
5. **換場首尾幀。** Seedream 5.0 Pro `2K` 各做一張。輸入是該瞬間的原始幀，加上場景板。提示要求：同一個人的臉、身體、穿搭、表情，以及這一瞬間的動作留住；位置、大小、光線可以改，讓人站在新場景裡。有文字時，文字接在提示後面當氣氛修改。橫向場景照也收成 `9:16`。提示先走與 Scro Swap 相同的 OpenRouter VLM upsampler（`google/gemini-2.5-flash`）。結束幀給預覽，也給 Hailuo 的尾幀；H3 不用尾幀。
6. **動作。** 從來源片段做灰階假人。有 `FAL_KEY` 時走 fal `fal-ai/sam-3/video-rle`；否則用 OpenRouter VLM 的 bbox 橢圓。假人只負責動作。
7. **出片。**
   - 有假人而且有 `MINIMAX_API_KEY`：官方 MiniMax Video V2 `MiniMax-H3` reference-to-video，`2K`，`9:16`。`reference_image` 1 是換場後的起始幀，`reference_image` 2 是身份幀，`reference_video` 是假人。提示要求跟著假人的動作，人保持身份幀的臉和穿搭，環境保持換場起始幀，並帶上場景文字。
   - 沒有假人，或沒有 `MINIMAX_API_KEY`：OpenRouter `minimax/hailuo-3`，用換場後的首幀與尾幀。
8. **完成。** `keepSourceAudio` 為真時，把來源片段的聲音混進成片。`applyColorFix` 為真時套 H3 Soft。寫入 `outputVideoUrl`，狀態改 `completed`，並 `revalidatePath("/app/teleport")`。

## 失敗與輪詢

插入前就失敗、不建作業：

- 來源影片不是 `https://`，或不在該使用者的 brand asset / `public.blob.vercel-storage.com` 範圍（檢查方式和 `startScroSwapJob` 相同）
- 場景照有給，但不是同一套允許的 Blob 網址
- 場景照與場景文字都沒有

插入後任何例外把該筆設為 `failed`，`error` 放錯誤訊息，不提交影片。只有文字而場景板生成失敗、或換場首尾幀失敗，都走這條。

已提交給模型之後：

- 提供者回 `failed` 或 `nsfw`：`failed`，沿用提供者的錯誤訊息
- 還沒有 status URL，而且 `createdAt` 超過 25 分鐘：`failed`，錯誤「Teleport 處理逾時，請重試」
- 已有 status URL 但仍在跑，而且 `createdAt` 超過 25 分鐘：`failed`，錯誤「Teleport 渲染逾時，請重試」

頁面在 `rendering` 時每 4.5 秒呼叫 poll Server Action。`advanceTeleportJobs` 同時接在現有的任務推進（`advanceOwnedJobs`）和 `/api/cron/refresh-jobs`。單次推進沿用 Scro Swap：最多 12 筆、較早更新的先處理。推進裡單筆失敗只記 log，不拖垮其他作業。

全域任務清單加 kind `teleport`。標題取場景文字的第一行，去掉頭尾空白後最多 40 個字；沒有場景文字時用「Teleport」。詳情「Teleport · 換場」，`href` 為 `/app/teleport`。完成與失敗都算已結束任務。英文詳情：`Teleport · Scene relocate`。

## 檔案

- `src/model/teleport-job.ts`
- `src/dao/teleport-jobs.ts`，並從 `src/dao/index.ts` export
- `src/service/teleport/prompts.ts`：純函式，組場景板提示、換場首尾幀提示、H3 / Hailuo 提示
- `src/service/teleport/pipeline.ts`：建立、背景執行、推進、輪詢、列表、刪除
- `src/service/teleport/teleport.test.ts`
- `src/presentation/actions/teleport.ts`：`"use server"`，只轉呼叫 service
- `src/app/app/teleport/page.tsx`
- `src/presentation/components/app/teleport/teleport-studio.tsx`
- `src/presentation/components/app/teleport/teleport-create-dialog.tsx`
- `src/presentation/components/app-shell.tsx`：側欄順序
- `src/presentation/studio/studio-nav-feature-discovery.tsx`：第五步
- `src/service/generation/task-list.ts`、`task-advance.ts`
- `src/presentation/components/app/tasks/settled-generation-tasks.ts`
- `src/presentation/api/cron/refresh-jobs/route.ts`
- `src/util/i18n/messages/workspace/tasks.en.ts`、`tasks.zh-Hant.ts`
- `pipeline-models.md` 與 `AGENTS.md` 的模型摘要：同一實作回合更新。Teleport 列明 Seedream 5.0 Pro 場景板與換場幀、Gemini 2.5 Flash upsampler、fal SAM 3 或 VLM 假人、MiniMax H3 或 Hailuo-3、FFmpeg 混流與 H3 Soft

頁面專用元件放在 `src/presentation/components/app/teleport/`。有 `useEffect` 的元件檔案頂部加 `"use client"`。

## 測試

用 Node test runner，不打真實的付費 API。

- 提示純函式：只有照片、只有文字、照片加文字。照片加文字的換場提示同時含地點照與氣氛修改，而且不要求另造一個新地點。
- 只有文字的場景板提示要求沒有人。
- 建立前驗證：沒有場景照也沒有文字時回錯誤，不插入。
- `teleportTask`：`rendering` 與 `completed` 都會進任務清單，`href` 是 `/app/teleport`。
- H3 請求組裝沿用現有 helper 的測試方式：兩張 `reference_image`、一條 `reference_video`，沒有首尾幀角色。

實作完成後在瀏覽器確認側欄順序、打開建立對話框、缺場景時不能送出。驗收不要按 Generate，避免打到 Seedream、MiniMax、Hailuo 或 fal。
