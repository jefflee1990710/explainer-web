# Unified Director Dock Studio Design (Explainer, Talking Head, Life, Scro Swap, Teleport)

**Date**: 2026-11-04  
**Status**: Draft — Pending User Approval

## 1. Intent & Why

Currently, the five primary creation tools in the studio (`Explainer Video`, `Talking Head`, `Life`, `Scro Swap`, and `Teleport`) use multi-card, form-heavy layouts that scatter controls across multiple rows, tabs, and steppers before a user can start generating. Even "Quick Setup" in `NewProjectForm` presents four large cards and long explanatory paragraphs upfront.

The goal is to unify all five creation screens around the sleek, centered **Director Dock (Cinema Studio)** design language from the user's reference screenshot:
1. **Centered Hero Stage**: Three fanned/overlapping showcase cards on top + a bold centered headline (*"讓你的故事鮮活起來"* / tool-specific hero title).
2. **Collapsible Director Panel (`🎬 導演面板`)**: A single compact horizontal bar directly above the prompt composer, holding character/cast slots, visual style/pose/template tiles, voice/relight/motion controls, and duration/section selectors separated by subtle vertical dividers.
3. **Main Prompt Composer Dock**: A dark, rounded composer container with a clean borderless prompt/script input on top, a compact pill toolbar at bottom-left (`+` attachment/sample trigger, primary model/director selector pill, aspect ratio pill, language/quality pills), two quick-attachment square tiles (`首幀 / 尾幀` style slots) on the right, and a high-contrast lime **Generate (`生成`)** button.
4. **Left Floating Vertical Mode Pill**: A vertical two/multi-button pill floating to the left of the composer dock for switching modes rapidly.

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Build a shared `<DirectorDockShell>` component family (`src/presentation/components/app/director-dock/`) implementing the dark cinema theme (`#0c0d10` canvas, `#17181d` / `#1e2028` dock surfaces, `#d4ff33` / `#c6f24b` lime primary button, subtle `rgba(255,255,255,0.08)` borders).
- Upgrade all 5 creation studios to use `<DirectorDockShell>`:
  1. **Explainer Video** (`/app/explainers`, `/app/videos/new?useCase=explainer`, `/app/projects/[id]/videos/new`)
  2. **Talking Head** (`/app/talking-heads`, `/app/videos/new?useCase=talking-head`)
  3. **Life** (`/app/life`)
  4. **Scro Swap** (`/app/scroswap`)
  5. **Teleport** (`/app/teleport`)
- Preserve 100% of existing capabilities, backend Server Actions, credit gates, polling, history drawers/dialogs, SAM 3 person detection in Scro Swap, canvas remark drawing in Life, and the Full Details 4-step wizard / advanced dialogs as accessible popovers/dialogs or secondary mode.

### Non-Goals
- Changing any backend generation pipelines, database schemas, credit costs, or OpenCut video editor (`OpenCutVideoDesk`) once a video enters production (`viewing >= 1`).
- Altering public marketing landing pages (`/explainer`, `/talking-head`, etc.).

### Anti-Goals
- Do not clutter the default Director Dock view with multi-paragraph hints or giant stacked cards.
- Do not break `.studio-app` light-mode CSS rules (`src/presentation/studio/tokens.css`) for other pages or dialogs; scope the dark cinema styling cleanly to `.director-dock-theme` so existing modal dialogs (`SkillSelectDialog`, `StyleSelectDialog`, `CharacterSelectDialog`, `UseCaseHistoryDialog`, etc.) continue to render cleanly without CSS collisions.

## 3. Constraints

- **CSS Specificity in `src/presentation/studio/tokens.css`**: Unlayered `.studio-app` selectors override Tailwind classes on buttons, inputs, and cards (e.g., `.studio-app :is(input, textarea, select)` forces `background-color: #fff`). The Director Dock components must use a dedicated `.director-dock-stage` class with explicit rules in `tokens.css` (or scoped overrides) so dark surfaces, borderless textareas, square attachment tiles, and the lime Generate button render identically to the reference screenshot.
- **Responsive Layout**: On desktop (`md+`), the left floating vertical mode rail sits beside the composer dock and the Director Panel cells sit in a single horizontal row. On mobile (`<md`), the vertical mode rail collapses into a horizontal pill bar above the dock and the Director Panel cells wrap cleanly into a 2-column grid.
- **i18n**: All labels must support `zh-Hant` (Traditional Chinese), `zh-Hans` (Simplified Chinese), and `en` (English) via `useI18n()`.

