# 防止無限註冊刷取免費額度（Anti-Abuse & Free Tier Guardrails）設計規格

- **日期**：2026-10-26
- **涵蓋專案**：`explainer-web`（Next.js API 與 Billing 服務）、`scro-pose`（Flutter App）

## 1. 背景與問題定義

1. **Email 無驗證與別名漏洞**：目前 `upsertAppUserFromIdentity` 只要看到新的 Firebase `uid`，就會無條件透過 `$setOnInsert` 發放 `WELCOME_CREDITS = 145`。使用者可用未驗證 Email、免洗信箱（disposable email），或 Gmail `+alias`／`.` 變體無限註冊新帳號。
2. **Scro Pose 可燒光 145 點**：`WELCOME_CREDITS = 145` 原意是供 Web 端體驗 1 部故事板分鏡 + 1 段 7 秒預覽影片；但 `createPoseEdit` 每次只花 `FRAME_COST = 4` credits，導致 1 個免費帳號就能生 **36 張 2K 圖片**。
3. **跨帳號無硬體與網路記憶**：使用者登出再註冊新帳號，伺服器不會檢查該台手機（Device ID）或該 IP 是否已經領取過免費額度。
4. **免費產出物與付費無差異**：免費帳號同樣呼叫 `2k` 解析度且無浮水印，讓惡意腳本或白嫖使用者能直接把免費額度當作正式生產工具。

---

## 2. 四層防禦架構（Defense-in-Depth）

### 第 1 層：信箱驗證、正規化與免洗信箱攔截（Email Hygiene & Verification）

- **Normalized Email（信箱正規化）**：
  - 建立純函式 `normalizeEmail(email: string): string`：
    - 轉小寫並 trim。
    - 若 domain 為 `gmail.com` 或 `googlemail.com`（統一歸為 `gmail.com`），移除 local-part 中所有的 `.`，並移除 `+` 號及其後綴（例如 `Jeff.Lee+1@googlemail.com` → `jefflee@gmail.com`）。
    - 其他網域亦移除 `+` 後綴以阻擋 sub-addressing 濫用。
- **Disposable Email Blocklist（免洗信箱黑名單）**：
  - 建立 `isDisposableEmail(email: string): boolean`，內建常見免洗信箱網域清單（如 `mailinator.com`、`tempmail.com`、`10minutemail.com`、`guerrillamail.com`、`yopmail.com`、`sharklasers.com`、`trashmail.com` 等）。
- **Email Verified 檢查**：
  - `FirebaseIdentity` 擴充 `emailVerified?: boolean`、`clientIp?: string`、`deviceId?: string`。
  - OAuth（Google）登入天然 `email_verified === true`；一般 Email/Password 註冊若 `emailVerified !== true`，帳號建立時 `credits` 設為 `0`（不發放 `WELCOME_CREDITS`），待驗證通過後才補發。

### 第 2 層：裝置指紋（Device ID）與 IP 領取紀錄（`welcome_credit_grants` Collection）

- **資料模型（`src/model/welcome-credit-grant.ts` & `src/dao/welcome-credit-grants.ts`）**：
  - Collection 名稱：`welcome_credit_grants`（使用 `db.collection<OptionalId<WelcomeCreditGrant>>("welcome_credit_grants")`）。
  - 欄位：
    - `clerkUserId: string`
    - `normalizedEmail: string`
    - `deviceId?: string`（來自 Header `X-Device-Id`）
    - `ipHash?: string`（將 `x-forwarded-for` / `x-real-ip` 以 SHA-256 雜湊儲存，保護隱私）
    - `grantedAt: Date`
- **領取判定規則（`shouldGrantWelcomeCredits`）**：
  - 全部符合以下條件才發放 `WELCOME_CREDITS`（否則發放 `0` credits，並標記 `welcomeGrantBlockedReason`）：
    1. `email` 存在且 `emailVerified === true`。
    2. `!isDisposableEmail(email)`。
    3. `welcome_credit_grants` 中**不存在**相同的 `normalizedEmail`。
    4. 若帶有 `deviceId`，`welcome_credit_grants` 中**不存在**相同的 `deviceId`（1 台實體裝置終身限領 1 次免費歡迎額度）。
    5. 若帶有 `ipHash`，過去 24 小時內同一 `ipHash` 在 `welcome_credit_grants` 的領取次數 `< 2`。
