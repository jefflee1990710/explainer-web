# Custom Director Editor & Standalone `IDirector` Database Design

**Date:** 2026-10-29  
**Status:** Approved in brainstorming, ready for implementation plan

---

## 1. Goal & Motivation

Enable users to create, edit, and persist their own fully standalone **Custom Directors (`IDirector`)** in MongoDB (`directors` collection) using:
1. **A — Structured Visual Form + AI Co-Pilot Editor**: Users can directly edit every meaningful director setting (name, description, `behavior` pipeline switches, 8 `profile` storyboard guide fields, `performance` on-camera slots, and `extraInstructions`), or ask the right-hand AI chat assistant to refine any field.
2. **B — Reference Video / IG Reel Analyzer**: Users can paste a public Instagram Reel / TikTok / YouTube Shorts URL or upload an MP4 reference clip (≤ 50MB) when creating or editing a director. Gemini analyzes the video's framing, A/B-roll structure, pacing, lighting, and audio mode to populate a complete standalone `IDirector`.
3. **100% Standalone `IDirector` Documents (Zero Template Coupling)**:
   - Remove the legacy `user_directors` collection and `baseSlug` runtime template inheritance.
   - Even when a user starts by copying a built-in system director, the new database document is a **100% deep copy** of `IDirector` with its own compiled `systemPrompt`, `references`, `behavior`, `profile`, and `performance`.
   - Future changes to hardcoded system directors in `src/service/director/catalog/` never alter or break a user's saved directors.

---

## 2. Data Model & MongoDB Schema (`directors` Collection)