## 4. Approaches Considered

### Approach A: Shared `<DirectorDockShell>` Component Library + Simultaneous 5-Studio Upgrade (Selected)
- Create a shared set of primitives in `src/presentation/components/app/director-dock/`:
  - `DirectorDockStage`: Full-bleed dark studio wrapper with top-right action slot (Folder picker, History drawer button, Full Details toggle) and centered vertical alignment.
  - `DirectorDockHero`: 3-card fanned showcase visual + title & optional subtitle.
  - `DirectorDockPanel`: Collapsible `🎬 導演面板` header + horizontal segmented strip of `DirectorDockCell` items (cast avatar slots, thumbnail+label stepper tiles, waveform/pace visual tile, duration slider/stepper tile).
  - `DirectorDockComposer`: Left vertical mode rail + main dark composer card (top textarea/media stage, bottom-left pill bar, right-side 2 quick-slot tiles, and lime `生成` CTA button).
- Wire all 5 studios (`NewProjectForm` covering Explainer & Talking Head, `LifeDesk`, `JutsuStudio`, `TeleportStudio`) onto these shared primitives.
- **Why chosen**: Guarantees 100% visual and interactive consistency across all 5 tools and avoids maintaining duplicate dock markup.

### Approach B: Phased Rollout (Explainer/Talking Head first, then Life/Scro Swap/Teleport)
- Rebuild `NewProjectForm` first and leave the other 3 pages on the old white card UI until a second pass.
- **Why rejected**: User explicitly chose Approach A so all 5 creation studios share the new UI immediately.

## 5. Detailed Mapping Across the 5 Studios

### 5.1 Shared Visual Anatomy (Matching Screenshot)
- **Canvas**: Dark charcoal `#0f1014` (`min-h-full flex flex-col items-center justify-center px-4 py-8`).
- **Top Bar (subtle floating header)**: Left shows breadcrumb / folder picker (when in Video Editor) or studio badge; Right shows `歷史紀錄` (History button with count badge) and optional `進階設定` (Full Wizard / Advanced trigger).
- **Hero Showcase**:
  - 3 fanned cards (`w-36 sm:w-44` side cards rotated/scaled behind a central `w-56 sm:w-72 aspect-video` featured card with rounded corners and subtle glow).
  - Headline below: `text-2xl sm:text-4xl font-bold tracking-tight text-white` (e.g., *"讓你的故事鮮活起來"*).
- **Director Panel (`🎬 導演面板`)**:
  - Container: `w-full max-w-4xl rounded-2xl bg-[#1a1b20]/95 border border-white/10 px-3.5 py-2.5`.
  - Header bar: Left `🎬 導演面板` (`text-xs font-semibold text-zinc-400`), Right collapse chevron `⌄` (`aria-expanded`).
  - Body (when expanded): Horizontal flex/grid row of compact cells (`h-14 rounded-xl bg-[#23252c] px-3 flex items-center gap-2.5`) separated by `1px` `bg-white/8` dividers.
- **Left Floating Mode Rail**:
  - Positioned to the left of the composer (`md:absolute md:-left-16 md:top-1/2 md:-translate-y-1/2`), `rounded-2xl bg-[#1a1b20] border border-white/10 p-1.5 flex md:flex-col gap-1`.