- **Flutter 端（`scro-pose`）裝置安裝 ID**：
  - 在 `scro-pose` 實作本機持久化的 `DeviceIdStore`（儲存隨機 UUID v4，寫入應用程式支援目錄／Keychain 相容檔案），並在 `PoseApi` 的每個請求自動帶上 Header `X-Device-Id: <uuid>`。
  - 若使用者用 Email 註冊且尚未驗證信箱，自動呼叫 `user.sendEmailVerification()` 並在建立改圖遇到免費額度限制時清楚提示。

### 第 3 層：Scro Pose 免費帳號生成張數上限（Free Tier Pose Edit Cap）

- **規則**：
  - 定義常數 `FREE_TRIAL_POSE_EDIT_LIMIT = 3`（免費體驗帳號最多可擁有 **3 筆** `status !== "failed"` 的 Pose Edit 紀錄，等於最多消耗 `12 credits`）。
  - 在 `createPoseEdit` 扣點前檢查：
    - 若使用者非無上限帳號（`!hasUnlimitedCredits(user.email)`）、沒有有效訂閱（`!isSubscriptionActive(sub)`），且從未購買過點數包（`!user.processedCheckoutIds?.length && !(user.bonusCredits && user.bonusCredits > 0)`），則視為 **免費體驗帳號（Free Tier）**。
    - 查詢 `pose_edits` 中該 `clerkUserId` 且 `status: { $in: ["pending", "completed"] }` 的數量。
    - 若已達到 `>= FREE_TRIAL_POSE_EDIT_LIMIT`（3 張），直接拒絕並回傳 `402`：`"免費體驗最多可生成 3 張穿搭／姿勢照片，請升級方案或加購點數以解鎖無限生成"`。
  - 這樣一來，即使免費帳號帳上還有剩餘給 Web 預覽分鏡／影片用的歡迎點數，也無法在 Scro Pose 拿來生 36 張照片。

### 第 4 層：免費體驗產出降級（1K 解析度 + 右下角 `Scro.io` 浮水印）

- **Model 欄位擴充（`PoseEdit`）**：
  - 在 `PoseEdit` 新增選填布林欄位 `freeTier?: boolean`。
  - `createPoseEdit` 建立紀錄時，若判定為免費體驗帳號，寫入 `freeTier: true`。
- **1K vs 2K 解析度分流（`sendPoseEditToNanoBanana`）**：
  - 傳入 `resolution?: "1k" | "2k"`（預設免費體驗 `freeTier: true` 使用 `"1k"`，付費／加購使用者使用 `"2k"`）。
- **自動壓上 `Scro.io` 浮水印（`syncPoseEditJob`）**：
  - 建立影像浮水印工具 `applyPoseWatermark(imageBuffer: Buffer): Promise<Buffer>`（使用專案內已安裝的 `sharp` 套件，以 SVG overlay 在圖片右下角壓上半透明膠囊底 + `Scro.io` 字樣）。
  - 當 `syncPoseEditJob` 收到 `completed` 的 `outputUrl` 時，若該筆 `PoseEdit.freeTier === true`，先將圖片下載並透過 `applyPoseWatermark` 合成浮水印，再上傳至 Vercel Blob 寫入 `resultUrl`。

---

## 3. 測試與驗證計畫

1. **單元測試（`explainer-web`）**：
   - `src/service/billing/welcome-guard.test.ts`：測試 Gmail `.` 與 `+alias` 正規化、免洗信箱攔截、未驗證信箱不給點、同 `deviceId` 第二個帳號不給點、同 `ipHash` 超過每日上限不給點。
   - `src/service/pose-edit/create.test.ts`：測試免費體驗帳號第 4 張 Pose Edit 會被 `FREE_TRIAL_POSE_EDIT_LIMIT` 攔截（回傳 402），以及付費／加購帳號不受 3 張限制；驗證 `freeTier` 傳遞 `"1k"` 解析度。
   - `src/service/pose-edit/watermark.test.ts`：測試 `applyPoseWatermark` 能對 JPEG/PNG 圖片加上右下角 `Scro.io` 浮水印並輸出有效圖片 Buffer。
2. **單元測試（`scro-pose`）**：
   - 測試 `PoseApi` 請求自動夾帶 `X-Device-Id` Header。
3. **靜態檢查**：
   - 執行 `npx tsc --noEmit`、`npx eslint` 與 `flutter analyze`、`flutter test`。
