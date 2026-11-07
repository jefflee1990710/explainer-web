# Character Realistic Foundation, Auto-Style Generation, Base Image Chat Agent & Director Rules Isolation — Design Spec

**Date:** 2026-11-07

## 1. Intent & Why

1. **Realistic v1 Blueprint as the Single Foundation (`realistic`)**:
   - Currently, when a user creates a character by uploading reference photos, those raw uploaded photos (`referenceImageUrl` / `referenceImageUrls`) remain attached to v1 and are repeatedly sent alongside subsequent outfit edits, style conversions, and scene character locks. Because raw user photos have arbitrary lighting, angles, poses, and backgrounds, repeated AI modifications pull the character back toward the raw upload or cause generational drift.
   - By removing the uploaded reference photo(s) as soon as the first `realistic` blueprint board (`portraitUrl` + `profileUrl` + `blueprintUrl`) completes, the v1 `realistic` blueprint becomes the clean, canonical **Base Image** for all future wardrobe edits, style conversions, and scene locks.
2. **Zero Manual Style Management in UI + Auto-Add Style Behind the Scenes**:
   - Users should never have to pick a style when creating a character, manage multiple style columns on `/app/characters/[id]`, or click `+ Generate Style` inside character selection dialogs.
   - All character pages, outfit editors, and character selection dialogs operate exclusively on the `realistic` foundation.
   - When a user creates a video (or switches a clip's style) using a non-`realistic` style, the system automatically generates and caches that style's blueprint version in the background from the selected `realistic` blueprint without blocking storyboard drafting, while ensuring scene frame generation (`stillBlocker` / `withSceneCharacterLocks`) waits for and uses the completed styled blueprint.
3. **Base Image Chat Agent on `/app/characters/[id]` (Option A — Preview in Chat, Apply as Base)**:
   - Users need a conversational way to refine a character's foundational look (face details, hair, glasses, age, expression, base outfit) on the character page.
   - The Chat Agent generates a candidate `realistic` board preview inside the chat thread first; only when the user clicks **「套用為 Base Image (Apply as Base)」** does it become the character's new foundational Base Image.
4. **Director Prompt Rules Complete Isolation (`1 Director = 1 File`, Zero Shared Generic Rules)**:
   - Previously, shared helpers in `skill-rules.ts`, `scene-detail.ts`, `keyframe-delta.ts`, `dual-keyframe-motion.ts`, `run-phase-a.ts`, `phase-b-clip-prompt.ts`, and `run-phase-b.ts` injected generic rules across multiple directors. Whenever an AI or developer tweaked a shared rule for Explainer or Story, it unintentionally polluted other directors (e.g., leaking whiteboard prop-sliding, morphs, camera locks, or prop invention into Story Short Film or Lookbook).
   - **New Architecture Rule**: Every director (`DirectorSlug`) gets its own standalone rule module (`src/service/director/rules/<director-slug>.ts`, 1 director = 1 file). We **intentionally duplicate** prompt rules inside each director's file rather than sharing generic prompt blocks across directors.
   - Add a permanent architecture rule in `AGENTS.md` and file header comments stating: **"1 Director = 1 File (No Shared Director Prompt Rules): Never share generic prompt rules across directors; duplicate rules into each director's dedicated file and always modify directors individually."**

---

## 2. Goals, Non-Goals & Constraints

### Goals
- Always create characters with `styleId = "realistic"`.
- Automatically unset `referenceImageUrl` and `referenceImageUrls` on v1 (and delete unreferenced raw upload blobs) as soon as v1's board (`portraitUrl`, `profileUrl`, `blueprintUrl`) completes in `sync.ts`.
- Anchor all wardrobe edits (`editCharacterVersionAction`), background style generations, and scene locks (`withSceneCharacterLocks`) to the character's Base Blueprint (`baseVersionId` / root `realistic` board) instead of raw uploaded photos.
- Simplify `/app/characters`, `/app/characters/[id]`, `/app/room/[characterId]`, `CreateCharacterModal`, `InlineCreateCharacterDialog`, `CharacterPicker`, `CharacterSelectDialog`, and `CharacterManageDialog` to show only the `realistic` foundation (with graceful fallback to `character.styleId` for legacy non-realistic-only characters).
- Automatically create/reuse a styled `CharacterVersion` in the background when `buildCast` is called with a non-`realistic` `styleId`, and make `stillBlocker` + `withSceneCharacterLocks` wait for and resolve the finished styled blueprint before Phase B frames submit.
- Add a **Base Image Chat Agent** panel on `/app/characters/[id]` that lets users chat (with optional image attachment) to generate candidate base blueprints (`BLUEPRINT_COST` credits) and click **「套用為 Base Image」** (`applyCharacterBaseVersionAction`) to promote a candidate version to the character's active Base Image.
- Isolate Explainer-only rules in `src/service/director/` so non-explainer directors follow strict source fidelity (`ZERO INVENTED PROPS`) and natural live-action / single-frame motion.

### Non-Goals
- Deleting existing completed non-realistic versions or breaking legacy videos that already reference them.
- Changing credit pricing for blueprints (`BLUEPRINT_COST`) or video/image generation models.

### Constraints
- Existing video and image generation pipelines (Phase A storyboard, Phase B frames, HeyGen / Hailuo-3 / Wan 3.0 video jobs, Scro Swap, Teleport, Life, Posts) must continue working without regression.
- All unit tests must mock `fetch` / LLM calls and never hit paid providers.

---

## 3. Approaches Considered

### Approach 1 (Selected): Realistic Root Foundation + Auto Background Style Queue in `buildCast` + Preview-Then-Apply Base Chat Agent
- **How it works**:
  - `Character` stores `baseVersionId?: ObjectId` (defaulting to the root `realistic` v1 version) and `baseChat?: CharacterBaseChatMessage[]`.
  - On v1 completion (`completeBoardFullBody` in `src/service/character/sync.ts`), raw `referenceImageUrl(s)` are unset from MongoDB and deleted from Vercel Blob; `baseVersionId` is set to v1's `id`.
  - `rootVersionOf` prioritizes `character.baseVersionId` (when completed) so subsequent outfit edits and style conversions always anchor to the latest applied Base Image.
  - When `buildCast` runs for a video with `styleId !== "realistic"`, it resolves the user's chosen `realistic` version/preset (`realisticSource`). If a matching version for `(styleId, realisticSource.id)` does not exist yet, it automatically inserts and enqueues a new board `CharacterVersion` for `styleId` using `[realisticSource.portraitUrl, realisticSource.profileUrl]` as references (at no extra manual step). `stillBlocker` checks if any cast member's `versionId` is still `queued` or `in_progress` on the character document and waits until completion; `resolveLockUrl` resolves the fresh `blueprintUrl` / `portraitUrl` from the character version document.
  - On `/app/characters/[id]`, the Base Image Chat Agent generates a candidate board version marked with `isBaseCandidate: true` (so it doesn't overwrite the default look while previewing). Clicking **「套用為 Base Image」** sets `baseVersionId` and `defaultByStyle.realistic` / `defaultVersionId` to that candidate version.
- **Trade-offs**: Cleanly decouples UI (always `realistic`) from multi-style rendering (automatic background versions per style), and keeps Phase A + Phase B 100% compatible with existing scene lock logic.

### Approach 2: Direct Realistic Reference in Non-Realistic Scene Frames (No Background Style Blueprint)
- **Why rejected**: Does not fulfill the requirement to automatically add the style version behind the scenes when a character is used in that style, and causes inconsistent stylization across multi-clip non-realistic videos.

### Approach 3: Immediate Base Overwrite on Chat Send (Option B)
- **Why rejected**: Overwrites the character's active base look before the user can verify the AI generation result.

---

## 4. Detailed Design

### 4.1 Data Model (`src/model/character.ts` & `src/presentation/serialize.ts`)
- Add optional fields to `CharacterVersion`:
  - `sourceRealisticVersionId?: ObjectId`: set on auto-generated non-realistic style versions so `buildCast` can match a styled version to the exact `realistic` version/preset it was derived from.
  - `isBaseCandidate?: boolean`: set on versions created by the Base Image Chat Agent before they are applied, so they can be previewed in chat without prematurely overriding `defaultVersionId` / `styleDefaults.realistic` on completion.
- Add optional fields to `Character`:
  - `baseVersionId?: ObjectId`: points to the active `realistic` Base Blueprint version (defaults to v1).
  - `baseChat?: CharacterBaseChatMessage[]`: persisted chat history for the Base Image Chat Agent (`id`, `role: "user" | "assistant"`, `content`, `imageUrl?`, `candidateVersionId?`, `createdAt`).
- Expose `baseVersionId: string | null` and `baseChat: PublicCharacterBaseChatMessage[]` on `PublicCharacter`.

### 4.2 Removing Raw Uploaded Image After First Blueprint (`src/service/character/sync.ts` & `generate.ts`)
- In `completeBoardFullBody` (`src/service/character/sync.ts`):
  - When a version completes, capture its ` uploadedRefs = characterReferenceUrls(version)` if it is the initial root creation (`!version.parentVersionId && !version.sourceRealisticVersionId`).
  - In the MongoDB update that marks `versions.$.status = "completed"`:
    - If `!version.isBaseCandidate`, update `completionDefaults` as before, and if `!character.baseVersionId && !version.parentVersionId && versionStyleId(character, version) === "realistic"`, set `baseVersionId: version.id`.
    - If `!version.parentVersionId`, `$unset` `"versions.$.referenceImageUrl"` and `"versions.$.referenceImageUrls"` so raw uploaded photos are removed and the completed blueprint (`portraitUrl`, `profileUrl`, `blueprintUrl`) becomes the sole base image.
  - Delete the removed raw upload URLs from Blob storage via `deleteExplainerBlobUrls` (after checking no other character version references them).
- In `src/service/character/reference-urls.ts` & `src/service/character/generate.ts`:
  - Update `rootVersionOf(versions, from, baseVersionId?)`: when `from` is a `realistic` version (or when resolving the character's base version), prefer the completed `baseVersionId` version if present, falling back to walking `parentVersionId` to v1.
  - In `sendCharacterVersion` and `sendCharacterFullBody`:
    - When generating a non-realistic style version that has `sourceRealisticVersionId` (or when `characterReferenceUrls(version)` holds the realistic base's `[portraitUrl, profileUrl]`), pass the realistic base portrait (`[portraitUrl]`) for Stage 1 (portrait) and `[version.portraitUrl, realisticBase.profileUrl]` for Stage 2 (fullBody).
- In `src/service/higgsfield/scene-character-lock.ts`:
  - Remove raw upload prepending (`resolveOriginalPhotoUrl`) from `withSceneCharacterLocks` so scene frames always anchor to the character's clean blueprint lock (`blueprintUrl` / `portraitUrl`) without raw-photo interference.
  - Update `resolveLockUrl(member, options)`: if `member.blueprintUrl` was snapshotted while `member.versionId` was still generating (or if `version.blueprintUrl` on the `Character` doc in MongoDB is now completed and differs), always prefer the completed `version.blueprintUrl` (for boards) or `version.portraitUrl` (when `preferPortrait: true`) from the database.

### 4.3 Realistic-Only UI Across Character Pages, Room, and Pickers
- **Character Creation (`CreateCharacterModal`, `InlineCreateCharacterDialog`, `createCharacterAction`)**:
  - Remove `<StylePicker>` from `CreateCharacterModal` and `InlineCreateCharacterDialog`.
  - Default `styleId` in `createCharacterAction` to `"realistic"` if omitted or always pass `"realistic"` from UI.
- **Character Workspace (`/app/characters/[id]`) & Room (`/app/room/[characterId]`)**:
  - In `CharacterWorkspace`, remove `CharacterStyleColumn` and `AddCharacterStyleDialog`.
  - Resolve `activeStyleId` as `character.styleIds.includes("realistic") ? "realistic" : (character.styleIds[0] || character.styleId)`.
  - Filter `styleVersions` to `activeStyleId` and exclude unapplied `isBaseCandidate` versions from the main wardrobe version strip until applied (or show applied versions cleanly).
  - In `RoomDesk`, hide the multi-style switcher pill bar and always use the `realistic` foundation style.
  - In `CharacterCard`, display the `realistic` default blueprint preview (`defaultSheetForStyle(character, "realistic")`) and hide multi-style count badges.
- **Character Pickers & Dialogs (`CharacterPicker`, `CharacterSelectDialog`, `CharacterManageDialog`, `DirectorDockBrief`, `PostStudio`)**:
  - Helper `foundationStyleId(character)`: returns `"realistic"` if the character has any `"realistic"` version (or `character.styleId === "realistic"`), else `character.styleId`.
  - In `CharacterPicker`, `CharacterSelectDialog`, `CharacterManageDialog`, and `DirectorDockBrief`, always look up sheets, presets, and history using `foundationStyleId(character)` (`"realistic"`) instead of the video's `styleId`!
  - Remove the `+Style` badge, remove `AddCharacterStyleDialog` / `handleQuickAddCurrentStyle`, and remove the "character does not have this style yet" empty state from `CharacterSelectDialog` and `CharacterPicker`. Every character with a ready `realistic` blueprint is immediately selectable for any video style.

### 4.4 Auto-Add Style Behind the Scenes (`src/service/project/actions.ts` & `src/service/higgsfield/pipeline.ts`)
- In `buildCast(clerkUserId, styleId, characterIds, characterSelections)` (`src/service/project/actions.ts`):
  - Remove the error check `if (docs.some((doc) => !characterStyleIds(doc).includes(styleId))) return { ok: false, error: "角色風格與影片風格不同" };`.
  - For each selected character:
    1. Resolve the chosen foundation (`realistic`) version and preset using `resolveCastVersion(character, foundationStyleId(character), characterSelections[id])`.
    2. If `styleId === foundationStyleId(character)` (i.e. `"realistic"`), use that version directly as `activeVersion`.
    3. If `styleId !== foundationStyleId(character)`:
       - Check if `character.versions` already has a `completed`, `queued`, or `in_progress` version with `versionStyleId(character, v) === styleId` that matches `sourceRealisticVersionId === realisticVersion.id` (or if the user selected the default look, any completed/in-flight version for `styleId` whose `sourceRealisticVersionId` matches or is the style default).
       - If not found, automatically create and enqueue a new `CharacterVersion` on `character` with:
         - `styleId`,
         - `sourceRealisticVersionId: realisticVersion.id`,
         - `prompt: realisticVersion.prompt`,
         - `editInstruction: realisticVersion.editInstruction`,
         - `spec: realisticVersion.spec`,
         - `referenceImageUrls: [realisticVersion.portraitUrl, realisticVersion.profileUrl].filter(Boolean)` (or `[realisticVersion.blueprintUrl]`),
         - `blueprintKind: "board"`, `stage: "portrait"`, `status: "queued"`, `creditsCharged: false`, `creditsCost: 0` (auto background style conversion during video creation does not double-charge or block on style limits).
       - Use that newly queued (or existing) styled version as `activeVersion`, and set `blueprintUrl` to `activeVersion.blueprintUrl || activeVersion.portraitUrl || realisticVersion.blueprintUrl || ""`.
- In `stillBlocker(project)` (`src/service/higgsfield/pipeline.ts`):
  - When `project.cast && project.cast.length > 0`, check `charactersCollection` for the cast members' `versionId`s.
  - If any cast member's target `versionId` is still `queued` or `in_progress`, return `"角色風格藍圖正在產生，請稍候再試"` so Phase B frame generation waits until the background style blueprint finishes!

### 4.5 Base Image Chat Agent (`/app/characters/[id]`)
- **Server Actions (`src/service/character/base-chat.ts` & `src/presentation/actions/characters.ts`)**:
  - `sendCharacterBaseChatAction(input: { characterId: string; message: string; imageUrl?: string })`:
    - Authenticates user, loads owned character, verifies active Base Version (`baseVersion`) is completed.
    - Charges `BLUEPRINT_COST` credits via `assertCanSpendCredits` + `consumeCredits` (refunded automatically if generation fails).
    - Calls Gemini (`directorModel()`) with the character's current base `prompt`, `spec`, and recent `baseChat` messages + user's `message` (and optional `imageUrl`) to produce:
      - `reply`: concise Traditional Chinese / localized assistant response explaining the base look adjustment,
      - `updatedPrompt`: updated clean base character description,
      - `editInstruction`: specific facial/hair/base-look modification instruction for `buildPortraitPrompt` and `buildFullBodyPrompt`,
      - `updatedSpec`: updated `CharacterSpec`.
    - Creates a new `CharacterVersion` (`styleId: "realistic"`, `parentVersionId: baseVersion.id`, `isBaseCandidate: true`, `blueprintKind: "board"`, `stage: "portrait"`, `status: "queued"`, `creditsCharged: true`, `creditsCost: BLUEPRINT_COST`) anchored to `[baseVersion.portraitUrl, baseVersion.profileUrl]` (plus `input.imageUrl` if the user attached a reference photo in chat).
    - Appends the user message and assistant message (with `candidateVersionId: newVersion.id`) to `character.baseChat`, and enqueues the board job via `enqueueCharacterVersion`.
  - `applyCharacterBaseVersionAction(characterId: string, versionId: string)`:
    - Verifies the target version belongs to `character`, is `completed`, and has `blueprintUrl`.
    - Updates `character` in MongoDB:
      - Sets `baseVersionId: version.id`, `defaultVersionId: version.id`, `styleDefaults.realistic: version.id`,
      - Unsets `versions.$.isBaseCandidate` and `versions.$.parentVersionId` on the promoted version (and clears any temporary chat `referenceImageUrl(s)` on it) so it acts as the new clean root Base Image!
- **UI Component (`src/presentation/components/app/characters/[id]/character-base-chat-panel.tsx`)**:
  - Placed alongside `VersionDetail` in `CharacterWorkspace` (Look tab: desktop right column / collapsible drawer, matching `StyleChatDrawer` / `StyleChatPanel` UX).
  - Shows the current Base Image badge at the top, scrollable chat history, live polling of any in-flight `candidateVersionId` (via existing `useCharacterPoll`), and for each assistant message with a `candidateVersionId`:
    - While `queued` / `in_progress`: shows a generating spinner card.
    - When `completed`: shows the candidate board (`portraitUrl` + `profileUrl` / `blueprintUrl` with zoom preview) and an **「套用為 Base Image」** button (or a **「✓ 目前使用中的 Base Image」** badge if `character.baseVersionId === candidateVersion.id`).

### 4.6 Per-Director Rule Files (`1 Director = 1 File`, Zero Shared Generic Rules) & `AGENTS.md` Rule
1. **Per-Director Standalone Rule Modules (`src/service/director/rules/<director-slug>.ts`)**:
   - Create one dedicated rule file per director in `src/service/director/rules/`:
     - `cartoon-explainer-video-director.ts`
     - `paper-cutout-explainer-video-director.ts`
     - `papercraft-diorama-director.ts`
     - `story-short-director.ts`
     - `product-demo-director.ts`
     - `dialogue-qa-director.ts`
     - `listicle-director.ts`
     - `tutorial-director.ts`
     - `opening-director.ts`
     - `ending-director.ts`
     - `talking-head-director.ts`
     - `full-body-talking-head-director.ts`
     - `comparison-card-director.ts`
     - `talking-broll-director.ts`
     - `surprise-interview-director.ts`
     - `outfit-reel-director.ts`
     - `follow-shot-director.ts`
     - `outfit-change-director.ts`
     - `workflow-promo-director.ts`
     - `style-switch-director.ts`
     - `editorial-interview-director.ts`
     - `street-lookbook-director.ts`
   - Each director file exports its own self-contained prompt builders (`phaseADirectorRules`, `phaseBDirectorMotionRules`, `phaseBDirectorDetailRules`, `directorSceneDetailRules`, `directorKeyframeDeltaRules`, `directorSourceFidelityRules`), **duplicating** any text it needs rather than importing shared prompt strings from other directors.
   - Only `cartoon-explainer-video-director.ts` and `paper-cutout-explainer-video-director.ts` include whiteboard/cutout prop invention, sliding/unfolding/tearing diagram elements, presenter-corner staging, and `DUAL_KEYFRAME_GLIDE_RULES`.
   - Non-explainer directors (such as `story-short-director.ts`, `talking-broll-director.ts`, `editorial-interview-director.ts`, `street-lookbook-director.ts`, `follow-shot-director.ts`, etc.) contain their own clean live-action / scene rules, `STRICT SOURCE FIDELITY (ZERO INVENTED PROPS)`, and single-frame / camera motion rules with zero whiteboard/explainer leakage.
2. **Dispatcher Registry (`src/service/director/rules/index.ts`)**:
   - Maps `DirectorSlug` -> that director's dedicated rule module so `run-phase-a.ts`, `phase-b-clip-prompt.ts`, and `run-phase-b.ts` simply call `getDirectorRules(skillSlug)` without giant shared conditional chains.
3. **Permanent Remark in `AGENTS.md`**:
   - Add an explicit section in `AGENTS.md` instructing all future AI agents:
     > **Director Prompt Isolation (`src/service/director/rules/<director-slug>.ts`)**: Every director has its own standalone rule file (1 director = 1 file). NEVER share generic prompt blocks across directors—always duplicate rules inside each director's own file so editing one director never affects any other director. When asked to adjust a director's behavior or prompt rules, modify ONLY that specific director's file.
