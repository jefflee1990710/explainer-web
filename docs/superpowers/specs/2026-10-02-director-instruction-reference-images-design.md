# 導演指示（Instruction）與場景參考圖 — 設計

日期：2026-10-02

## 目標

1. 新建影片表單第 02 區由「Topic or script」改為「Instruction / 導演指示」：使用者告訴導演怎麼規劃影片。內容可同時包含題材或整段腳本，由導演自行判斷。
2. 使用者可加入最多 4 張參考圖，每張必附說明。導演在 Phase A 用圖片做場景規劃，並為每個 clip 指定要用哪些圖；產該 clip 場景圖（start/end still）時，被指定的圖會當參考圖送出。

## 非目標

- 不改 DB 欄位名 `source`、不改 MCP 參數名 `source`（舊專案、舊 MCP client 照常運作）。
- 不做使用者手動把圖綁到 clip 的 UI（由導演決定）。
- Clip 影片（MiniMax start/end 幀）不直接吃參考圖；參考圖只影響 still，still 再帶動影片。
- 不新增其他語系的 brief 翻譯檔（目前只有 en、zh-Hant）。

## 資料模型

`src/model/project.ts`

```ts
// User-supplied scene reference for the director. Max 4 per video.
export type ReferenceImage = {
  id: string;          // "R1".."R4"，依使用者排序
  url: string;         // 使用者 brand blob 路徑
  description: string; // 1–300 字
};

Project.referenceImages?: ReferenceImage[];
```

Storyboard row（`src/model/director.ts` 的 `storyboardRowSchema`，以及 `src/model/project.ts` 的同名 schema）新增：

```ts
referenceImageIds?: string[]; // 例如 ["R1", "R3"]；未指定則不帶
```

`dualBeatStoryboardRowSchema` 與 `talkingHeadPhaseASchema` 由 `storyboardRowSchema` extend，自動繼承。

id 用 `R1..R4` 而非 uuid：LLM 回傳穩定、好讀，且使用者重排序後會在下次 Phase A 重新指定。

## 表單 UI

- `new-project-form.tsx` 第 02 區：
  - 標題 `brief.section02.title`：en「Instruction」、zh-Hant「導演指示」。
  - 提示：說明可以寫怎麼拍、要講什麼，或直接貼腳本／文章。
  - placeholder 換成指示式範例。
  - `brief.source.label` 同步改名；`charCount` 不變。
- 新元件 `src/presentation/components/app/projects/new/reference-images-field.tsx`（`"use client"`），放在 textarea 下方、同一 Section 內：
  - 每列：縮圖（固定比例 cover）、說明 textarea（必填，300 字上限，含字數）、移除按鈕。
  - 底部「加入參考圖」按鈕，4 張滿則隱藏；文案提示「導演會依說明決定用在哪幾個場景」。
  - 上傳重用 `BrandUploadButton` / `uploadBrandAssetAction`（PNG/JPG/WebP、≤ 5MB、`explainer/brand/{clerkUserId}/…`）。外觀參考 `logo-picker.tsx`。
  - 上傳中、失敗顯示沿用 logo picker 的狀態樣式。
- 狀態：`referenceImages` 於 `NewProjectForm` 以 `initialVideo?.referenceImages || []` 初始化；`briefFormData()` 以 `JSON.stringify` 放入 `referenceImages`。送出時重新編號 `R1..Rn`。
- `canSubmit` 額外要求每張已加的圖都有說明（trim 後非空）。
- `brief-defaults.ts` 不存參考圖（與不存題材一致）。

## Server

`src/service/project/actions.ts` — `readVideoBrief()`：

- 解析 `formData.get("referenceImages")`（缺省為 `[]`）為 JSON，zod 驗證：
  - 陣列長度 ≤ 4；
  - `description` trim 後 1–300 字；
  - `url` 通過 `isBrandAssetUrl(url, clerkUserId)`。
- 失敗回傳中文錯誤（「參考圖最多 4 張」「請為每張參考圖填寫說明」「參考圖來源無效」）。
- 伺服器端重新指派 id `R1..Rn`（不信任 client id）。
- `createVideoAction` / `updateVideoBriefAction` / `restartVideoAction` 寫入 `referenceImages`。
- 純函式 `parseReferenceImages(raw, clerkUserId)` 抽到 `src/service/project/reference-images.ts` 方便測試。

## 導演 Phase A

`src/service/director/run-phase-a.ts`：

- User message 文字改為：
  `Director instruction (may contain the topic, an outline, or a full script — follow it):\n${input.source}`
