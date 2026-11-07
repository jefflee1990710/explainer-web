# Scro Swap 支援選擇既有角色或上傳單張／多張角色參考圖

**Date:** 2026-11-07  
**Status:** 已核准  
**Surface:** `/app/scroswap`（`JutsuStudio`）與 OpenEdit 分鏡 `Scro Swap` 視窗（`OpenCutClipScroSwapDialog`）

## 1. Intent & Why

使用者在進行 Scro Swap 角色動作遷移時，除了直接選用已建立的 Scro `Character`（含預設與歷史穿搭版本），常會直接手邊有 1 張或多張目標人物的照片（例如：正面五官照、側面照、全身穿搭照）。支援「選擇既有角色」或「一次上傳單張／多張（1～6 張）自訂角色參考圖」，能讓 AI 同時鎖定目標人物的多角度臉部特徵與完整全身穿搭，無須先離開工作台去建立永久角色。

## 2. Goals / Non-goals / Anti-goals

### Goals
- **雙模式自由切換（Character vs. 單張／多張自訂上傳圖）**：
  - 在 `/app/scroswap`（工作台角色卡片拖放區與角色選擇彈窗）及 OpenEdit `OpenCutClipScroSwapDialog` 中，支援一次選擇或拖放 1～6 張圖片（對齊 `MAX_CHARACTER_REFERENCES = 6`）。
  - 顯示已上傳的參考圖縮圖列：支援單張移除（`×`）、繼續新增照片（`+ 新增照片`，直到滿 6 張）與一鍵清除，並可隨時點選任一 Scro `Character` 切換回既有角色（或切換回自訂照片）。
  - 在多人偵測模式（Person #1、#2…）下，每個 `JutsuPersonSlotAssignment` 都能獨立指定一個 Scro `Character` 或 1～6 張自訂角色參考圖。
- **向下相容的資料模型**：
  - `JutsuJob`、`PublicJutsuJob`、`JutsuPersonMapping`、`StartScroSwapInput`、`PrepareJutsuJobInput` 與 `applyClipScroSwap` 新增 `referenceImageUrls?: string[]`（最多 6 張去重有效 URL），並自動將第一張同步寫入 `referenceImageUrl` 以保持向後相容。
- **Cloud 管線原生多圖支援**：
  - 將角色的所有 `referenceImageUrls` 依序傳入 `upsampleJutsuFramePrompt`、`Seedream 5.0 Pro`（`submitOpenRouterImage`）以及 `MiniMax H3 ref2va`（`identityImageUrls`）。
  - 更新 `buildDefaultJutsuEditPrompt` 與 `buildMultiPersonJutsuEditPrompt`，當單一角色帶有多張參考圖時，明確標示哪些 attached image 編號屬於同一位目標角色的不同角度／全身與五官參考。
- **自建 ComfyUI 管線智慧拼貼支援**：
  - 在 `trySubmitJutsuComfy` 中，若目標角色只有 1 張參考圖，維持原樣直接上傳為 `Picture 1`。
  - 若目標角色有 2～6 張參考圖，透過 `sharp`（`composeJutsuCharacterReferenceSheet`）將多張圖片無縫橫向／網格拼貼為單張高解析度角色參考圖板上傳至 `Picture 1`，讓 Qwen3-VL `Describe picture 1`、`H3OneClickSwapPlan` 與 `MiniMaxH3ReferenceToVideo` 同時取得所有角度與服裝細節，且不會誤判為多位不同人物。

### Non-goals & Anti-goals
- **不額外呼叫付費生圖模型預先合成角色板**：避免增加 15～25 秒等待時間與額外 API 費用，也避免重繪改變使用者照片中的原始服裝細節。
- **不影響現有單圖與既有角色流程**：僅上傳 1 張圖片或選用 Scro `Character` 時，行為與結果與現況完全一致。

## 3. Approaches

1. **方案 A（採用）：Cloud 原生多圖直傳 + ComfyUI `sharp` 智慧拼貼參考板**  
   - Cloud 管線直接將 `referenceImageUrls` 傳給 VLM Upsampler、Seedream 5.0 Pro 與 MiniMax H3 `ref2va`；ComfyUI 管線在多於 1 張時以 `sharp` 合成高解析角色參考圖板作為 `Picture 1`。零額外延遲與成本，兩條管線皆完整支援。
2. **方案 B（捨棄）：多於 1 張時跳過 ComfyUI 強制走 Cloud**  
   - 雖然簡單，但上傳多張照片時會喪失自建 ComfyUI Masked H3 工作流。
3. **方案 C（捨棄）：先呼叫 Seedream 5.0 Pro 生成中繼角色設定圖**  
   - 增加額外延遲與成本，且可能改變照片原始穿搭。

## 4. 檔案變更清單

- `src/model/jutsu-job.ts` — `JutsuPersonMapping`、`JutsuJob`、`PublicJutsuJob` 與 `toPublicJutsuJob` 新增 `referenceImageUrls?: string[]`。
- `src/service/jutsu/describer.ts` — `buildDefaultJutsuEditPrompt` 新增 `referenceImageCount?: number`；`buildMultiPersonJutsuEditPrompt` 支援每個 `JutsuPersonMapping` 帶有多張 `referenceImageUrls` 並正確計算 attached image 序號（`1..N` + 最後一張場景基底圖）。
- `src/service/jutsu/pipeline.ts` — `PrepareJutsuJobInput` 與 `StartScroSwapInput` 支援 `referenceImageUrls?: string[]`；正規化單人與多人 `referenceImageUrls`（上限 6 張），並在 `prepareJutsuJob` 與 `runScroSwapJobInBackground` 將完整參考圖陣列傳給 VLM upsampler、Seedream 5.0 Pro 與 MiniMax H3 `ref2va`。
- `src/service/comfy/submit-swap.ts` — 新增 `composeJutsuCharacterReferenceSheet(buffers)`：當角色有 2～6 張參考圖時，用 `sharp` 拼貼為高解析度角色參考圖板後送入 `submitOpenJutsuSimple`。
- `src/service/opencut/clip-jutsu.ts` — `applyClipScroSwap` 支援 `referenceImageUrls?: string[]` 並轉交 `startScroSwapJob`。
- `src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx` — `JutsuPersonSlotAssignment` 新增 `uploadedPhotoUrls: string[]`（與 `uploadedPhotoUrl` 同步），並在標籤列顯示多張自訂照片張數（例如 `自訂相片 (3)` / `Custom Photos (3)`）。
- `src/presentation/components/app/jutsu/jutsu-studio.tsx` — 工作台角色卡片支援多檔拖放與多圖預覽，角色選擇彈窗支援多圖上傳、單張刪除、繼續新增（最多 6 張）與切換回既有 Scro `Character`。
- `src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx` — 支援一次上傳／拖放 1～6 張自訂角色參考圖、單張移除、繼續新增，或切換選用既有 Scro `Character`。
- `src/service/jutsu/jutsu.test.ts`、`src/service/opencut/clip-jutsu.test.ts` — 新增單張／多張角色參考圖的 Prompt 序號計算、ComfyUI 多圖拼貼與 `applyClipScroSwap` 參數傳遞單元測試（零外部付費呼叫）。