- **Main Composer Dock**:
  - Container: `relative w-full max-w-4xl rounded-2xl bg-[#1a1b20]/95 border border-white/10 p-3.5 flex flex-col sm:flex-row items-stretch gap-3`.
  - Left/Main Column (`flex-1 flex flex-col justify-between min-h-[104px]`):
    - Top: Borderless dark textarea (`bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none`) + optional inline preview chip (e.g., uploaded audio player, SAM 3 video preview trigger, or sample script chips).
    - Bottom Pill Toolbar:
      - `+` circular button (`h-7 w-7 rounded-full bg-[#262830] text-zinc-300 hover:text-white`)
      - Primary Director/Mode Pill (`rounded-full bg-[#262830] px-3 py-1 text-xs font-semibold text-zinc-100 flex items-center gap-1.5`)
      - Secondary Spec Pills (Aspect Ratio `9:16`, Language `廣東話`, Voice/Pace/Quality, Storyboard Draft count `1/4`)
  - Right Action Cluster (`flex items-stretch gap-2 shrink-0`):
    - **Slot Tile 1** (`w-20 sm:w-22 rounded-xl bg-[#23252c] border border-white/8 p-2 flex flex-col justify-between cursor-pointer hover:border-white/20`): Top-left `+` icon or thumbnail preview, bottom-left label.
    - **Slot Tile 2** (`w-20 sm:w-22 rounded-xl bg-[#23252c] border border-white/8 p-2 flex flex-col justify-between cursor-pointer hover:border-white/20`): Top-left `+` icon + `可選` badge or thumbnail preview, bottom-left label.
    - **Generate Button**: `w-28 sm:w-32 rounded-xl bg-[#d8ff3e] hover:bg-[#c6f24b] text-[#12141c] font-bold flex flex-col items-center justify-center gap-0.5 shadow-[0_0_24px_rgba(216,255,62,0.25)] disabled:opacity-45`. Shows `生成` + credit badge `✦ N` (or `✦ Auto`).

---

### 5.2 Per-Studio Control Mapping

#### 1. Explainer Video (`NewProjectForm` when `!talkingHead`)
- **Left Vertical Rail**: Switches between `解說 (Explainer)` and `開講 (Talking Head)` (updates `skillSlug` to default Explainer or Talking Head director, or navigates when on dedicated route), plus an `進階 (4步)` button to open the full 4-step wizard view if desired.
- **Director Panel (`🎬 導演面板`) Cells**:
  1. **Cast Slots (`角色`)**: `👤+` button + up to 2 character avatar slots (`44x44` rounded-xl tiles). Clicking opens `CharacterSelectDialog`.
  2. **Visual Style (`風格`)**: Thumbnail of selected `styleId` + label (`視覺風格 / 白板手繪`) with up/down cycle arrows or click to open `StyleSelectDialog`.
  3. **Pace & Voice (`語速 / 聲線`)**: Stylized curve SVG + current speech pace (`正常 / 快速`) & voice gender (`男聲 / 女聲`), clicking cycles or opens popover.
  4. **Duration (`時長`)**: Vertical slider bar visual + `Auto / 15s / 30s / 60s` selector.
- **Composer Box**:
  - **Prompt Textarea**: `source` ("描述你的主題、貼上文章或腳本，使用 @ 或上方角色槽指定角色...").
  - **Bottom Pills**:
    - `+` button: Opens a quick menu for **Sample Scripts (`範例腳本`)**, **Upload Reference Image (`上傳參考圖`)**, or **Products / Logo** (when applicable).
    - **Director Pill**: Selected skill badge + title (`廣東話解說導演 >`), clicking opens `SkillSelectDialog`.
    - **Aspect Ratio Pill**: `9:16` / `16:9` / `1:1` cycle or popover.
    - **Language Pill**: `廣東話` / `國語` / `EN` / `日本語` cycle.
    - **Drafts Pill**: `- 0/4 +` Storyboard Sketch Pad trigger (opens `StoryboardDraftsStep` modal/drawer).
  - **Right Quick Tiles**:
    - **Tile 1 (`風格`)**: Shows active style thumbnail + `風格`, clicking opens `StyleSelectDialog`.
    - **Tile 2 (`參考圖 · 可選`)**: Shows first reference image (or director background if preset-enabled) + `參考圖`, clicking opens reference image uploader/modal.
  - **Generate Button**: `生成` (submits `onSubmit`).

#### 2. Talking Head (`NewProjectForm` when `talkingHead`)
- **Left Vertical Rail**: `解說 (Explainer)` ↔ `開講 (Talking Head)` + `進階`.
- **Director Panel (`🎬 導演面板`) Cells**:
  1. **Cast Slots (`角色`)**: `👤+` character avatar slot(s) (opens `CharacterSelectDialog`).
  2. **Camera Pose (`鏡頭姿勢`)**: Pose preview thumbnail + label (`半身正對 / 特寫`) with up/down cycle or click to pick `talkingHeadPoseId`.
  3. **Pace & Voice (`語速 / 聲線`)**: Curve SVG + pace (`正常`) & voice gender (`女聲 / 男聲`).
  4. **Director Note (`演技指示`)**: Compact cell to view/edit the pre-filled `source` acting instruction in a popover, keeping the main textarea focused on the spoken script.
