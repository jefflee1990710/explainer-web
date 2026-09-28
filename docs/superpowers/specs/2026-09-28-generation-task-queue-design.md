# 生成任務佇列（Generation Task Queue）

日期：2026-09-28
狀態：已實作（依實作計畫簡化，見「實作簡化與裁定」）

## 目標

把所有 Higgsfield 生成（分鏡畫格、Clip 影片、角色藍圖版本、角色定裝圖）改成「先寫任務、再由排程保證送出與取回」的結構：

1. 按下產生時，一定先在 MongoDB 留下一筆 `pending` 任務。
2. 排程 1 每分鐘撿 `pending` 任務送到 Higgsfield。
3. 排程 2 每分鐘查已送出的任務，完成就更新任務與生成狀態，UI 可預覽。
4. UI 能列出待處理與最近完成的任務。

## 背景：現況與問題

- `generationJobs` 集合已存在，但只在「送出 Higgsfield 成功之後」才寫入。
- 畫格在 server action 裡直接送出；Clip 影片先扣款、把 clip 標 `queued`，再用 `after()` 在背景寫 Phase B prompt 並送出。
- 結果靠 Higgsfield webhook（`/api/webhooks/higgsfield`）與編輯器每 2.5 秒輪詢 `refreshGenerationAction` 取回，寫回由 `applyJobStatus` / `syncProjectFromJobs` 負責。
- 實例：影片 `6ab943b330edc9f362c76b3f`（幾秒搞懂大型語言模型）Clip 1 已扣款並標 `queued`，但 `after()` 背景工作中斷，沒有 prompt、沒有 video job，之後也沒有任何程式會再接手，UI 永遠顯示「產片中」。
- 沒有跨專案的任務清單；只有單支影片編輯器頂部的排隊計數（`ProductionQueue`）。

## 可行性

- Vercel 團隊 NOVAX 為 **Pro** 方案，支援每分鐘 cron。
- Vercel Functions 預設執行上限 300 秒，足夠每批處理數筆（含影片的 Phase B）。
- 現有 `applyJobStatus`、`reconcileFrames` / `reconcileClips`、`syncProjectFromJobs`、退款與完成通知都能沿用。

## 決策

- **速度模式：混合。** 按下後照樣立即嘗試送出；排程負責撿漏與補查結果；webhook 與編輯器輪詢保留。
- **範圍：** 畫格、Clip 影片、角色藍圖版本、角色定裝圖。Reel 合成與品牌成片（ffmpeg，本地處理）不在範圍內。
- **資料結構：做法 A。** 升級現有 `generationJobs` 集合成為任務佇列，不另開集合。
- **UI：兩處。** 側欄新增「任務」頁；影片編輯器的排隊計數可展開成這支影片的任務清單。

## 第一段：任務資料與狀態

每筆 `generationJobs` 文件代表一個任務。

### 狀態流程

```text
pending → submitting → queued / in_progress → completed
                    ↘ 送出失敗、未達上限 → pending（稍後重試）
                    ↘ 達上限 / 不可重試  → failed（退款）
                                         nsfw（退款）
```

`GenerationStatus` 新增 `pending`、`submitting`。沒有 `cancelled`：畫格 / clip 生成中本來就擋住重畫，`pending` 任務不會被取代。

### 新增欄位

| 欄位 | 用途 |
|---|---|
| `attempts` | 已嘗試送出次數，上限 3 |
| `lockedUntil` | 搶到送出權的鎖；過期代表送出者已中斷 |
| `nextAttemptAt` | 失敗後的下次重試時間，間隔遞增（1、3、10 分鐘） |
| `submittedAt` | 真正送到 Higgsfield 的時間 |

不新增 `clerkUserId`、`input`、`chargedCredits`、`refundedAt`：擁有者由所屬影片 / 角色推得；送單內容（畫格 revision、prompt）已存在畫格 / clip / 角色版本上，送出時才組；退款金額由任務種類與所屬影片 / 角色推得；「以原子更新把狀態改成終止狀態」本身就是退款防重（與原本做法相同）。

`requestId`、`statusUrl` 改為選填，送出成功後才寫入。

### 扣款

維持現在的時間點：按下時扣款並建立 `pending` 任務。之後任何一步失敗，都由任務本身退款一次（見第四段）。

