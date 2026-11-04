# Unified Director Dock Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared dark Cinema Studio `<DirectorDockShell>` component suite and upgrade all 5 studio creation screens (Explainer Video, Talking Head, Life, Scro Swap, Teleport) to the unified Director Dock UI while preserving all existing dialogs, actions, and advanced controls.

**Architecture:** Extract pure layout/config helpers (`director-dock-config.ts`) and reusable dark-theme primitives (`DirectorDockStage`, `DirectorDockHero`, `DirectorDockPanel`, `DirectorDockComposer`) in `src/presentation/components/app/director-dock/`, scoped under `.director-dock-stage` in `src/presentation/studio/tokens.css` so `.studio-app` light-mode rules do not override dark inputs, pills, or the lime Generate button. Then wire `NewProjectForm` (Explainer + Talking Head), `LifeDesk`, `JutsuStudio` (Scro Swap), and `TeleportStudio` onto the shared dock.

**Tech Stack:** Next.js 16 (App Router, React 19 Client Components), Tailwind CSS, Framer Motion, TypeScript, Node built-in test runner (`node:test` + `tsx`).

**Spec:** `docs/superpowers/specs/2026-11-04-director-dock-studio-design.md`

## Global Constraints

- Scope dark cinema styling under `.director-dock-stage` in `src/presentation/studio/tokens.css` (`#0c0d10` canvas, `#17181d` / `#1e2028` dock surfaces, `#d8ff3e` / `#c6f24b` lime primary button) so light-mode modal dialogs (`[role="dialog"]`) and OpenCut (`OpenCutVideoDesk`) remain unaffected.
- Keep `data-tour-id` attributes (`setup-mode-bar`, `video-type-card`, `visual-style-card`, `character-card`, `instruction-card`) in `NewProjectForm` so `CreateVideoFeatureDiscovery` works without missing selectors.
- Support `zh-Hant`, `zh-Hans`, and `en` across all 5 studios.
- Never make live paid provider calls in tests (`npx tsx --test`).

## Review Focus

- Switching between Explainer and Talking Head in `NewProjectForm` must preserve cast count rules (`requiredCastCount(ruleSlug)`) and default talking-head director instructions (`defaultTalkingHeadDirectorInstruction`) without leaving stale validation errors.
- Unlayered `.studio-app :is(input, textarea, select)` and `.studio-app button[class*="border"][class*="bg-paper"]` in `src/presentation/studio/tokens.css` must not turn the dark composer textarea or dark pill buttons white when rendered inside `.studio-app`.
- Cast slot rendering in `DirectorDockPanel` must handle `requiredCastCount === 0`, `1`, or `2` and display empty `+` avatar slots up to the max slot count (`Math.max(castNeed, 2)` for video, `1` for Life/Scro Swap).
- In `JutsuStudio` (Scro Swap), when `sourceVideoUrl` is loaded, the SAM 3 person detection overlay (`JutsuPersonRleOverlay` + `JutsuPersonTabsBar`) must remain interactive inside the dock so multi-person character assignment still works.
- In `LifeDesk`, when `sceneUrl` is loaded in `place-in-scene` or `replace-person` mode, the numbered remark canvas (`canvasRef` + `remarks`) must remain accessible and functional before clicking Generate.

---

### Task 1: Shared Director Dock Config, Pure Helpers & Scoped Dark CSS

**Files:**
- Create: `src/presentation/components/app/director-dock/director-dock-config.ts`
- Create: `src/presentation/components/app/director-dock/director-dock-config.test.ts`
- Modify: `src/presentation/studio/tokens.css`

**Interfaces:**
- Produces:
  - `export type DirectorStudioKind = "explainer" | "talking-head" | "life" | "scroswap" | "teleport";`
  - `export interface HeroShowcaseCard { imageUrl: string; tag: string; title: string; }`
  - `export interface DirectorHeroCopy { headline: string; subtitle: string; cards: [HeroShowcaseCard, HeroShowcaseCard, HeroShowcaseCard]; }`
  - `export function getDirectorHeroCopy(kind: DirectorStudioKind, locale: "zh-Hant" | "zh-Hans" | "en"): DirectorHeroCopy`
  - `export function cycleOption<T>(options: readonly T[], current: T, delta: 1 | -1): T`
  - `export function buildCastSlotItems<T extends { id: string; name: string; previewUrl?: string }>(selectedIds: readonly string[], allCharacters: readonly T[], slotCount: number): Array<{ index: number; character: T | null }>`

