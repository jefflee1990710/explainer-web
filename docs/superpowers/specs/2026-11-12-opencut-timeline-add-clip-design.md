# OpenCut Timeline Add Clip Design

## Problem Statement & Intent

Users working in the OpenCut multi-track timeline editor need an intuitive, contextual way to add new AI-generated clips directly into their current project. Today, adding clips or videos happens either outside the timeline (via sidebar assets menus or external navigation) or through clip-replacement tools (such as OpenEdit Scro Swap / Teleport which target an existing clip).

This feature introduces an on-timeline creation entrypoint (`+ Add Clip` / `+ 新增片段`) directly on the OpenCut `TimelineToolbar` above the tracks. It opens a two-step guided modal:
1. **Step 1 (Mode Selection)**: Pick between 4 generation workflows:
   - **Simple Video**: ComfyUI `ref2va` fast video generation (text prompt + optional character / reference stills).
   - **Explainer / Director**: AI Storyboard Director clip generation (script, voiceover, character, style, duration).
   - **Scro Swap**: Character or object motion swap (using an existing timeline clip or an uploaded video).
   - **Teleport**: Background and scene replacement (using an existing timeline clip or an uploaded video).
2. **Step 2 (Creation Form)**: Configure parameters for the chosen mode, with the insertion slot automatically pre-filled based on the timeline's active **Playhead position**.
3. **Settlement**: Upon submission, the clip is queued, created in the current project, inserted at the designated slot, and automatically placed/synchronized onto the OpenCut timeline.

---

## Goals & Non-Goals

### Goals
- Place a prominent, accessible `+ Add Clip` / `+ 新增片段` button in OpenCut `TimelineToolbar` (left section).
- Capture playhead position (`editor.playback.getCurrentTime()`) when clicked and map it to the corresponding storyboard insertion slot (`insertAt`).
- Step 1 Dialog: Beautiful, responsive card selector for the 4 generation modes with icons, descriptions, and credit indicators.
- Step 2 Dialog: Mode-specific forms:
  - **Explainer**: Integrated single-clip director flow (script/prompt, character, style, voice, duration).
  - **Simple Video**: Fast text-to-video / ref2va prompt + character / reference image picker.
  - **Scro Swap**: Choice between "Select Existing Clip" (dropdown pre-selected to playhead clip) or "Upload New Video", plus character reference.
  - **Teleport**: Choice between "Select Existing Clip" or "Upload New Video", plus scene plate / scene prompt.
- Insertion & Timeline Sync: Insert the newly generated clip at `insertAt` into `project.clips` and storyboard `phaseA.clips`, shift subsequent clip numbers, and update OpenCut timeline elements.