- **Composer Box**:
  - **Prompt Textarea**: `spokenScript` ("輸入角色要朗讀的講稿，或點擊右側上傳／錄製音訊...").
  - **Bottom Pills**:
    - `+` button: Sample scripts (`範例講稿`) or record/upload voiceover audio.
    - **Director Pill**: Selected Talking Head director (`真人開講導演 >`), clicking opens `SkillSelectDialog`.
    - **Aspect Ratio Pill**: `9:16` / `16:9` / `1:1`.
    - **Language Pill**: `廣東話` / `國語` / `EN` / `日本語`.
  - **Right Quick Tiles**:
    - **Tile 1 (`背景 · 可選`)**: Shows selected custom background image (or preset background) + `背景`, clicking uploads/selects talking-head background.
    - **Tile 2 (`音訊 · 可選`)**: Shows uploaded/recorded VO audio status (`已上傳` or `+`) + `配音`, clicking opens VO audio upload/recorder dialog.
  - **Generate Button**: `生成` (`✦ 15/s`).

#### 3. Life (`LifeDesk` in `/app/life`)
- **Left Vertical Rail**: Switches between the 3 Life creation modes:
  1. `模板 (Post)` (`post-template`)
  2. `場景 (Scene)` (`place-in-scene`)
  3. `換人 (Swap)` (`replace-person`)
- **Director Panel (`🎬 導演面板`) Cells**:
  1. **Character & Look (`角色與穿搭`)**: Selected character avatar + look/preset badge + `換裝` button (opens `LifeDressDialog` / `CharacterMenu`).
  2. **Post Template (`貼文類型`)**: Thumbnail + selected template title (or `隨機靈感`), clicking opens `LifeTemplateDialog`.
  3. **Body Pose (`動作姿勢`)**: Pose icon/thumb + selected pose label (`自動 / 自選姿勢`), clicking opens `LifePoseDialog`.
  4. **Wardrobe Override (`服飾微調`)**: Quick summary of hair/top/bottom overrides, clicking opens wardrobe popover/modal.
- **Composer Box**:
  - **Prompt Textarea**: `customInstruction` / `place` ("描述你的場景、地點或畫面細節..."). When `sceneUrl` is active in `place-in-scene` or `replace-person`, displays an interactive compact preview bar above the textarea with a button to open the full **Canvas Remark / Brush Editor (`標註畫筆 #1 #2`)**.
  - **Bottom Pills**:
    - `+` button: Scene place shortcuts (`自然融入場景` / `自拍視角` / `前景看向鏡頭`) or search real-world place (`搜尋實景`).
    - **Mode Pill**: Current Life mode (`IG 貼文模板 >` / `融入實景 >` / `局部換人 >`).
    - **Place Pill**: City / location input chip (`📍 香港 / 東京`).
  - **Right Quick Tiles**:
    - **Tile 1 (`構圖參考`)**: Composition reference photo (`compositionRefUrl`) upload/preview tile.
    - **Tile 2 (`場景底圖`)**: Scene photo (`sceneUrl`) upload/search/annotate tile.
  - **Generate Button**: `生成` (`✦ ${FRAME_COST}`).
- **Below the Dock / Drawer**: Recent shots for the selected character remain accessible via the top-right `歷史紀錄` drawer button (`LifeRecentDrawer`) AND a clean gallery strip below the dock so newly generated photos appear in real time.

#### 4. Scro Swap (`JutsuStudio` in `/app/scroswap`)
- **Left Vertical Rail**: Switches between `預設造型 (Presets)` and `歷史造型 (Versions)` (or `單人 / 多人標註`).
- **Director Panel (`🎬 導演面板`) Cells**:
  1. **Target Character & Look (`替換角色`)**: Avatar slots for the selected character + look preset (`預設造型`) + `管理造型` trigger (`CharacterManageDialog`).
  2. **Relight (`光影重打`)**: Thumbnail/icon + `自動 / Golden Halo...` toggle & picker (`JutsuRelightPicker`).
  3. **Motion & Mask (`動作與遮罩`)**: Curve visual + mask margin (`緊貼 / 標準 / 寬鬆`), hat fix (`帽子修正`), lip-sync (`嘴型同步`), color fix (`自動校色`).
  4. **Clip Section (`截取片段`)**: `Start (0s)` + `Length (6s)` duration control.