### 舊資料

現有 job 都是送出後的狀態（`queued` / `in_progress` / `completed` / `failed` / `nsfw`），不需遷移即可被排程 2 接手。任務清單一律經由所屬影片或角色篩選使用者，新舊 job 同樣處理。

## 第二段：送出流程與兩個排程

### 按下產生時

1. 扣款，建立 `pending` 任務（送單內容從畫格 / clip / 角色版本讀，送出時才組）。
2. 在同一請求以 `after()` 立即嘗試送出一次，與排程共用同一把鎖。
3. 若 `after()` 中斷，任務仍是 `pending`，或是 `lockedUntil` 已過期的 `submitting`，1 分鐘內由排程 1 撿走。

影片、畫格、定裝圖、角色藍圖的 server action 都改成「建立任務 → 嘗試送出」；影片、畫格欄位在影片文件上的 `queued` 標記仍保留，讓現有 `clipStateFor` 繼續運作。

### 搶鎖

用單一原子更新搶送出權：

- 條件：`status = pending` 且 `nextAttemptAt <= now`；或 `status = submitting` 且 `lockedUntil < now`
- 更新：`status = submitting`、`lockedUntil = now + 5 分鐘`、`attempts + 1`

只有更新成功的一方會送出。

### 排程 1：`/api/cron/submit-jobs`（每分鐘）

- 依 `createdAt` 撈可搶的任務，每次最多約 6 筆，確保 300 秒內跑完。
- 每筆搶鎖後送出：
  - 影片：先寫 Phase B prompt，存回 clip 與任務，再送。
  - 畫格、定裝圖、角色藍圖：直接送。
- 送出成功：寫入 `requestId`、`statusUrl`、`submittedAt`，狀態改 `queued`（或 Higgsfield 回傳的狀態），接著呼叫 `syncProjectFromJobs`。
- 送出失敗：可重試且未達上限 → 回 `pending` 並設 `nextAttemptAt`；否則 → `failed` 並退款。

### 排程 2：`/api/cron/refresh-jobs`（每分鐘）

- 撈所有 `queued` / `in_progress`，以及 `completed` 但未存檔的任務，跨全部影片與角色。篩選條件都寫在查詢裡，再套筆數上限（不先取 N 筆再在程式裡過濾，避免上限被不需處理的任務吃掉）。
- 向 Higgsfield 查狀態，交給現有 `applyJobStatus`：存 Blob、寫回畫格 / clip / 角色版本、失敗退款、寄完成通知。
- `submittedAt` 超過 30 分鐘仍未完成的任務標 `failed` 並退款。
- 同一次只處理有限筆數；查詢並行、寫回依序，避免同專案寫回互相覆蓋。

### 保留不變

- Higgsfield webhook 照舊即時回報。
- 編輯器 2.5 秒輪詢照舊，只查這支影片。

### 安全與設定

- 兩個排程 route 檢查 `Authorization: Bearer ${CRON_SECRET}`，不符回 401。
- 以 `vercel.json` 設定兩個 `* * * * *` cron（repo 沒有 `@vercel/config` 依賴，不用 `vercel.ts`）。
- 本機 cron 不會自動跑；可帶 secret 手動打兩個網址測試。

## 第三段：UI 整合

### 側欄「任務」頁（`/app/tasks`）

- 列出目前使用者最新的任務（依建立時間新到舊，最多 100 筆），未完成與已完成 / 失敗混在一起。
- 每列：縮圖（生成中顯示 spinner）、所屬影片或角色名稱、內容（如 `Clip 2 · 起始畫格`、`角色藍圖`）、狀態、更新時間；重試中的任務顯示第幾次嘗試。
- 狀態文案：

| 狀態 | 顯示 |
|---|---|
| `pending` | 排隊中 |
| `submitting` | 送出中 |
| `queued` / `in_progress` | 生成中 |
| `completed` | 完成 |
| `failed` / `nsfw` | 失敗（顯示原因，已退款） |

