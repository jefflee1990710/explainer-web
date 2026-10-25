# 改姿勢與分件衣服 — 設計

Date: 2026-10-25
Status: 對話中的架構、畫面、資料流已同意；這份書面規格待覆核

## 目標

在 `scro-pose` 做一個 iOS 與 Android 的 Flutter app。使用者用跟 Scro.io 相同的 Firebase 帳號登入，拍一張照片或從相簿選一張，從 Scro 的姿勢庫與衣櫃選姿勢和分件衣服，送出後得到一張新圖。

這一版改的是上傳的那張照片裡的人。目錄與生圖都在 explainer-web 的新 API。App 不自帶模型金鑰。

## 已定的做法

App 只做介面。explainer-web 提供目錄、存圖、扣點與生圖。姿勢庫與衣櫃沿用網站現有資料，不複製一份到 App，也不另建目錄集合。

## 範圍外

- 不建立、不讀取角色（character）或 Life 照片。
- 不提供髮型，也不提供使用者自訂衣櫃（`cw_`）。
- 不做影片、分享頁，或把結果存進系統相簿。
- 不在開發時呼叫付費生圖。

## 1. App

專案路徑：`/Users/jefflee/Projects/Explainer.io/scro-pose`。套件名 `scro_pose`。

- iOS bundle id：`io.scro.pose`
- Android application id：`io.scro.pose`
- Firebase 專案：`scro-explainer`（與 `explainer-app` 相同）。在這個專案裡另建這兩個 app，登入方式為 email／密碼與 Google。設定尚未寫入時，登入頁顯示 Firebase 尚未設定，與現有 app 的失敗方式相同。
- API 根網址由 `--dart-define=API_BASE_URL` 決定，預設 `https://www.scro.io`，沒有結尾斜線。呼叫時加上 `/api/v1`。
- 登入後以 Firebase ID token 送 `Authorization: Bearer`。
- 介面文案用繁體中文。
- 相簿裡的 HEIC 由 App 轉成 jpeg 再上傳。

畫面只有登入、工作室、紀錄。

**登入。** 未登入只見登入頁。已登入進入工作室。

**工作室（一頁）。** 由上到下：

1. 照片。空狀態有「拍照」與「從相簿選」。選好後可重拍或重選。照片在按下產生之前只留在手機上。
2. 姿勢。橫向預覽。點一下選取，再點一次取消。沒選就保持原照姿勢。
3. 衣服。四格：上衣、褲子、鞋、配件。每一格以預覽圖選擇，點一下選取，可清除。沒選的部位保持原照。選到連身上衣（現有 `isFullBodyTop`，包含洋裝、長袍、旗袍等已列入的上衣）時，褲子格改為不需再選，並清掉已選褲子。
4. 「產生新圖」，標明 4 credits。有照片，而且至少選了姿勢或一個部位，按鈕才可按。這筆還在 `pending` 時按鈕不可再按。

送出後留在同一頁，預覽改為等待。完成後顯示新圖。原圖、姿勢與衣服選擇都留著，調整後再送會另建一筆、再扣 4 credits。也可以換一張照片。失敗時留著原照與選擇，並顯示原因。

**紀錄。** 與工作室並列的列表，新的在上。每列是縮圖與狀態：排隊、完成、失敗。完成的縮圖用 `resultUrl`，其餘用 `sourceUrl`。點進去看大圖。沒有紀錄時引導去拍照。

## 2. API

路由檔在 `src/app/api/v1/**/route.ts`，只設定 `runtime` 與 `dynamic`，實作放在 `src/presentation/api/v1/**`。全部走現有的 `withApiUser`。錯誤形狀是 `{ error: string }`。

### `GET /api/v1/poses`

回傳姿勢庫全部項目。每筆：

- `id`、`group`、`framing`、`hands`
- `label`：`LIFE_POSE_NAMES_ZH`
- `previewUrl`：`getAppUrl()` + `lifePosePreviewSrc(id)`
- `skeletonUrl`：`getAppUrl()` + `lifePoseImagePath(id)`

不回傳 `promptText`。

### `GET /api/v1/outfits`

只回上衣、褲子、鞋、配件。不回髮型，不回 `pants` 的 `none`。每筆：

- `id`
- `part`：`top` | `pants` | `shoes` | `accessory`
- `label`：有短 `description` 時用它；沒有時用 `id`。不把整段英文 `prompt` 當標籤。格子以預覽圖辨識。
- `previewUrl`：`getAppUrl()` + `characterLookPreviewSrc(part, id)`。沒有預覽圖的項目不回傳。

### `POST /api/v1/pose-edits`

`multipart/form-data`，檔案欄位名 `file`。其餘欄位：`poseId`、`top`、`pants`、`shoes`、`accessory`，都可省略。

成功回 201 與一筆改圖 DTO，狀態為 `pending`。

### `GET /api/v1/pose-edits`

只回這位使用者最近 30 筆，`createdAt` 新的在前。

### `GET /api/v1/pose-edits/:id`

只回這位使用者的那一筆。別人的 id 回 404，`{ error: "找不到改圖" }`。

### 改圖 DTO

- `id`
- `status`：`pending` | `completed` | `failed`（進行中只用 `pending`，畫面顯示排隊或等待）
- `sourceUrl`
- `resultUrl`（完成後才有）
- `poseId`（有選才有）
- `wardrobe`：`{ top?, pants?, shoes?, accessory? }`
- `error`（失敗時的短原因）
- `createdAt`（ISO 字串）