- **Composer Box**:
  - **Top Area**:
    - When `sourceVideoUrl` is uploaded: Shows an interactive media stage inside the dock with the **SAM 3 RLE Person Detection overlay (`JutsuPersonRleOverlay` + `JutsuPersonTabsBar`)** so users can click detected people (`人物 #1`, `人物 #2`) and assign characters directly!
    - Also includes a compact input for custom lighting/prompt notes (`customLightPrompt`) when Relight is enabled.
  - **Bottom Pills**:
    - `+` button: Upload source video/GIF/image (`BrandUploadButton`).
    - **Model/Resolution Pill**: `Scro Swap · 512p / 768p / 1376p >`.
    - **Audio Pill**: `保留原聲 ON/OFF`.
    - **Detect People Pill**: `重新偵測人物` (when source media is loaded).
  - **Right Quick Tiles**:
    - **Tile 1 (`來源媒體`)**: Thumbnail/video preview of `sourceVideoUrl` (click to upload/replace MP4/MOV/GIF/PNG).
    - **Tile 2 (`角色照片`)**: Thumbnail of active character look or custom `uploadedPhotoUrl` (click to upload custom character photo or pick look).
  - **Generate Button**: `生成` (starts `startScroSwapJobAction`).
- **History / Active Job Preview**: Top-right `歷史紀錄` button opens `ScroSwapHistoryDialog`, and when an active job is rendering or selected, a sleek result preview card sits below the dock.

#### 5. Teleport (`TeleportStudio` in `/app/teleport`)
- **Left Vertical Rail**: Switches between `場景圖 + 文字` and `純文字生景` focus.
- **Director Panel (`🎬 導演面板`) Cells**:
  1. **Start Time (`起始秒數`)**: `Starts at 0s` stepper cell.
  2. **Options (`音訊與調色`)**: Curve/toggle cell for `保留原片音訊 (Keep Audio)` + `自動光影校正 (Color Fix)`.
  3. **Output Aspect (`比例`)**: `9:16 2K` badge cell.
  4. **Clip Length (`截取時長`)**: Slider/stepper cell `6s (2–15s)`.
- **Composer Box**:
  - **Prompt Textarea**: `scenePrompt` ("描述你想瞬移過去的場景與光線氣氛（例如：東京澀谷霓虹雨夜街頭）..."). When `sourceVideoUrl` is loaded, a compact inline video scrubber preview can be toggled right above the prompt.
  - **Bottom Pills**:
    - `+` button: Quick upload source video or scene photo.
    - **Engine Pill**: `Teleport H3 2K >`.
    - **Aspect Ratio Pill**: `9:16`.
    - **Audio Pill**: `保留原聲: 開/關`.
  - **Right Quick Tiles**:
    - **Tile 1 (`來源影片`)**: Upload/preview `sourceVideoUrl` (MP4/MOV).
    - **Tile 2 (`場景圖 · 可選`)**: Upload/preview `sceneImageUrl` (PNG/JPG/WebP).
  - **Generate Button**: `生成` (starts `startTeleportJobAction`).
- **History / Active Job Preview**: Top-right `歷史紀錄` button opens `TeleportHistoryDialog`, plus an inline active job result preview below the dock when a job is selected or rendering.

## 6. What Is Left to the Builder

- Exact SVG artwork and curated preview images/thumbnails used in the 3-card fanned Hero showcase for each of the 5 studios (using existing local showcase assets under `/public/` so no external URLs break).
- Popover vs. modal positioning for secondary Director Panel cells (such as speech pace, voice gender, and Teleport/Scro Swap section start/length inputs).
- Keeping `data-tour-id` attributes on the new Director Dock elements in `NewProjectForm` so `CreateVideoFeatureDiscovery` continues to work without missing selectors.