- 完成的顯示縮圖；影片可直接預覽播放。
- 點一列跳到對應的影片編輯器（並選中該 clip）或角色頁。
- 頁面開著時每 5 秒更新；側欄「生成任務」圖示旁顯示未完成數量（伺服端算數；查詢失敗時顯示 0，不影響整個 app 外框）。
- 資料用 server action 取得，不新增 REST API。
- 列表元件放在共用 components 資料夾，任務頁與編輯器共用；樣式沿用現有 Studio 卡片與清單。

### 影片編輯器

- 頂部 `ProductionQueue` 排隊計數改成可點，展開這支影片的任務清單（同上列表元件，依影片篩選）。
- 畫格與 Clip 格子的文案維持現狀；「排隊中 / 送出中 / 生成中」的區分只在任務清單顯示。
- 沒有任何進行中的畫格 / 影片時，排隊計數不顯示，也就沒有入口。
- 移除「看起來卡住了？重試」按鈕（`ClipVideoPanel` 的 `stuck` 部分），由任務自動重送或失敗退款取代。

### 角色頁

- 版本卡不變：版本狀態本來就跟著 job 走；角色任務出現在任務頁。

## 第四段：錯誤處理、測試與上線

### 錯誤與邊界

- **重複送出：** 即時送出與排程 1 共用原子鎖，只有搶到者送出。
- **重複退款：** 退款前以原子更新把任務從非終止狀態改成 `failed`，只有更新成功者退款。
- **Webhook 與排程 2 同時回報：** 沿用現有冪等寫回。
- **送出前重畫同一格：** 畫格 / clip 進行中（含 `pending`）時編輯器本來就擋重畫，沿用現有「等它結束再重畫」的規則。
- **Higgsfield 暫時錯誤**（逾時、5xx、網路）：回 `pending` 重試。**明確拒絕**（NSFW、參數錯誤、4xx）：直接 `failed` 並退款。
- **排程逾時：** 每批筆數有上限，未處理的下一分鐘再撿；鎖過期後可被重新搶。
- **Phase B 失敗：** 算一次嘗試，依重試規則處理。
- **Runner 的 try/catch 只包 Higgsfield 送單呼叫：** 送單成功後的寫回（存 `requestId`、同步專案）若出錯不會被當成送單失敗而退款重送。

### 測試

純函式單元測試（`npx tsx --test`）：

- 狀態轉換與重試退避（何時回 `pending`、何時 `failed`）
- 可搶任務的判斷（`pending` 到期、`submitting` 鎖過期）
- 暫時錯誤 vs 明確拒絕的分類
- 是否該退款、退款只發生一次的判斷
- 任務清單的狀態文案與排序

Route：兩個排程 route 缺少或錯誤 `CRON_SECRET` 時回 401。

手動驗證：

- 本機帶 secret 打兩個排程網址，確認 `pending` 被送出、完成後寫回畫面。
- Vercel preview 確認 cron 每分鐘觸發。
- 重現 Clip 1 情境：建立任務後讓即時送出失敗，確認 1 分鐘內由排程 1 送出。
- 任務頁與編輯器任務清單能預覽完成的圖與影片。

### 上線順序

1. 任務欄位、狀態型別與純函式。
2. 排程 2（查結果）：擴大現有輪詢範圍，風險最低。
3. 排程 1 與「先寫 pending」：依序套到畫格、Clip 影片、定裝圖、角色藍圖。
4. 任務頁與編輯器任務清單。
5. 移除手動「卡住了？重試」。

## 實作簡化與裁定

依實作計畫的「Simplifications vs. spec」，本文件已同步：

1. 不加 `clerkUserId`、`input`、`chargedCredits`、`refundedAt` 欄位（見第一段）。
2. 沒有 `cancelled` 狀態。
3. Cron 設定在 `vercel.json`。
4. 編輯器格子文案不變，階段區分只在任務清單。
5. 角色版本卡不變。

實作時的裁定：

- **Job 索引由排程惰性建立：** 兩個 cron 第一次執行時建立 `generationJobs` 需要的索引（重複建立為 no-op），不另寫遷移腳本。
- **排程 2 先在查詢中過濾，再套筆數上限。**
- **Runner 的 try/catch 只涵蓋 provider（Higgsfield）呼叫。**

## 不在範圍

- Reel 合成與品牌成片（ffmpeg）。
- 改變計價或扣款時間點。
- 使用者手動取消已送出的任務。