## 3. 資料與生圖

新集合 `pose_edits`，accessor 為 `poseEditsCollection()`。文件含 `clerkUserId`（Firebase uid）、`sourceUrl`、`poseId`、`wardrobe`、`status`、`resultUrl`、`error`、`spendKey`、`createdAt`、`updatedAt`。列表用 `clerkUserId` + `createdAt` 查詢。

生圖工作使用新的 `GenerationKind`：`poseEdit`。它是 self-syncing job，結果寫回 `pose_edits`，不寫入影片或 Life。工作以 `poseEditId` 指向那筆改圖。圖片結果經現有的 Blob 儲存寫成 https 網址，Mongo 不存 `data:` 網址。

模型用寫實靜圖 `google/gemini-3-pro-image`。參考圖順序：

1. 使用者的照片。
2. 有 `poseId` 時，再加上 `lifePoseReferenceUrl(poseId)` 的骨架圖。

提示詞用英文，規則固定為：

- 第一張圖是要改的人。保住臉、身份、身體、背景與光線。姿勢改動時，取景可以跟著姿勢，其餘保持原照。
- 不要把骨架的線或點畫進成品。
- 有姿勢時：第二張圖是姿勢骨架，身體姿勢要對上，並帶上該姿勢的 `promptText`。
- 有選部位時：只改那些部位，文案用 `wardrobePickPrompts`。沒選的衣服保持照片原樣。
- 連身上衣：褲子選擇先拿掉，提示詞說明這件衣服蓋住腿。

輸出比例在 `1:1`、`3:4`、`9:16` 中，選與原圖寬高比絕對差最小的一個。差距相同時選較窄的（寬／高較小）。讀不到尺寸時用 `3:4`。

扣點金額是現有的 `FRAME_COST`（4）。送出順序：

1. 驗證通過。
2. `assertCanSpendCredits`。未訂閱或點數不足時直接回 400，不上傳、不建紀錄。未訂閱的訊息是「請先訂閱方案才能產片」。點數不足的訊息是「credits 不足，請加購或升級方案」。無限點數帳號仍須有有效訂閱，餘額檢查沿用 `hasUnlimitedCredits`。
3. 原圖上傳到 Blob。
4. `consumeCredits`，得到 `spendKey`。
5. 寫入 `pose_edits`，狀態 `pending`。
6. 建立 `poseEdit` 工作並交給現有佇列。

第 4 步之後若建立工作失敗，把這筆標成 `failed` 並退點。生圖失敗、逾時，或供應商狀態為 `nsfw` 時，也標成 `failed`。退點的條件是：同一次更新把 `spendKey` 清掉，而且確實清到了，才呼叫 `refundCredits(..., 4, spendKey)`。清不到就不再退。失敗原因寫進 `error`，給使用者看的是短句，不寫供應商內部訊息。`nsfw` 用「這張圖無法產生」。

## 4. 驗證

- 檔案必須是 jpeg、png 或 webp，最大 8MB。否則 400，「請上傳 8MB 以內的 jpeg、png 或 webp」。
- `poseId` 有值時必須存在於姿勢庫。否則 400，「找不到這個姿勢」。
- 衣服 id 必須屬於該部位的目錄，且不可為 `cw_` 或褲子的 `none`。否則 400，「找不到這件衣服」。
- `poseId` 與四個部位都空時，400，「請選姿勢或至少一件衣服」。
- 連身上衣會在驗證時移除 `pants`，不當成錯誤。
- 未帶 Bearer、或 token 無效：401，`{ error: "Unauthorized" }`。App 回到登入頁。
- 讀取失敗可以重試。`POST` 不自動重送。
- App 對 `pending` 的紀錄每 2.5 秒讀一次 `GET /api/v1/pose-edits/:id`，回到前景時再讀一次。`completed` 或 `failed` 就停止。

## 5. 測試

後端用 `node:test` 測純函數與退點條件，不打真實生圖：

- 沒有姿勢也沒有部位會被拒絕。
- 未知姿勢、未知部位、`cw_`、褲子 `none` 會被拒絕。
- 連身上衣會拿掉褲子。
- 提示詞只含選到的姿勢與部位，並要求保住沒選的衣服與臉。
- 參考圖順序是照片，然後才是骨架；沒選姿勢時只有照片。
- 寬高比選擇與平手時選較窄者。
- 失敗退點只在清掉 `spendKey` 的那一次發生。

Flutter widget 測試：只有照片時按鈕不能按；加上姿勢或一個部位後可以按；送出後按鈕進入等待。

## 6. 單元責任

- **目錄讀取**：把現有姿勢庫與衣櫃收成上面的 JSON。沒有生圖與扣點。
- **改圖驗證與比例**：純函數。輸入表單與圖片尺寸，輸出選擇或一則錯誤。
- **提示詞**：純函數。輸入已驗證的姿勢與部位文案，輸出英文提示與參考圖清單。
- **改圖服務**：上傳、扣點、寫 `pose_edits`、建立 `poseEdit` 工作、完成時寫結果、失敗時退點。
- **Flutter API client**：附上 Bearer、解析 `{ error }`、不重送 `POST`。
- **工作室**：組照片、姿勢、四個部位與送出按鈕。送出條件只放在這一頁。
- **紀錄**：列出最近 30 筆並打開一筆的大圖。
