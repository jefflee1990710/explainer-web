# Explainer Exclusive Auto On-Screen Text via SAM 3 Safe-Zone Design

## Intent & Why
Explainer videos rely heavily on strong visual hooks and clear textual anchors to maximize viewer retention on Reels, TikTok, and Shorts.
Currently, our system features an advanced AI On-Screen Text pipeline (`src/service/opencut/on-screen-text.ts` + `safe-text-zone.ts`), which uses SAM-3 face segmentation to avoid facial occlusion, analyzes pixel variance to locate clean blank space, paints the selected artistic text style (Torn Paper, Marker, Neon, Comic, Chalk, Gold, etc.) via Seedream 5.0 Pro, and extracts a feathered transparent patch (with optional ComfyUI H3 Masked Latent video inpainting).

However, this feature currently requires creators to finish video generation, open the OpenCut editor, find the clip, open the asset drawer, choose a style, and manually generate the text.
By making this feature **exclusive to Explainer videos** and **automated at project creation time**:
1. Creators can enable On-Screen Text during the initial brief dock setup, pick an artistic text style with visual card previews, and choose the text coverage (`Hook Only` [default] vs. `All Clips`).
2. When the Explainer storyboard and clips are generated, the system automatically schedules the safe-zone detection and artistic text generation in the background, populating `project.onscreenTexts` without requiring any manual editor work.
3. Upon opening the video or exporting, the artistic text is already positioned in the ideal safe zone.

---

## Goals & Non-Goals

### Goals
- **Explainer Exclusivity**:
  - The artistic text style selector and automated safe-zone placement are exclusive to the Explainer creation flow (`useCase === "explainer"` / `skillSlug === "explainer"`).
  - Talking Head and Story creation flows remain unaffected.
- **Dock Creation UI**:
  - In `director-dock-brief.tsx` (when `kind === "explainer"`), provide an On-Screen Text control showing the active style thumbnail, name, and coverage mode.
  - A modal dialog (`ExplainerOnScreenTextDialog`) allowing users to:
    - Toggle On-Screen Text on/off.
    - Pick from the 13 built-in visual text styles (`subtitle-look.ts`: Torn Paper, Marker, Neon, Comic, Chalk, Gold, etc.) or custom user styles.
    - Toggle Coverage (Approach C):
      - **Hook Only (僅第 1 鏡頭 Hook 標題)** — *Default*
      - **All Clips (全部分鏡重點字卡)**
- **Automated Pipeline**:
  - Automatically resolve text lines:
    - Clip 1: The proposal's localized hook title (`project.phaseA.localizedTitle` or Scene 1 `「...」` text).
    - Clip 2..N (when coverage is "all"): The clip's localized core hook or spoken sentence.
  - Automatically detect face-safe blank zones on each clip's start frame using SAM-3 + variance heuristics (`detectCenteredFaceSafeTextZone`).
  - Generate the Seedream 5.0 Pro artistic text patch (`inSceneOnScreenTextPrompt`), extract the feathered transparent patch PNG, and populate `project.onscreenTexts`.
  - When ComfyUI is enabled, optionally run H3 Masked Latent video inpainting.
- **OpenCut & Playback Compatibility**:
  - `project.onscreenTexts` is natively rendered on the OpenCut timeline and in browser video compositing.

### Non-Goals
- Talking Head subtitle overlay changes (Talking Head continues using its dedicated avatar and voice pipeline).
- Removing OpenCut's manual On-Screen Text editor (creators can still fine-tune or add additional text layers inside OpenCut).

---

## Approaches Considered

- **Approach A: Hook Only (Clip 1 only)**
  - Automatically generates artistic text only for the first clip (the scroll-stopping hook).
  - *Pros*: Quickest, lowest credit overhead, most impactful 3-second hook retention.
  - *Cons*: Users wanting captions or titles across the whole video cannot do so automatically.
- **Approach B: All Clips only**
  - Automatically generates artistic text for every clip in the storyboard.
  - *Pros*: Complete coverage throughout the video.
  - *Cons*: Increases credit cost and generation latency when users only wanted a punchy opening title.