### 2.1 Remove Legacy `user_directors`
- Delete `src/dao/user-directors.ts` and replace all references with `directorsCollection()` in `src/dao/directors.ts` (collection name: `"directors"`).
- Remove runtime `baseSlug` template merging in `src/service/director/run-skill.ts` (`resolveRunSkill` simply uses the director's own stored `systemPrompt`, `references`, `behavior`, `profile`, and `performance`).

### 2.2 Extended `IDirectorBehavior` (`src/model/director.ts`)
To ensure custom directors can trigger every pipeline capability purely from their own `behavior` object (without checking hardcoded slugs):

```ts
export interface IDirectorBehavior {
  keyframeMode: "start-only" | "end-is-next-start";
  chainsClipStarts: boolean;
  anchorsFramesToFirstClip: boolean;
  dualBeat: boolean;
  maxBackgroundSets: number;
  speechMode: "narrator" | "lip-sync" | "silent";
  bansNarration: boolean;
  requiredCastCount: 1 | 2;
  talkingHeadShot?: "face" | "full-body";
  selfShotCreatorCamera: boolean;
  forcesSceneText: boolean;
  allowsInWorldLabels: boolean;
  attachesTextStyleReference: boolean;
  maxStyleCount: number;
  bookendRole?: "opening" | "ending";
  requiresSpokenScript: boolean;
  allowsRoomBackgroundUpload: boolean;
  allowsOpeningPhotoUpload: boolean;
  allowsBrandLogoUpload: boolean;
  hiddenInPicker: boolean;
  /** Routes lip-sync clips (or A-roll clips) to HeyGen Avatar IV (up to 120s) instead of 5-12s keyframe video. */
  audioFirstLipSync?: boolean;
  /** Locks face/hair to the character blueprint while taking outfits 100% from attached clothing reference images. */
  wardrobeBuild?: boolean;
}
```

### 2.3 Database Document Shape (`StoredDirector` in `src/dao/directors.ts`)
Every document in `directorsCollection()` satisfies the full `IDirector` contract plus user ownership and chat history:

```ts
export interface StoredDirectorDocument {
  _id: ObjectId;
  slug: string; // e.g. `director-${_id.toHexString()}`
  ownerClerkUserId: string;
  title: string;
  description: string;
  suggestedUseCase: string;
  sortOrder: number;
  isActive: boolean;
  previewUrl?: string;
  previewStatus?: "idle" | "generating" | "failed";
  previewHash?: string;
  inputSchema: SkillInputSchema;
  higgsfieldDefaults: HiggsfieldDefaults;
  behavior: IDirectorBehavior;
  profile: SystemProfile;
  performance?: SystemPerformance;
  extraInstructions?: string;
  /** Automatically compiled from title + description + behavior + profile + performance + extraInstructions on every save. */
  systemPrompt: string;
  references: SkillReference[];
  chat?: DirectorChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

---

## 3. Prompt Compiler (`src/service/director/compile-director-prompts.ts`)

Users only edit structured UI fields (`title`, `description`, `behavior`, `profile`, `performance`, `extraInstructions`) — they never have to manually author raw Markdown contract files.

Whenever a custom director is created or saved, `compileDirectorPrompts(input)` deterministically compiles:
1. **`systemPrompt`**:
   - YAML frontmatter (`name`, `description`)
   - `# Core contract`: derived from `behavior` (`speechMode`, `audioFirstLipSync`, `wardrobeBuild`, `dualBeat`, `keyframeMode`, `chainsClipStarts`, `requiredCastCount`, `requiresSpokenScript`)
   - `# Director profile`: all 8 `profile` sections (`bestFor`, `structure`, `hook`, `arc`, `narrator`, `visual`, `audio`, `rules`)
   - `# On-camera performance`: included when `speechMode === "lip-sync"` and `performance` slots are present
   - `# Extra instructions`: included when `extraInstructions` is non-empty
2. **`references`**:
   - `references/proposal-contract.md` (Phase A storyboard rules matching `behavior` and `profile`)
   - `references/prompt-contract.md` (Phase B per-clip video prompt rules matching `behavior` and `profile`)

---

## 4. Creating a Custom Director (3 Flows)

In `/app/directors` (and from the "＋ New Director" action in `SkillPicker`), clicking **Create Director** opens a modal with 3 tabs:

1. **Tab 1 — Analyze Reference Video / IG Reel (`analyzeReferenceVideoForDirectorAction`)**:
   - Inputs:
     - Public video URL (Instagram Reel, TikTok, YouTube Shorts, or direct MP4 URL) **OR** uploaded MP4 file (`<= 50MB`).
     - Optional custom title & focus note (e.g. "Focus on the A-roll interview and B-roll coffee making").
   - Pipeline:
     - If an Instagram Reel URL is supplied, fetches the embed page and extracts `video_url` + caption (using the same mobile User-Agent embed parser verified in development). If a direct MP4 or uploaded file is supplied, reads the bytes directly.
     - Sends the video (or extracted frames + caption) to Gemini (`directorModel()`) with a structured Zod schema (`Output.object`) that outputs:
       - `title`, `description`, `suggestedUseCase`
       - `behavior` (`speechMode`, `audioFirstLipSync`, `wardrobeBuild`, `keyframeMode`, `chainsClipStarts`, `dualBeat`, `requiredCastCount`, `maxBackgroundSets`, `requiresSpokenScript`)
       - `profile` (all 8 fields in Traditional Chinese / user locale)
       - `performance` (when `speechMode === "lip-sync"`)
       - `extraInstructions` (shot-by-shot rhythm & cinematography notes extracted from the reference video)
     - Compiles `systemPrompt` and `references` via `compileDirectorPrompts`, inserts the new standalone document into `directorsCollection()`, and navigates to `/app/directors/[id]`.
   - Error Handling: If a social URL is private or blocked, returns a clear localized message prompting the user to upload the MP4 file or describe the style in text.

2. **Tab 2 — Copy from Existing Director (`createDirectorFromCopyAction`)**:
   - User picks any visible built-in director (or one of their own existing custom directors) and enters a name & description.
   - Deep-copies all fields (`behavior`, `profile`, `performance`, `inputSchema`, `higgsfieldDefaults`) and compiles a standalone `systemPrompt` and `references` into `directorsCollection()`.

3. **Tab 3 — Start from Blank (`createBlankDirectorAction`)**:
   - Creates a clean standalone director with sensible defaults (`speechMode: "narrator"`, `keyframeMode: "start-only"`, `requiredCastCount: 1`) and opens `/app/directors/[id]`.

---

## 5. Director Studio Editor UI (`/app/directors/[id]`)

### 5.1 Left / Main Column: Direct Editable Form (No More Read-Only Lock)
For custom directors (`director.isCustom === true`), all fields are directly editable inputs/textareas/switches with debounced auto-save (`600ms`) plus an explicit **Save** button:

1. **Identity & Preview Card**:
   - Editable `title`, `description`, and `suggestedUseCase`
   - Preview image with **Generate Preview** button
2. **Shooting & Pipeline Behavior Card (`DirectorBehaviorSection`)**:
   - **Voice & Speech Mode (`speechMode`)**: Segmented control:
     - `對嘴講話 (Lip-Sync)` (`speechMode: "lip-sync"`, `bansNarration: true`)
     - `畫外音旁白 (Narrator VO)` (`speechMode: "narrator"`, `bansNarration: false`)
     - `純視覺無對白 (Silent)` (`speechMode: "silent"`, `bansNarration: true`)
   - **Lip-Sync Engine (shown when `speechMode === "lip-sync"`)**:
     - `單一長鏡對嘴 (HeyGen Avatar IV · 最長 120s)` (`audioFirstLipSync: true`, `requiresSpokenScript: true`)
     - `多段分鏡電影對嘴 (Hailuo-3 / A-Roll + B-Roll)` (`audioFirstLipSync: false`)
   - **Keyframe & Continuity Toggles**:
     - `畫格模式 (keyframeMode)`: `只畫首幀 (Start-Only)` vs `首尾幀連貫 (End-is-Next-Start)`
     - `動作連貫上一段結尾 (chainsClipStarts)`: Switch
     - `鎖定第一鏡背景構圖 (anchorsFramesToFirstClip)`: Switch
     - `每段兩拍雙節拍 (dualBeat)`: Switch
   - **Cast & Asset Requirements**:
     - `角色數量 (requiredCastCount)`: `1 個角色` vs `2 個角色`
     - `場景數量上限 (maxBackgroundSets)`: `單一固定場景 (1 Set)` vs `多場景切換 (Up to 4 Sets)`
     - `衣服參考圖換裝模式 (wardrobeBuild)`: Switch
     - `必填逐字講稿 (requiresSpokenScript)`: Switch
     - `支援上傳房間背景 (allowsRoomBackgroundUpload)`: Switch
     - `支援品牌 Logo (allowsBrandLogoUpload)`: Switch
3. **8-Part Storyboard Guide (`DirectorProfileSection`)**:
   - Editable textareas for `bestFor`, `structure`, `hook`, `arc`, `narrator`, `visual`, `audio`, `rules`
   - Editable textarea for `extraInstructions`
4. **On-Camera Performance (`DirectorPerformanceSection`)**:
   - Shown when `speechMode === "lip-sync"`
   - Editable textareas for `restingFace`, `emphasisBeat`, `hookBeat`, `ctaBeat`, `gestureLibrary`, `headMotion`, `anchorProp`, `set`, `light`

### 5.2 Right Column: AI Co-Pilot & Reference Video Analyzer
- Existing AI chat panel (`DirectorChatPanel`) upgraded so the AI can edit not only `profile`, `performance`, and `extraInstructions`, but also `behavior` switches when the user asks (e.g. "Change this director to silent wardrobe lookbook mode").
- Includes a quick **"貼入參考 Reel / 影片更新設定"** button in the chat header so users can re-analyze a reference video into an existing custom director at any time.

---

## 6. Create-Video Integration & Pipeline Execution

1. **`listSelectableSkills(clerkUserId)` & `findSelectableSkill(clerkUserId, slug)` (`src/service/director/selectable-skills.ts`)**:
   - Returns built-in active directors **plus** the user's active custom directors from `directorsCollection()`, sorted with user's custom directors accessible alongside system directors.
2. **`loadStoredSkill(id)` (`src/service/director/load-skill.ts`) & `resolveDirector`**:
   - Checks built-in `getDirectorById(id)` first; if not found, queries `directorsCollection().findOne({ _id: id })` and converts the stored standalone `IDirector` via `directorAsSkill`.
3. **Behavior-Driven Pipeline (`src/service/director/skill-rules.ts` & `src/service/higgsfield/pipeline.ts`)**:
   - Helpers like `isWardrobeBuildSkill`, `isSilentOutfitSkill`, `skillUsesOnScreenLipSync`, `skillBansNarration`, `requiredCastCount`, `chainsClipStarts`, and `sendClipVideo` read from the loaded `Skill` / `IDirector.behavior` (including `audioFirstLipSync` and `wardrobeBuild`) so custom directors execute with the exact same power as built-in directors.

---

## 7. Testing Strategy

1. **Unit Tests**:
   - `src/service/director/compile-director-prompts.test.ts`: verifies `compileDirectorPrompts` produces complete standalone `systemPrompt` and `references` for `lip-sync`, `narrator`, `silent`, `dualBeat`, and `wardrobeBuild` behaviors.
   - `src/service/director/director-edits.test.ts`: verifies `parseDraft` and `applyDirectorEdits` validate and apply `behavior`, `profile`, `performance`, and `extraInstructions` changes independently of any system template.
   - `src/service/director/load-skill.test.ts` & `selectable-skills.test.ts`: verifies standalone custom directors load from `directorsCollection()` and survive even if built-in templates change.
2. **Typecheck & Lint**:
   - `npx tsc --noEmit` and `npx eslint` across all modified and new files.