- 若有參考圖，在角色藍圖圖片前加入，每張為一對 content part：
  - `{ type: "text", text: "Reference image R1: <description>" }`
  - `{ type: "image", image: <bytes> }`（重用 `loadDirectorImageParts`）
- System prompt 新增規則段（只在有參考圖時加入）：
  - 參考圖是使用者提供的場景素材；依說明決定用在哪些 clip，寫進該 clip 的 `referenceImageIds`。
  - 只在內容確實相符的 clip 標記；一張圖可用於多個 clip；不必每張都用，也不要每個 clip 都塞。
  - 場景描述（`explainerScene` / `startScene` / `endScene`）要與被指定圖的構圖、主體一致。
- 回傳後過濾：`referenceImageIds` 只保留存在的 id、去重。
- Talking-head 由腳本逐句切，不經 LLM 指定，`referenceImageIds` 為空。
- `runPhaseAJob`（`jobs.ts`）把 `project.referenceImages` 傳入 `runPhaseA`。

Storyboard 編輯：手動改 row 文字時保留原 `referenceImageIds`（只覆寫被編輯欄位）。

## 產場景圖

`src/service/higgsfield/frame-prompts.ts` — `frameSubmitPlan`：

- 新增 `clipReferenceImageUrls(project, clipNumber)`：取該 clip row 的 `referenceImageIds` 對應 `project.referenceImages` 的 url，依 id 排序。
- refs 順序：`[annotatedUrl, anchorUrl, ...clipSceneRefs, ...characterLocks, ...logo]`。
- 有 scene refs 時，prompt 加一行（`FRAME_SCENE_REFERENCE_LOCK`）：
  `Scene reference image(s) show the intended layout, subject, and setting — follow their composition; keep cast identity from the character references.`
- 超出模型上限時沿用現有 `referenceUrlsForModel` contact sheet，不另寫邏輯。

## MCP

`src/service/mcp/server.ts` — `create_video`：

- `source` 的 describe 改為 instruction 說明。
- 新增選填 `referenceImages: { url: string (https); description: string }[]`（≤ 4），與 `create_character.referenceImageUrl` 一致接受任意公開圖片網址。
- MCP 沒有上傳工具，所以 MCP handler 先把每張非 brand 路徑的圖下載（PNG/JPG/WebP、≤ 5MB、15 秒逾時），用 `persistBuffer` 轉存到 `brandAssetPath(clerkUserId, uuid, ext)`，再把轉存後網址交給 `createVideoAction`。如此 `readVideoBrief` 只需信任 brand 路徑。
- 轉存邏輯放 `src/service/project/reference-images.ts` 的 `importReferenceImage(url, clerkUserId)`；下載或格式失敗回傳錯誤，不建立影片。

## 錯誤處理

- 上傳失敗：列內顯示錯誤、可重試，不影響其他列。
- Phase A 下載參考圖失敗：略過該圖並 `console.error`，不中斷規劃（與角色圖一致）。
- 參考圖 url 失效（blob 被刪）：產 still 時 provider 報錯走既有失敗流程。

## 測試（`npx tsx --test`）

- `src/service/project/reference-images.test.ts`：
  - 超過 4 張拒絕；空白說明拒絕；他人 url 拒絕；id 重編 `R1..Rn`；缺省為空陣列。
- `src/service/higgsfield/frame-prompts.test.ts` 新增：
  - 被指定 clip 的 refs 含 scene ref 且排在角色藍圖前；未指定 clip 不含；未知 id 忽略；prompt 含 scene reference lock 行。
- `src/service/director/` 新增 Phase A 參考圖 content 組裝與 id 過濾的純函式測試。
- 全部：`npx tsc --noEmit`、`npx eslint <files>`。

## 涉及檔案

- `src/model/project.ts`、`src/model/director.ts`
- `src/presentation/components/app/projects/new/new-project-form.tsx`
- `src/presentation/components/app/projects/new/reference-images-field.tsx`（新）
- `src/util/i18n/messages/workspace/brief.en.ts`、`brief.zh-Hant.ts`（以及 `types.ts` 若 brief 型別在此）
- `src/service/project/actions.ts`、`src/service/project/reference-images.ts`（新）
- `src/service/director/run-phase-a.ts`、`src/service/director/jobs.ts`
- `src/service/higgsfield/frame-prompts.ts`
- `src/service/mcp/server.ts`
- `src/presentation/serialize.ts`（`PublicVideo` 帶出 `referenceImages`）
