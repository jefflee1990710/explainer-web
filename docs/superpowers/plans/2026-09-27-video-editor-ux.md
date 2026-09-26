# 影片編輯器 UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每段一顆「下一步」主按鈕、精簡修改流程、全部產生＋膠卷多選批次、進度色帶。

**Architecture:** 兩個純函式（`clipNextAction`、`planSelected`）驅動 UI 與新 server action。`VideoDesk` 開放工具列、多選與 `select` 回呼；`ClipProduction` 擁有勾選狀態與批次視窗；`new-project-form` 提供批次 handler（沿用 `runPaid`）。

**Tech Stack:** Next.js 16、React 19、Tailwind 4、`node:test` via `npx tsx --test`。

**Spec:** `docs/superpowers/specs/2026-09-27-video-editor-ux-design.md`

## Global Constraints

- 成本：`FRAMES_COST=2`、`FRAME_COST=1`、`VIDEO_COST=1`，不可更動。
- UI 文字繁體中文；新元件獨立檔案，放在 `src/presentation/components/project/`（頁面專用）或 `src/presentation/studio/`（通用）。
- 有 hook 的元件加 `'use client'`；伺服器呼叫一律用 server action。
- 沿用 Studio token（`--studio-*`）與 `StudioButton`。

---

### Task 1: `clipNextAction` 純函式

**Files:** Create `src/service/clip-next-action.ts`、`src/service/clip-next-action.test.ts`

**Produces:**

```ts
export type ClipNextKind = "frames" | "video" | "busy" | "next" | "done";
export type ClipNextAction = { kind: ClipNextKind; label: string; hint: string; cost: number };
export function clipNextAction(state: ClipState, nextUnfinished?: number): ClipNextAction;
```

規則（依序）：產生中 → busy；`stale.frames` → frames「重畫畫格」；`no_frames` → frames「畫這段畫格」；`frames_failed` → frames「重試畫格」；`frames_ready` → video「產這段影片」；`video_failed` → video「重試產片」；`video_ready` 且 `stale.video` → video「重產影片」；`video_ready` → 有 `nextUnfinished` 則 next「下一段」，否則 done。

- [ ] 寫失敗測試涵蓋每個分支 → 跑 `npx tsx --test src/service/clip-next-action.test.ts` 確認失敗 → 實作 → 確認通過。

### Task 2: `planSelected` ＋ `generateSelectedClipsAction`

**Files:** Modify `src/service/production-plan.ts`、`production-plan.test.ts`、`src/service/clip/production.ts`、`src/presentation/actions/clip-production.ts`

**Produces:**

```ts
export function planSelected(project: ClipStageSource, clipNumbers: number[], kind: "frames" | "videos"): RemainingPlan;
export async function generateSelectedClipsAction(projectId: string, clipNumbers: number[], kind: "frames" | "videos"): Promise<RemainingResult>;
```

- frames：勾選中非 `frames_generating` / `video_generating` 的段落。
- videos：勾選中 stage 為 `frames_ready` / `video_failed` / `video_ready`，且 `!stale.frames`。
- action：先 `assertCanSpendCredits(plan.cost)`，再逐段呼叫既有單段 action，失敗段落回傳 `skipped`。

- [ ] 測試 → 失敗 → 實作 → 通過。

### Task 3: Filmstrip 狀態色帶與多選；StudioFrame 批次列

**Files:** Modify `src/presentation/studio/clip-item.ts`、`filmstrip.tsx`、`studio-frame.tsx`、`src/presentation/components/project/clip-timeline.tsx`

- `StudioClipItem` 加 `tone: "idle" | "busy" | "done" | "failed" | "stale"`。
- `Filmstrip` 新增選填 `checkedIds?: string[]`、`onToggleCheck?: (id: string) => void`；縮圖底部 3px 色帶。
- `StudioFrame` 新增選填 `toolbar`、`timelineBar`。

### Task 4: `VideoDesk` 開放 API

**Files:** Modify `src/presentation/components/project/video-desk.tsx`

- `renderPreview(state, select)`、`renderInspector(state, select)`；新增選填 `renderToolbar(select)`、`checkedIds`、`onToggleCheck`、`timelineBar`。

### Task 5: 主按鈕區與預覽清理

**Files:** Create `src/presentation/components/project/clip-primary-action.tsx`；Modify `clip-workspace.tsx`、`clip-video-panel.tsx`、`frame-tile.tsx`

- 主按鈕依 `clipNextAction`；次要連結「重畫兩張畫格 · 2」（有畫格且非產生中時）。
- `FrameTile` 移除「重畫 · 1」按鈕；hover 提示「點擊標註修改」。
- `ClipVideoPanel` 無影片時改一行提示；新增 `part="stuck"`，只渲染卡住重試。
- 技術資訊面板只在 `showDebug` 為 true 時渲染。

### Task 6: 分區修改表單

**Files:** Modify `src/presentation/components/project/clip-scene-prompts.tsx`

- 旁白區展開；畫面、鏡頭用 `<details>` 收合並顯示摘要；有改動才出現儲存列（「儲存」「儲存並重畫 · 2」）。

### Task 7: 工具列、批次視窗、多選列

**Files:** Create `production-toolbar.tsx`、`selection-bar.tsx`；Modify `bulk-generate-dialog.tsx`、`clip-production.tsx`、`new-project-form.tsx`

- 工具列：「畫格 x/n · 影片 y/n」（點擊跳第一段未完成）、「技術資訊」開關、「全部產生」。
- 批次視窗：模式 `remaining | scenes | clips`，依模式顯示計畫；覆蓋模式標示警告；Studio 樣式。
- 多選列：「已選 n 段」、「畫格 · c」、「產片 · c」、「取消」，含略過說明。
- `new-project-form`：`onBulkGenerate(mode)`、`onGenerateSelected(clipNumbers, kind)` 經 `runPaid("bulk", …)`。

### Task 8: 驗證

- [ ] `npx tsx --test src/service/clip-next-action.test.ts src/service/production-plan.test.ts src/service/clip-stage.test.ts`
- [ ] `npx eslint` 變更檔案、`npx tsc --noEmit`（僅允許既有 `scripts/try-language-models.ts` 錯誤）
- [ ] 瀏覽器實測：主按鈕、表單、點畫格標註、全部產生視窗、多選列、色帶、窄螢幕。