### Non-Goals
- Real-time video frame splitting during mid-generation (the new clip is inserted as a discrete storyboard clip between slots, rather than splitting an existing clip's raw media into two half-clips).
- Arbitrary multi-track audio generation in this dialog (covered by the existing Auto SFX / Auto BGM toolbar buttons).

---

## Approaches Considered

### Approach A: Two-Step Guided Modal (Chosen)
- **Flow**: Toolbar button -> Step 1 (Mode Selection Modal) -> Step 2 (Dedicated Creation Form).
- **Pros**: Clear mental model, ample space to explain parameters and credit consumption, extensible for future modes (e.g. Extend, Talking Head).
- **Cons**: Requires two dialog steps instead of one.

### Approach B: Direct Dropdown Menu on Toolbar
- **Flow**: Toolbar button has a dropdown menu (`+ Add Clip ▾`) listing the 4 modes. Selecting one directly opens that mode's creation dialog.
- **Pros**: Saves one click.
- **Cons**: Lacks visual previews, explanations, and credit costs; becomes cramped on smaller screens or as modes expand.

**Decision**: Approach A was selected for its superior UX, clarity, and scalability.

---

## Detailed Design & Architecture

## Detailed Design & Architecture

### 1. OpenCut Timeline Toolbar Entrypoint
- **File**: `src/opencut/timeline/components/timeline-toolbar.tsx` (`ToolbarLeftSection`).
- **Component**: A primary styled button:
  ```tsx
  <Button
    size="sm"
    variant="default"
    className="h-7 gap-1.5 px-2.5 text-xs font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
    onClick={handleAddClipClick}
  >
    <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
    <span>{oc.timelineToolbar?.addClip ?? "新增片段"}</span>
  </Button>
  ```
- **Playhead & Slot Resolution**:
  - The toolbar reads the active element under the playhead directly from the timeline (`editor.timeline.getElementsWithTracks`), identifying `activeClipNumber` from `elementScroClipNumber`.
  - Also captures `playheadSeconds = editor.playback.getCurrentTime()`.
  - Dispatches message via `sendToScro({ type: "scro-timeline-add-clip", playheadSeconds, activeClipNumber }, window.location.origin)`.
  - If playhead sits over Clip $N$, default `insertAt` is $N + 1$ (inserting right after Clip $N$). If playhead is before Clip 1, default `insertAt` is 1. If after the last clip, default `insertAt` is `clips.length + 1`.
  - The creation form provides a slot dropdown allowing the user to override this position.

### 2. Step 1: Mode Selection Dialog (`OpenCutAddClipSelectionDialog`)
- Modal presentation with 4 interactive cards:
  1. **Simple Video (Comfy ref2va)**:
     - Badge: 快速生成 · 2 點/秒
     - Description: 提示詞快速生片，可搭配角色面部或風格參考圖。若未提供首格，系統自動以 Seedream 5.0 Pro 預先繪製首格。
  2. **Explainer (AI 導演解說)**:
     - Badge: 故事分鏡 · 2 點/秒
     - Description: 輸入文案腳本，自動合成擬真配音、角色連續性與分鏡畫面。
  3. **Scro Swap (AI 換角/換物)**:
     - Badge: 角色動態置換
     - Description: 選取既有片段或上傳全新影片（自動取前 6 秒或自選至多 15 秒），生成並**新增插入**為全新片段（不覆蓋原片段）。
  4. **Teleport (AI 換背景場景)**:
     - Badge: 場景穿越
     - Description: 保留人物主體與動作，置換背景為全新場景，生成並**新增插入**為全新片段。

### 3. Step 2: Dedicated Creation Forms & Engine Handling

#### A. Explainer Form
- Uses single-clip director flow (`mode: "single_clip"`):
  - Script / Prompt input.
  - Character picker & style selector.
  - Voice selection (voice gender, speech pace, language).
  - Duration picker (5s to 12s, default 6s).
  - Slot selector (`insertAt`).
- Action: `appendDirectorClipAction({ videoId, mode: "single_clip", insertAt, ... })`.

#### B. Simple Video Form
- Simple prompt textarea.
- Aspect ratio (matches project aspect ratio).
- Character selector & reference images (up to 4 stills).
- Optional first frame / last frame. If first frame is omitted, background task uses Seedream 5.0 Pro to generate the start frame from prompt and character reference before submitting video.
- Engine routing: If `COMFY_BASE_URL` is set, submits ComfyUI ref2va; otherwise cleanly falls back to OpenRouter `minimax/hailuo-3` with the generated first frame.
- Action: `appendSimpleClipAction({ videoId, insertAt, prompt, characterId, referenceImageUrls, durationSeconds, ... })`.

#### C. Scro Swap Form (Insert as New Clip)
- Source selector tab:
  - Tab 1: **選擇時間軸片段** — Dropdown listing all completed clips in the project (pre-selected to `activeClipNumber`).
  - Tab 2: **上傳新影片** — File upload (clamps duration to 2..15s, default 6s).
- Target Character picker or custom reference images.
- Behavior: Duplicates the source clip's row structure into a new slot at `insertAt` via `insertClips`, sets status to `in_progress`, and starts `startScroSwapJob` targeting `newClipNumber`. Original clip remains completely untouched.

#### D. Teleport Form (Insert as New Clip)
- Source selector tab:
  - Tab 1: **選擇時間軸片段** — Dropdown of completed project clips (pre-selected to `activeClipNumber`).
  - Tab 2: **上傳新影片** — File upload (clamps duration to 2..15s, default 6s).
- Scene target: Scene image upload or Scene prompt.
- Behavior: Inserts a new slot at `insertAt` via `insertClips` and runs `startTeleportJob` targeting `newClipNumber`.

### 4. OpenCut Timeline Synchronization & Ripple Insert
- Upon job submission:
  - MongoDB updates `project.phaseA.clips` and `project.clips` with the new placeholder clip at `insertAt`.
  - Notification sent to OpenCut editor host (`onProject(updatedProject)` / `scroHost().notifyClipsUpdated`).
  - OpenCut timeline inserts the new clip element on the main track at the playhead slot, shifting all subsequent clips and attached audio/subtitles rightward (Ripple Shift) to preserve existing manual edits.
- Upon job completion:
  - Task runner reconciles the clip with the final `blobUrl`, updating the timeline element in place.

---

## Security, Quotas & Error Handling
- **Credit Check**: Validates and spends credits according to the chosen mode (2 credits/s for Explainer and Simple Comfy H3; standard Jutsu rates for Swap/Teleport).
- **Concurrency**: Guarded against concurrent duplicate insertions using MongoDB atomic `$set` and timestamp checks.
- **Failures**: If video generation fails, the clip displays error status with retry option, and spent credits are refunded per standard system policy.

---

## What is Left to the Builder
- Precise CSS styling of the card grid in `OpenCutAddClipSelectionDialog` matching `--studio-*` design tokens.
- Localization strings for `zh-TW`, `en`, `zh-CN`, `ja`, `ko` in `src/opencut/i18n/` and `src/util/i18n/messages/`.
- Unit tests verifying `resolvePlayheadInsertSlot`, `appendSimpleClipAction`, and timeline insertion commands.