- **Approach C: User Toggleable in Brief Dock — Default "Hook Only" with "All Clips" Option (Selected)**
  - The brief dock defaults to "Hook Only", with a one-click toggle to "All Clips".
  - *Pros*: Gives creators full control over cost and visual density while keeping the default experience lightweight and punchy.
  - Selected by user in message 1673.

---

## Architecture & Data Flow

### 1. Data Model (`src/model/project.ts`)
Add configuration fields to `Project` and `PublicVideo`:
```typescript
// Explainer auto on-screen text configuration
onScreenTextStyleId?: string; // e.g. "clean" (Torn Paper), "handwritten" (Marker), "neon", etc.
onScreenTextCoverage?: "hook" | "all"; // "hook" (default) or "all"
```

### 2. Frontend UI (`src/presentation/components/app/projects/new/`)
- **`director-dock-brief.tsx`**:
  - For Explainer (`!talkingHead && !isStory`), replace the simple `字卡: ${sceneTextLabel}` pill with a dedicated `ExplainerOnScreenTextPill`:
    - Shows an icon / thumbnail of the selected artistic text style (e.g. Torn Paper icon), name, and coverage tag: `撕紙 · Hook` or `撕紙 · 全分鏡`.
    - Clicking opens `ExplainerOnScreenTextModal`.
- **`explainer-on-screen-text-dialog.tsx`**:
  - Clean modal matching Scro design system (`tokens.css`, `Dialog`).
  - Enable / Disable switch.
  - Coverage toggle: Segmented control between `僅第 1 鏡頭 Hook 標題 (推薦)` and `全部分鏡重點字卡`.
  - 13 Artistic Text Style Cards with visual previews (`PREVIEW` from `subtitle-look.ts`), showing style name, sample graphic, and selected state.

### 3. Server Actions & Pipeline (`src/service/director/auto-onscreen-text.ts`)
- **`enqueueExplainerAutoOnScreenText(projectId: ObjectId)`**:
  - Called automatically when Explainer storyboard frames are generated (or on video completion).
  - Reads `project.onScreenTextStyleId` and `project.onScreenTextCoverage`.
  - If disabled or missing style, no-op.
  - Gathers target clips:
    - If `coverage === "hook"`: targets Clip 0 with text from `project.phaseA.localizedTitle` (or Clip 1 hook text).
    - If `coverage === "all"`: targets each Clip `i` with the clip's summary / key line.
  - For each target clip:
    - Deduplicates to avoid re-generating if an item already exists in `project.onscreenTexts`.
    - Schedules `enqueueOpencutOnScreenTextAction` / `sendOnscreenText` with `clipIndex` and `playheadSeconds`.
    - Runs SAM-3 face avoidance (`detectCenteredFaceSafeTextZone`) to find the best blank area (`SafeTextBox`).
    - Generates Seedream artistic text patch and persists to `project.onscreenTexts`.

### 4. OpenCut & Export Synchronization
- Existing `opencut-direct-desk.tsx` already observes `project.onscreenTexts` and synchronizes timeline items automatically.
- Generated items carry `status: "completed"`, `blobUrl`, `offsetX`, `offsetY`, so they render seamlessly in the player and export pipeline.

---

## Verification & Testing Plan
1. **Model & Validation Tests**:
   - Verify `Project` schema accepts `onScreenTextStyleId` and `onScreenTextCoverage`.
2. **Auto On-Screen Text Logic Tests**:
   - Unit tests in `src/service/director/auto-onscreen-text.test.ts`:
     - Resolves correct hook title for Clip 1 in "hook" mode.
     - Resolves per-clip text lines in "all" mode.
     - Skips non-explainer projects or projects where text style is not enabled.
3. **UI Integration**:
   - Verify Explainer dock shows the artistic text picker with thumbnail.
   - Verify Talking Head and Story docks do not show the Explainer artistic text picker.
4. **End-to-End Build & Typecheck**:
   - `npx tsc --noEmit`
   - `npx eslint src/...`