- [ ] **Step 1: Write the failing unit test `src/presentation/components/app/director-dock/director-dock-config.test.ts`**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCastSlotItems,
  cycleOption,
  getDirectorHeroCopy,
} from "./director-dock-config";

test("getDirectorHeroCopy returns 3 showcase cards and localized headline for all 5 studios", () => {
  const kinds = ["explainer", "talking-head", "life", "scroswap", "teleport"] as const;
  for (const kind of kinds) {
    const copy = getDirectorHeroCopy(kind, "zh-Hant");
    assert.equal(copy.cards.length, 3);
    assert.ok(copy.headline.length > 0);
    assert.ok(copy.cards.every((c) => c.imageUrl.startsWith("/")));
  }
});

test("cycleOption wraps forward and backward safely", () => {
  const items = ["auto", "15s", "30s", "60s"] as const;
  assert.equal(cycleOption(items, "auto", 1), "15s");
  assert.equal(cycleOption(items, "auto", -1), "60s");
  assert.equal(cycleOption(items, "60s", 1), "auto");
});

test("buildCastSlotItems pads empty slots up to slotCount", () => {
  const chars = [
    { id: "c1", name: "Ada", previewUrl: "/a.png" },
    { id: "c2", name: "Ben", previewUrl: "/b.png" },
  ];
  const slots = buildCastSlotItems(["c2"], chars, 3);
  assert.equal(slots.length, 3);
  assert.equal(slots[0]?.character?.id, "c2");
  assert.equal(slots[1]?.character, null);
  assert.equal(slots[2]?.character, null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/presentation/components/app/director-dock/director-dock-config.test.ts`
Expected: FAIL (`Cannot find module './director-dock-config'`)

- [ ] **Step 3: Implement `src/presentation/components/app/director-dock/director-dock-config.ts` and add `.director-dock-stage` CSS rules in `src/presentation/studio/tokens.css`**

In `src/presentation/studio/tokens.css`, guard the light-mode `.studio-app :is(input, textarea, select)` rule with `:not(.director-dock-stage *)` and add `.director-dock-stage` rules for the dark `#0c0d10` canvas, `#181920` dock panels, dark borderless textareas, square slot tiles, and the `#d8ff3e` lime Generate CTA button.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/presentation/components/app/director-dock/director-dock-config.test.ts`
Expected: PASS (3 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/app/director-dock/director-dock-config.ts src/presentation/components/app/director-dock/director-dock-config.test.ts src/presentation/studio/tokens.css
git commit -m "feat(director-dock): add shared config helpers and dark stage tokens"
```

---

### Task 2: Shared `<DirectorDockShell>` UI Primitives

**Files:**
- Create: `src/presentation/components/app/director-dock/director-dock-stage.tsx`
- Create: `src/presentation/components/app/director-dock/director-dock-hero.tsx`
- Create: `src/presentation/components/app/director-dock/director-dock-panel.tsx`
- Create: `src/presentation/components/app/director-dock/director-dock-composer.tsx`
- Create: `src/presentation/components/app/director-dock/index.ts`

**Interfaces:**
- Consumes: `DirectorStudioKind`, `DirectorHeroCopy`, `getDirectorHeroCopy` from `./director-dock-config`
- Produces:
  - `DirectorDockStage({ topLeft, topRight, children, bottomContent, className })`
  - `DirectorDockHero({ kind, headlineOverride, compact })`
  - `DirectorDockPanel({ title, defaultOpen, tourId, children })`
  - `DirectorDockCell({ className, tourId, onClick, children })`
  - `DirectorDockStepperCell({ thumbUrl, icon, label, value, onPrev, onNext, onClick, tourId })`
  - `DirectorDockCurveCell({ label, value, subValue, onPrev, onNext, onClick, tourId })`
  - `DirectorDockDurationCell({ label, value, progressRatio, onClick, onPrev, onNext })`
  - `DirectorDockComposer({ modeItems, activeModeId, onSelectMode, promptValue, onPromptChange, promptPlaceholder, topMediaSlot, onPlusClick, plusMenuSlot, pills, rightSlot1, rightSlot2, onGenerate, generateDisabled, generating, generateLabel, creditBadge, error, tourId })`
  - `DirectorDockQuickTile({ label, badge, thumbUrl, videoUrl, active, icon, onClick, onClear, disabled })`

- [ ] **Step 1: Implement `director-dock-stage.tsx` and `director-dock-hero.tsx`**

`DirectorDockStage` renders the full-bleed `.director-dock-stage` dark container with a subtle top utility bar (`topLeft` / `topRight`), centered main column (`max-w-4xl`), and optional `bottomContent` gallery area below the fold. `DirectorDockHero` renders the 3 fanned showcase cards (`-rotate-6 -translate-x-24 scale-90`, central `z-10 scale-100 shadow-2xl`, `rotate-6 translate-x-24 scale-90`) and the large headline.

- [ ] **Step 2: Implement `director-dock-panel.tsx`**

Renders the collapsible `🎬 導演面板` header with chevron toggle and the horizontal row of cells:
- Cast avatar slot strip (`👤+` button + avatar/empty slots)
- `DirectorDockStepperCell` (thumbnail + two-line label + `▴/▾` arrows)
- `DirectorDockCurveCell` (blue bezier spline SVG matching the screenshot + two-line label + `▴/▾` arrows)
- `DirectorDockDurationCell` (`时长` + value + vertical slider bar indicator).

- [ ] **Step 3: Implement `director-dock-composer.tsx` and `index.ts`**

Renders:
- Left floating vertical mode pill (`圖像 / 視頻` style rail on `md+`, horizontal pill bar on `<md`)
- Main composer card (`#181920`, rounded-2xl, border `white/10`)
  - Optional `topMediaSlot` (for inline audio recorder/player, SAM 3 person detector, or Life remark canvas preview)
  - Borderless dark prompt textarea
  - Bottom-left pill bar (`+` button with optional popover menu, primary pill with `>` chevron, spec pills)
  - Right-side two `DirectorDockQuickTile` square slots (`首幀 / 尾幀` style tiles with `+` badge, optional `可選` pill, or preview image/video)
  - High-contrast lime Generate button (`#d8ff3e`, `生成`, `✦` credit badge, spinner when busy).

- [ ] **Step 4: Run TypeScript check and existing tests**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/app/director-dock/
git commit -m "feat(director-dock): add stage, hero, panel, and composer primitives"
```

---

### Task 3: Upgrade Explainer Video & Talking Head (`NewProjectForm` & `VideoEditorDialog`)

**Files:**
- Create: `src/presentation/components/app/projects/new/director-dock-brief.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx`
- Modify: `src/presentation/components/app/projects/[id]/video-editor-dialog.tsx`

**Interfaces:**
- Consumes: `DirectorDockStage`, `DirectorDockHero`, `DirectorDockPanel`, `DirectorDockComposer` from `@/presentation/components/app/director-dock`
- Produces: `DirectorDockBrief` rendered inside `NewProjectForm` when `viewing === 0` and `setupMode === "quick"`, while keeping `setupMode === "details"` (the 4-step wizard) accessible via the top-right `完整設定 (4步)` toggle button, and reusing `SkillSelectDialog`, `StyleSelectDialog`, `CharacterSelectDialog`, `DirectorBackgroundSelectDialog`, and `StoryboardDraftsStep` modal.

- [ ] **Step 1: Create `src/presentation/components/app/projects/new/director-dock-brief.tsx`**

Map all `NewProjectForm` state onto the Director Dock:
- **Left Mode Rail**:
  - Item 1: `解說` (`explainer`, switches to default explainer skill when currently on talking-head)
  - Item 2: `開講` (`talking-head`, switches to `TALKING_HEAD_SKILL_SLUG`)
  - Item 3: `4步設定` (switches `setupMode` to `"details"`)
- **Director Panel (`🎬 導演面板`)**:
  - **Cell 1 (Cast Slots, `data-tour-id="character-card"`)**: `👤+` button + avatar slots (`buildCastSlotItems`), clicking opens `CharacterSelectDialog` (and `CharacterManageDialog` for outfit/preset).
  - **Cell 2 (`data-tour-id="visual-style-card"`)**:
    - For Explainer: `DirectorDockStepperCell` with active style thumbnail + `視覺風格 / ${styleName}`, `▴/▾` cycles styles, click opens `StyleSelectDialog`.
    - For Talking Head: `DirectorDockStepperCell` with active pose thumbnail + `鏡頭姿勢 / ${poseLabel}`, `▴/▾` cycles `TALKING_HEAD_POSE_OPTIONS`, click opens pose/style selector.
  - **Cell 3 (Pace & Voice)**: `DirectorDockCurveCell` with `語速 · ${voiceLabel}` and `${paceLabel}`, `▴/▾` cycles speech pace (`slow` / `normal` / `fast`), click toggles voice gender (`female` / `male`) or opens voice/subtitle popover.
  - **Cell 4 (Duration / Acting Note)**:
    - For Explainer: `DirectorDockDurationCell` with `時長` and `Auto / 15s / 30s / 60s` (`cycleOption` on arrows or click).
    - For Talking Head: `DirectorDockDurationCell` showing VO duration or `演技指示` trigger to edit `source` acting instruction in an inline popover.
- **Composer (`data-tour-id="instruction-card"`)**:
  - **Prompt Textarea**: `source` for Explainer; `spokenScript` for Talking Head.
  - **Plus (`+`) Popover**: Sample scripts (`SampleScriptBar`), Product selector (`ProductDropdown`), Logo upload (when `bookend`), or Acting instruction editor (when `talkingHead`).
  - **Bottom Pills**:
    - Primary Director Pill (`data-tour-id="video-type-card"`): Selected director icon + title (`${skillTitle} >`), click opens `SkillSelectDialog`.
    - Aspect Ratio Pill: `▭ ${aspectRatio || "9:16"}`, click cycles `9:16` → `16:9` → `1:1`.
    - Language Pill: `🌐 ${languageLabel}`, click cycles `yue` → `zh` → `en` → `ja`.
    - Scene Text / Drafts Pill: For Explainer, `- ${clipDrafts.length}/4 +` button that opens `StoryboardDraftsStep` in a modal dialog; for Talking Head, `字幕: ${sceneTextLabel}` pill.
  - **Right Quick Tiles**:
    - Explainer: Tile 1 = `風格` (`StyleSelectDialog`), Tile 2 = `參考圖` (`可選`, opens Reference Images / Director Background dialog).
    - Talking Head: Tile 1 = `背景` (`可選`, opens Talking Head / Director Background dialog), Tile 2 = `配音` (`可選`, opens VO upload / mic recorder modal).
  - **Generate Button**: Submits the form (`生成` + `✦ Auto` or credit estimate).

- [ ] **Step 2: Wire `DirectorDockBrief` into `src/presentation/components/app/projects/new/new-project-form.tsx` and update `video-editor-dialog.tsx`**

When `viewing === 0 && setupMode === "quick"`, render `DirectorDockBrief` inside a dark full-bleed container. When `setupMode === "details"`, show a prominent `← 返回導演工作台 (Director Dock)` button in `BriefSetupModeBar` so users can jump back anytime.

- [ ] **Step 3: Run typecheck, lint, and tests**

Run: `npx tsc --noEmit && npx eslint src/presentation/components/app/projects/new/director-dock-brief.tsx src/presentation/components/app/projects/new/new-project-form.tsx && npx tsx --test 'src/presentation/components/app/projects/**/*.test.ts'`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/app/projects/new/director-dock-brief.tsx src/presentation/components/app/projects/new/new-project-form.tsx src/presentation/components/app/projects/[id]/video-editor-dialog.tsx
git commit -m "feat(video-create): upgrade Explainer and Talking Head to Director Dock UI"
```

---

### Task 4: Upgrade Life Studio (`LifeDesk` in `/app/life`)

**Files:**
- Modify: `src/presentation/components/app/life/life-desk.tsx`

**Interfaces:**
- Consumes: `DirectorDockStage`, `DirectorDockHero`, `DirectorDockPanel`, `DirectorDockStepperCell`, `DirectorDockCurveCell`, `DirectorDockDurationCell`, `DirectorDockComposer`, `DirectorDockQuickTile` from `@/presentation/components/app/director-dock`
- Preserves: `LifeDesk` props (`characters`, `shots`, `initialCharacterId`, `subscribed`), polling, `LifeDressDialog`, `LifeTemplateDialog`, `LifePoseDialog`, `LifeRecentDrawer`, and multi-color remark canvas (`drawRemarksOnContext`).

- [ ] **Step 1: Refactor `src/presentation/components/app/life/life-desk.tsx` to use `<DirectorDockStage>`**

Map `LifeDesk` controls onto the Director Dock:
- **Top Bar**: Left shows active character badge + `換裝 / 造型` button; Right shows `歷史紀錄 (${visibleShots.length})` button (`LifeRecentOpenButton`).
- **Left Mode Rail**: Switches `createMode` between:
  1. `模板` (`post-template`)
  2. `實景` (`place-in-scene`)
  3. `換人` (`replace-person`)
- **Director Panel (`🎬 導演面板`)**:
  - **Cell 1 (Character & Look)**: Avatar slots for `people` + `換裝` trigger (`setDressOpen(true)`).
  - **Cell 2 (Post Template)**: `DirectorDockStepperCell` showing active template thumbnail/title (or `隨機靈感`), clicking opens `LifeTemplateDialog`.
  - **Cell 3 (Body Pose)**: `DirectorDockCurveCell` showing selected pose (`poseId` or `自動姿勢`), clicking opens `LifePoseDialog`.
  - **Cell 4 (Wardrobe Override)**: `DirectorDockDurationCell` showing active wardrobe count (`服飾微調`), clicking opens wardrobe override modal/popover (`LifeWardrobePicker`).
- **Composer**:
  - **Top Media Slot**: When `sceneUrl` is present in `place-in-scene` or `replace-person`, renders a compact interactive annotation bar with the **Canvas Remark Editor** (`#1`, `#2` color pins + brush strokes) so users can draw on `sceneUrl` right inside the dock!
  - **Prompt Textarea**: `customInstruction` (or `place` when in search mode).
  - **Plus (`+`) Menu**: Quick shortcuts (`SCENE_PLACE_SHORTCUTS`, `隨機貼文靈感`, `搜尋實景地點`).
  - **Bottom Pills**:
    - Mode Pill (`IG 貼文模板 >` / `融入實景 >` / `局部換人 >`)
    - Location Pill (`📍 ${place || "輸入城市/地點"}` — click to edit/search place with `onSearch`)
    - Pose Pill (`姿勢: ${poseId || "自動"}`)
  - **Right Quick Tiles**:
    - Tile 1 (`構圖參考`): Uploads/displays `compositionRefUrl` (for `post-template`) or character look preview.
    - Tile 2 (`場景底圖`): Uploads/displays `sceneUrl` (triggers hidden file input for `onUpload`).
  - **Generate Button**: Calls `onGenerate()`, displays `生成` + `✦ ${FRAME_COST}`.
- **Bottom Gallery**: Renders `LifeShotGrid` below the dock so newly generated shots appear immediately, plus keeps `LifeRecentDrawer` and `LifePhotoEditor` modal intact.

- [ ] **Step 2: Run typecheck, lint, and Life unit tests**

Run: `npx tsc --noEmit && npx eslint src/presentation/components/app/life/life-desk.tsx && npx tsx --test 'src/presentation/components/app/life/*.test.ts'`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/app/life/life-desk.tsx
git commit -m "feat(life): upgrade Life studio to unified Director Dock UI"
```

---

### Task 5: Upgrade Scro Swap (`JutsuStudio` in `/app/scroswap`)

**Files:**
- Modify: `src/presentation/components/app/jutsu/jutsu-studio.tsx`

**Interfaces:**
- Consumes: `DirectorDockStage`, `DirectorDockHero`, `DirectorDockPanel`, `DirectorDockStepperCell`, `DirectorDockCurveCell`, `DirectorDockDurationCell`, `DirectorDockComposer`, `DirectorDockQuickTile` from `@/presentation/components/app/director-dock`
- Preserves: `JutsuStudio` props (`characters`, `customWardrobeItems`, `initialJobs`), SAM 3 multi-person detection (`runFramePeopleDetection`, `JutsuPersonRleOverlay`, `JutsuPersonTabsBar`), `JutsuRelightPicker`, `CharacterManageDialog`, `ScroSwapHistoryDialog`, and `ScroSwapHistoryPanel`.

- [ ] **Step 1: Refactor `src/presentation/components/app/jutsu/jutsu-studio.tsx` to use `<DirectorDockStage>`**

Map `JutsuStudio` onto the Director Dock:
- **Top Bar**: Left badge `Scro Swap · 角色動作遷移`; Right `歷史紀錄 (${jobs.length})` button (`setHistoryOpen(true)`).
- **Left Mode Rail**: Switches between `預設造型` (`presets`) and `歷史版本` (`historical`).
- **Director Panel (`🎬 導演面板`)**:
  - **Cell 1 (Target Character & Look)**: Character avatar selector + `管理造型` button (`setManagingCharacter(true)`).
  - **Cell 2 (Relight)**: `DirectorDockStepperCell` with relight preview thumb + `光影 / ${relightEnabled ? relightId : "原片光線"}`, clicking toggles/opens `JutsuRelightPicker` popover.
  - **Cell 3 (Motion & Mask)**: `DirectorDockCurveCell` with `遮罩: ${maskMargin}` & `${noLipSync ? "鎖定嘴型" : "嘴型同步"}`, arrows cycle `maskMargin` (`tight` / `normal` / `loose`), click opens motion/mask options popover (`hatFix`, `noLipSync`, `keepSourceAudio`, `applyColorFixOnRender`).
  - **Cell 4 (Section Length)**: `DirectorDockDurationCell` with `截取 ${sectionLength}s` (start `${sectionStart}s`), arrows adjust `sectionLength` (`2s–15s`), click opens start/length popover.
- **Composer**:
  - **Top Media Slot**: When `sourceVideoUrl` is loaded, displays the interactive **SAM 3 Person Detection stage** (`videoRef` / `imageRef` + `JutsuPersonRleOverlay` + `JutsuPersonTabsBar`) and compact character look strip so users can click any detected person (`#1`, `#2`) and assign their replacement character look directly!
  - **Prompt Textarea**: `customLightPrompt` ("描述光線氣氛或動作細節（選填，開啟光影重打時生效）...").
  - **Bottom Pills**:
    - `+` button: Triggers source media upload (`MP4 / MOV / GIF / PNG`).
    - Resolution Pill: `Scro Swap ${motionSize}p >` (cycles `512` → `768` → `1376`).
    - Audio Pill: `原聲: ${keepSourceAudio ? "保留" : "靜音"}`.
    - Color Fix Pill: `自動校色: ${applyColorFixOnRender ? "開" : "關"}`.
    - Detect People Pill (when `sourceVideoUrl` exists): `🔍 重新偵測人物`.
  - **Right Quick Tiles**:
    - Tile 1 (`來源影片`): Preview/upload `sourceVideoUrl`.
    - Tile 2 (`替換角色`): Preview active character look (`uploadedPhotoUrl || selectedLookUrl`), click to upload custom photo or pick look.
  - **Generate Button**: Calls `onSubmit()`, shows `生成` + `✦ 2K`.
- **Bottom Active Job & History**: When `activeJob` is present or rendering, renders `ScroSwapHistoryPanel` below the dock alongside `ScroSwapHistoryDialog`.

- [ ] **Step 2: Run typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/presentation/components/app/jutsu/jutsu-studio.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/app/jutsu/jutsu-studio.tsx
git commit -m "feat(scroswap): upgrade JutsuStudio to unified Director Dock UI"
```

---

### Task 6: Upgrade Teleport (`TeleportStudio` in `/app/teleport`)

**Files:**
- Modify: `src/presentation/components/app/teleport/teleport-studio.tsx`

**Interfaces:**
- Consumes: `DirectorDockStage`, `DirectorDockHero`, `DirectorDockPanel`, `DirectorDockStepperCell`, `DirectorDockCurveCell`, `DirectorDockDurationCell`, `DirectorDockComposer`, `DirectorDockQuickTile` from `@/presentation/components/app/director-dock`
- Preserves: `TeleportStudio` props (`initialJobs`), `startTeleportJobAction`, `pollTeleportJobStatusAction`, `deleteTeleportJobAction`, `TeleportHistoryDialog`, and `TeleportHistoryPanel`.

- [ ] **Step 1: Refactor `src/presentation/components/app/teleport/teleport-studio.tsx` to use `<DirectorDockStage>`**

Map `TeleportStudio` onto the Director Dock:
- **Top Bar**: Left badge `Teleport · 影片瞬移換場`; Right `歷史紀錄 (${jobs.length})` button (`setHistoryOpen(true)`).
- **Left Mode Rail**: Switches between `實景底圖` (Scene Photo + Mood) and `文字生景` (Prompt Plate).
- **Director Panel (`🎬 導演面板`)**:
  - **Cell 1 (Source & Scene Status)**: Compact status slots for source clip & scene plate.
  - **Cell 2 (Start Time)**: `DirectorDockStepperCell` for `起始秒數 / ${startText}s` (`▴/▾` increments/decrements by `0.5s`, click opens exact number input).
  - **Cell 3 (Audio & Color)**: `DirectorDockCurveCell` for `音訊與光影 / ${keepSourceAudio ? "保留原聲" : "靜音"} · ${applyColorFix ? "校色" : "原色"}` (click toggles `keepSourceAudio` / `applyColorFix`).
  - **Cell 4 (Clip Length)**: `DirectorDockDurationCell` for `時長 / ${lengthText}s` (`▴/▾` adjusts `2–15s`).
- **Composer**:
  - **Top Media Slot**: When `sourceVideoUrl` is uploaded, shows a compact collapsible video preview bar so the user can verify the `startText` timestamp.
  - **Prompt Textarea**: `scenePrompt` ("描述你想瞬移過去的場景與光線氣氛（例如：東京澀谷霓虹雨夜街頭、陽光海灘日落）...").
  - **Bottom Pills**:
    - `+` button: Quick upload source video or scene photo.
    - Engine Pill: `Teleport H3 2K >`.
    - Aspect Ratio Pill: `▭ 9:16`.
    - Audio Pill: `🔊 原聲 ${keepSourceAudio ? "ON" : "OFF"}`.
    - Color Pill: `✨ 自動調色 ${applyColorFix ? "ON" : "OFF"}`.
  - **Right Quick Tiles**:
    - Tile 1 (`來源影片`): Preview/upload `sourceVideoUrl` (MP4/MOV).
    - Tile 2 (`場景圖 · 可選`): Preview/upload `sceneImageUrl` (PNG/JPG/WebP).
  - **Generate Button**: Calls `onSubmit()`, shows `生成` + `✦ 2K`.
- **Bottom Active Job & History**: Renders `TeleportHistoryPanel` below the dock when `jobs.length > 0` and keeps `TeleportHistoryDialog` accessible from the top-right button.

- [ ] **Step 2: Run full verification (typecheck, lint, unit tests)**

Run: `npx tsc --noEmit && npx eslint src/presentation/components/app/director-dock/ src/presentation/components/app/teleport/teleport-studio.tsx src/presentation/components/app/jutsu/jutsu-studio.tsx src/presentation/components/app/life/life-desk.tsx src/presentation/components/app/projects/new/director-dock-brief.tsx && npx tsx --test 'src/presentation/**/*.test.ts'`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/app/teleport/teleport-studio.tsx
git commit -m "feat(teleport): upgrade TeleportStudio to unified Director Dock UI"
```
