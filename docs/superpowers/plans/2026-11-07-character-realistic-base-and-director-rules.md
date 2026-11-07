# Character Realistic Foundation, Auto-Style Generation, Base Image Chat Agent & Per-Director Rules Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each character's `realistic` v1 blueprint the sole foundational Base Image (automatically removing raw uploaded reference photos after v1 completes), unify all character UIs and pickers around `realistic`, automatically generate non-realistic style blueprints in the background when a character is cast in a non-realistic video, add a preview-then-apply Base Image Chat Agent on `/app/characters/[id]`, and isolate all director prompt rules into 1-director-per-file modules (`src/service/director/rules/<director-slug>.ts`) with zero shared generic prompt rules.

**Architecture:** Characters store `baseVersionId` (their active `realistic` foundation board) and `baseChat` history, while `CharacterVersion` stores `sourceRealisticVersionId` (for background style conversions) and `isBaseCandidate` (for unapplied Base Chat previews). On v1 completion in `sync.ts`, raw uploaded `referenceImageUrl(s)` are unset and deleted so all future edits, background style conversions, and scene locks anchor exclusively to the Base Blueprint. In `src/service/director/rules/<director-slug>.ts`, every director owns its own standalone Phase A / Phase B / scene detail / keyframe delta / source fidelity rules (duplicating rather than sharing across directors), documented as a permanent rule in `AGENTS.md`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, MongoDB (`mongodb`), Zod, Vercel AI SDK (`ai` + Google Gemini), OpenRouter (`bytedance-seed/seedream-5-0-pro`), Node built-in test runner (`node:test` + `node:assert/strict` via `tsx`).

**Spec:** `docs/superpowers/specs/2026-11-07-character-realistic-base-and-director-rules-design.md`

## Global Constraints

- Always reply to the user in Traditional Chinese (繁體中文).
- Never make live paid provider calls during unit tests; use pure functions or mock `fetch` / dependencies.
- 1 Director = 1 File (`src/service/director/rules/<director-slug>.ts`): never share generic prompt blocks across directors; duplicate rules into each director's dedicated file and modify directors individually.
- All character creation defaults to `styleId = "realistic"`.
- Legacy characters that only have a non-`realistic` version fall back gracefully via `foundationStyleId(character)` so existing data never breaks.
- Existing Phase A storyboard, Phase B frame generation, video generation, Scro Swap, Teleport, Life, and Post pipelines must remain 100% functional.

## Review Focus

- Legacy characters created before this update whose only completed version has `styleId !== "realistic"` (e.g. `"doodle"`) must still resolve a valid `foundationStyleId` and default sheet in `CharacterPicker`, `CharacterSelectDialog`, and `buildCast`.
- Unapplied Base Image Chat candidate versions (`isBaseCandidate: true`) must NOT overwrite `defaultVersionId`, `styleDefaults.realistic`, or `baseVersionId` when their board job finishes in `sync.ts`, and must NOT be picked by `resolveVersionForStyle` until `applyCharacterBaseVersionAction` promotes them.
- When `completeBoardFullBody` unsets `referenceImageUrl` / `referenceImageUrls` on v1 completion, `rootBoardImages` and `originalCharacterSource` must return `[portraitUrl, profileUrl]` from the active Base Blueprint so subsequent wardrobe edits and style conversions never fail with "no reference".
- When `buildCast` auto-queues a background style version for a non-`realistic` video style, `stillBlocker` must block Phase B frame submission while that version's status is `"queued"` or `"in_progress"`, and `resolveLockUrl` must read the newly completed `version.blueprintUrl` from MongoDB once it finishes.
- Non-explainer directors (especially `story-short-director`) must contain zero whiteboard/diagram/prop-sliding/morph rules in both Phase A and Phase B prompts, while `cartoon-explainer-video-director` and `paper-cutout-explainer-video-director` retain all diagram and `DUAL_KEYFRAME_GLIDE_RULES` behavior.

---

### Task 1: Character Model, Serialization & Foundation Helpers (`baseVersionId`, `isBaseCandidate`, `sourceRealisticVersionId`, `foundationStyleId`)

**Files:**
- Modify: `src/model/character.ts`
- Modify: `src/service/character/character-styles.ts`
- Modify: `src/service/character/reference-urls.ts`
- Modify: `src/service/character/versions.ts`
- Modify: `src/presentation/serialize.ts`
- Test: `src/service/character/character-styles.test.ts`
- Test: `src/service/character/reference-urls.test.ts`

**Interfaces:**
- Produces:
  - `CharacterVersion.sourceRealisticVersionId?: ObjectId`
  - `CharacterVersion.isBaseCandidate?: boolean`
  - `CharacterBaseChatMessage = { id: ObjectId; role: "user" | "assistant"; content: string; imageUrl?: string; candidateVersionId?: ObjectId; createdAt: Date }`
  - `Character.baseVersionId?: ObjectId`
  - `Character.baseChat?: CharacterBaseChatMessage[]`
  - `PublicCharacterBaseChatMessage` & `PublicCharacter.baseVersionId: string | null`, `PublicCharacter.baseChat: PublicCharacterBaseChatMessage[]`
  - `foundationStyleId(character: { styleId: string; versions: Array<{ styleId?: string }> }): string` in `src/service/character/character-styles.ts`
  - `resolveBaseVersion(character: Pick<Character, "styleId" | "baseVersionId" | "versions">): CharacterVersion | null` in `src/service/character/character-styles.ts`
  - `originalCharacterSource(versions, baseVersionId?)` returning `{ prompt, referenceImageUrls }` where `referenceImageUrls` falls back to `[root.portraitUrl, root.profileUrl]` (or `[root.blueprintUrl]`) when raw `referenceImageUrl(s)` have been removed after v1 completion.
  - `rootVersionOf(versions, from, baseVersionId?)` in `src/service/character/reference-urls.ts` preferring the completed `baseVersionId` version when present.

- [ ] **Step 1: Write the failing unit tests in `src/service/character/character-styles.test.ts` and `src/service/character/reference-urls.test.ts`**

Add tests asserting:
1. `foundationStyleId` returns `"realistic"` whenever the character has `"realistic"` as `styleId` or in `versions`, and falls back to `character.styleId` for legacy non-realistic-only characters.
2. `resolveVersionForStyle` and `resolveDefaultVersion` ignore versions with `isBaseCandidate: true`.
3. `originalCharacterSource` uses `[portraitUrl, profileUrl]` (or `[blueprintUrl]`) from the base version when `referenceImageUrl` / `referenceImageUrls` have been cleared after v1 completion.
4. `rootVersionOf(versions, from, baseVersionId)` returns the version matching `baseVersionId` when provided.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/character/character-styles.test.ts src/service/character/reference-urls.test.ts`
Expected: FAIL with missing exports / assertions.

- [ ] **Step 3: Implement model, style helpers, reference helpers, and serializer updates**

Update `src/model/character.ts`, `src/service/character/character-styles.ts`, `src/service/character/reference-urls.ts`, `src/service/character/versions.ts`, and `src/presentation/serialize.ts` with the new fields and helper functions. Ensure `toPublicCharacter` previews the `foundationStyleId(character)` default version and serializes `baseVersionId` and `baseChat`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/character/character-styles.test.ts src/service/character/reference-urls.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/character.ts src/service/character/character-styles.ts src/service/character/reference-urls.ts src/service/character/versions.ts src/presentation/serialize.ts src/service/character/character-styles.test.ts src/service/character/reference-urls.test.ts
git commit -m "feat(character): add realistic foundation helpers, baseVersionId, and baseChat model"
```

---

### Task 2: Remove Raw Uploaded Image on v1 Completion & Anchor Generation/Locks to Base Blueprint

**Files:**
- Modify: `src/service/character/sync.ts`
- Modify: `src/service/character/generate.ts`
- Modify: `src/service/character/actions.ts`
- Modify: `src/service/higgsfield/scene-character-lock.ts`
- Test: `src/service/higgsfield/scene-character-lock.test.ts`

**Interfaces:**
- Consumes: `resolveBaseVersion`, `foundationStyleId`, `rootVersionOf` from Task 1.
- Produces:
  - `completeBoardFullBody` in `src/service/character/sync.ts`:
    - When `!version.parentVersionId && !version.isBaseCandidate`, unsets `versions.$.referenceImageUrl` and `versions.$.referenceImageUrls` in MongoDB, sets `baseVersionId: version.id` if `!character.baseVersionId` and `styleId === "realistic"`, and deletes the removed raw upload blob URLs via `deleteExplainerBlobUrls` (if not referenced elsewhere on the character).
    - When `version.isBaseCandidate` is true, does NOT overwrite `defaultVersionId` or `styleDefaults` in `completionDefaults`, and also unsets temporary `referenceImageUrl(s)` on completion.
  - `sendCharacterVersion` and `sendCharacterFullBody` in `src/service/character/generate.ts`:
    - Uses `rootBoardImages(character, version)` which checks `character.baseVersionId` first (via `resolveBaseVersion(character)` or `rootVersionOf(character.versions, version, character.baseVersionId)`).
    - When generating a version with `sourceRealisticVersionId` (auto-style version), uses the source realistic version's `[portraitUrl]` for portrait stage and `[version.portraitUrl, sourceRealistic.profileUrl]` for full-body stage.
  - `withSceneCharacterLocks` and `resolveLockUrl` in `src/service/higgsfield/scene-character-lock.ts`:
    - Removes raw uploaded photo prepending (`resolveOriginalPhotoUrl`) so scene frames only attach the clean blueprint lock.
    - In `resolveLockUrl(member, options)`: queries `charactersCollection` for `member.characterId` + `member.versionId` when needed so if `member.blueprintUrl` was snapshotted before a background style version completed, it returns the completed `version.blueprintUrl` (or `version.portraitUrl` when `preferPortrait: true`).

- [ ] **Step 1: Write unit tests for `scene-character-lock.ts` and `generate.ts` base-image anchoring**

Update `src/service/higgsfield/scene-character-lock.test.ts` (and add a test in `src/service/character/character-styles.test.ts` or `versions.test.ts`) verifying that `completionDefaults` skips `isBaseCandidate` versions and that `rootBoardImages` resolves `baseVersionId`'s `[portraitUrl, profileUrl]` when `referenceImageUrls` is empty.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/higgsfield/scene-character-lock.test.ts src/service/character/character-styles.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement raw upload removal in `sync.ts`, base anchoring in `generate.ts` & `actions.ts`, and lock resolution in `scene-character-lock.ts`**

 Also update `createCharacterAction` in `src/service/character/actions.ts` so `styleId` defaults to `"realistic"` when not provided or always normalizes to `"realistic"`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test 'src/service/character/**/*.test.ts' src/service/higgsfield/scene-character-lock.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/character/sync.ts src/service/character/generate.ts src/service/character/actions.ts src/service/higgsfield/scene-character-lock.ts src/service/higgsfield/scene-character-lock.test.ts src/service/character/character-styles.test.ts
git commit -m "feat(character): remove raw upload after v1 blueprint and anchor edits/locks to base blueprint"
```

---

### Task 3: Auto-Add Style Behind the Scenes in `buildCast` & Wait in `stillBlocker`

**Files:**
- Modify: `src/service/character/character-presets.ts`
- Modify: `src/service/project/actions.ts`
- Modify: `src/service/higgsfield/pipeline.ts`
- Test: `src/service/character/character-presets.test.ts`

**Interfaces:**
- Consumes: `foundationStyleId`, `resolveBaseVersion`, `enqueueCharacterVersion`
- Produces:
  - `resolveCastVersion(character, styleId, selection)` in `src/service/character/character-presets.ts`: resolves presets/versions from `foundationStyleId(character)` (`"realistic"`) when `selection` points to a realistic preset/version, or matches an existing completed version in `styleId` whose `sourceRealisticVersionId` equals the selected realistic version's `id`.
  - `ensureCharacterStyleVersion(character: Character, targetStyleId: string, realisticVersion: CharacterVersion): Promise<{ character: Character; version: CharacterVersion }>` in `src/service/character/actions.ts` (or `src/service/project/actions.ts`):
    - If `targetStyleId === foundationStyleId(character)`, returns `{ character, version: realisticVersion }`.
    - Otherwise searches `character.versions` for a `completed`, `queued`, or `in_progress` version with `versionStyleId(character, v) === targetStyleId` and (`v.sourceRealisticVersionId?.equals(realisticVersion.id)` or (!realisticVersion.editInstruction && !v.editInstruction)).
    - If none exists, appends a new board `CharacterVersion` (`styleId: targetStyleId`, `sourceRealisticVersionId: realisticVersion.id`, `prompt: realisticVersion.prompt`, `editInstruction: realisticVersion.editInstruction`, `spec: realisticVersion.spec`, `referenceImageUrls: [realisticVersion.portraitUrl, realisticVersion.profileUrl].filter(Boolean)`, `blueprintKind: "board"`, `stage: "portrait"`, `status: "queued"`, `creditsCharged: false`, `creditsCost: 0`) to `character.versions` in MongoDB and calls `enqueueCharacterVersion(character, newVersion)`.
  - `stillBlocker(project: Project)` in `src/service/higgsfield/pipeline.ts`:
    - If `project.cast && project.cast.length > 0`, checks `charactersCollection` for any cast member whose `versionId` on the character document has `status === "queued" || status === "in_progress"`, returning `"角色風格藍圖正在產生，請稍候再試"` when still generating; if completed and `member.blueprintUrl !== version.blueprintUrl`, updates `project.cast` in `videosCollection` with the completed `version.blueprintUrl`.

- [ ] **Step 1: Write unit tests in `src/service/character/character-presets.test.ts`**

Add tests verifying that `resolveCastVersion` resolves a `realistic` preset/version selection even when the requested video `styleId` is `"doodle"`, and matches a styled version via `sourceRealisticVersionId`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/character/character-presets.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `resolveCastVersion`, `ensureCharacterStyleVersion` in `buildCast`, and cast blueprint wait in `stillBlocker`**

Update `src/service/character/character-presets.ts`, `src/service/project/actions.ts`, and `src/service/higgsfield/pipeline.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/character/character-presets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/character/character-presets.ts src/service/character/character-presets.test.ts src/service/project/actions.ts src/service/higgsfield/pipeline.ts
git commit -m "feat(character): auto-generate character style blueprint in background when casting video"
```

---

### Task 4: Base Image Chat Agent Backend & Server Actions (`sendCharacterBaseChatAction`, `applyCharacterBaseVersionAction`)

**Files:**
- Create: `src/service/character/base-chat.ts`
- Create: `src/service/character/base-chat.test.ts`
- Modify: `src/service/character/actions.ts`
- Modify: `src/presentation/actions/characters.ts`

**Interfaces:**
- Produces:
  - `buildBaseChatSystemPrompt(input: { name: string; currentPrompt: string; currentSpec?: CharacterSpec }): string` in `src/service/character/base-chat.ts`
  - `planCharacterBaseEdit(input: { name: string; currentPrompt: string; currentSpec?: CharacterSpec; history: Array<{ role: "user" | "assistant"; content: string }>; message: string; imageUrl?: string }): Promise<{ reply: string; updatedPrompt: string; editInstruction: string; updatedSpec?: CharacterSpec }>` in `src/service/character/base-chat.ts`
  - `sendCharacterBaseChatAction(input: { characterId: string; message: string; imageUrl?: string }): Promise<CharacterResult>` in `src/service/character/actions.ts` & re-exported from `src/presentation/actions/characters.ts`
  - `applyCharacterBaseVersionAction(characterId: string, versionId: string): Promise<CharacterResult>` in `src/service/character/actions.ts` & re-exported from `src/presentation/actions/characters.ts`

- [ ] **Step 1: Write unit tests in `src/service/character/base-chat.test.ts`**

Test `buildBaseChatSystemPrompt` and the pure state transition helper `promoteVersionToBase(character, versionId)` (which sets `baseVersionId`, `defaultVersionId`, `styleDefaults.realistic`, and clears `isBaseCandidate` / `parentVersionId` / `referenceImageUrl(s)` on the promoted version).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/character/base-chat.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/service/character/base-chat.ts` and wire `sendCharacterBaseChatAction` & `applyCharacterBaseVersionAction` in `actions.ts`**

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/character/base-chat.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/character/base-chat.ts src/service/character/base-chat.test.ts src/service/character/actions.ts src/presentation/actions/characters.ts
git commit -m "feat(character): add Base Image Chat Agent service and server actions"
```

---

### Task 5: Realistic-Only UI Across Character Pages, Room, Selection Dialogs & Base Image Chat Agent Panel

**Files:**
- Create: `src/presentation/components/app/characters/[id]/character-base-chat-panel.tsx`
- Modify: `src/presentation/components/app/characters/[id]/character-workspace.tsx`
- Modify: `src/presentation/components/app/characters/[id]/version-detail.tsx`
- Modify: `src/presentation/components/app/characters/create-character-modal.tsx`
- Modify: `src/presentation/components/app/characters/character-card.tsx`
- Modify: `src/presentation/components/app/characters/character-card.test.ts`
- Modify: `src/presentation/components/app/room/room-desk.tsx`
- Modify: `src/presentation/components/app/projects/[id]/inline-create-character-dialog.tsx`
- Modify: `src/presentation/components/app/projects/[id]/character-picker.tsx`
- Modify: `src/presentation/components/app/projects/[id]/character-select-dialog.tsx`
- Modify: `src/presentation/components/app/projects/[id]/character-manage-dialog.tsx`
- Modify: `src/presentation/components/app/projects/new/director-dock-brief.tsx`

**Interfaces:**
- Consumes: `sendCharacterBaseChatAction`, `applyCharacterBaseVersionAction`, `PublicCharacter.baseVersionId`, `PublicCharacter.baseChat`
- Produces:
  - `CharacterBaseChatPanel` component on `/app/characters/[id]` (`CharacterWorkspace`) allowing users to open/toggle the Base Image Chat Agent, send text + optional reference image, view generating/completed candidate boards in the chat thread, and click **「套用為 Base Image / Apply as Base」**.
  - Realistic-only UI in `CreateCharacterModal`, `InlineCreateCharacterDialog` (no `StylePicker`, always `styleId = "realistic"`), `CharacterWorkspace` (no `CharacterStyleColumn`), `RoomDesk` (no style switcher pills), `CharacterPicker`, `CharacterSelectDialog`, `CharacterManageDialog`, and `DirectorDockBrief` (always resolving sheets, presets, and history from the character's `realistic` foundation without `+Style` badges or style-mismatch blockers).

- [ ] **Step 1: Update `src/presentation/components/app/characters/character-card.test.ts` and `character-select-dialog` helper tests**

Verify `defaultSheetForStyle` / `presetsForCharacterStyle` / `historyVersionsForCharacterStyle` resolve the `realistic` foundation look regardless of the active video style, and ignore unapplied `isBaseCandidate` versions.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/presentation/components/app/characters/character-card.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `CharacterBaseChatPanel` and update Character & Picker UI components**

1. Create `src/presentation/components/app/characters/[id]/character-base-chat-panel.tsx`.
2. Update `CharacterWorkspace` to remove `CharacterStyleColumn`, always filter `styleVersions` to the `realistic` foundation (excluding `isBaseCandidate` from the main wardrobe bar), and render `CharacterBaseChatPanel` (collapsible panel on the right of `VersionDetail`, with a toggle button in the header/toolbar).
3. Remove `StylePicker` from `CreateCharacterModal` and `InlineCreateCharacterDialog` (always submit `styleId = "realistic"`).
4. Update `CharacterSelectDialog`, `CharacterPicker`, `CharacterManageDialog`, `DirectorDockBrief`, and `RoomDesk` to always use the character's `realistic` foundation (`foundationStyleForPublicCharacter(character)`) and remove `+Style` badges and style-missing blockers.

- [ ] **Step 4: Run typecheck and tests to verify**

Run: `npx tsc --noEmit && npx tsx --test src/presentation/components/app/characters/character-card.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/app/characters/ src/presentation/components/app/room/room-desk.tsx src/presentation/components/app/projects/
git commit -m "feat(character-ui): unify UI on realistic base and add Base Image Chat Agent panel"
```

---

### Task 6: Per-Director Rule Modules (`1 Director = 1 File`, Zero Shared Generic Rules) & `AGENTS.md` Rule

**Files:**
- Create: `src/service/director/rules/types.ts`
- Create: `src/service/director/rules/index.ts`
- Create: `src/service/director/rules/cartoon-explainer-video-director.ts`
- Create: `src/service/director/rules/paper-cutout-explainer-video-director.ts`
- Create: `src/service/director/rules/papercraft-diorama-director.ts`
- Create: `src/service/director/rules/story-short-director.ts`
- Create: `src/service/director/rules/product-demo-director.ts`
- Create: `src/service/director/rules/dialogue-qa-director.ts`
- Create: `src/service/director/rules/listicle-director.ts`
- Create: `src/service/director/rules/tutorial-director.ts`
- Create: `src/service/director/rules/opening-director.ts`
- Create: `src/service/director/rules/ending-director.ts`
- Create: `src/service/director/rules/talking-head-director.ts`
- Create: `src/service/director/rules/full-body-talking-head-director.ts`
- Create: `src/service/director/rules/comparison-card-director.ts`
- Create: `src/service/director/rules/talking-broll-director.ts`
- Create: `src/service/director/rules/surprise-interview-director.ts`
- Create: `src/service/director/rules/outfit-reel-director.ts`
- Create: `src/service/director/rules/follow-shot-director.ts`
- Create: `src/service/director/rules/outfit-change-director.ts`
- Create: `src/service/director/rules/workflow-promo-director.ts`
- Create: `src/service/director/rules/style-switch-director.ts`
- Create: `src/service/director/rules/editorial-interview-director.ts`
- Create: `src/service/director/rules/street-lookbook-director.ts`
- Create: `src/service/director/rules/rules.test.ts`
- Modify: `src/service/director/run-phase-a.ts`
- Modify: `src/service/director/phase-b-clip-prompt.ts`
- Modify: `src/service/director/run-phase-b.ts`
- Modify: `src/service/director/video-locks.ts`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces:
  - `DirectorRuleModule` in `src/service/director/rules/types.ts`:
    - `slug: DirectorSlug`
    - `allowsInventedProps: boolean`
    - `phaseASceneDetailBlock(options: { realistic?: boolean; selfShot?: boolean }): string`
    - `phaseAKeyframeDeltaBlock(options: { language?: VoLanguage; hasCharacter?: boolean; steadyStills?: boolean }): string`
    - `phaseADirectorBlock(options: DirectorPhaseABlockInput): string`
    - `phaseBMotionRules(options: DirectorPhaseBMotionInput): string`
    - `phaseBDetailRules(options: { realistic?: boolean; selfShot?: boolean; narratorOnly?: boolean }): string`
  - `getDirectorRuleModule(skillSlug?: string): DirectorRuleModule` in `src/service/director/rules/index.ts`

- [ ] **Step 1: Write unit tests in `src/service/director/rules/rules.test.ts`**

Test that:
1. Every `DirectorSlug` in `DIRECTORS` has its own dedicated rule module in `src/service/director/rules/<slug>.ts`.
2. Only `cartoon-explainer-video-director` and `paper-cutout-explainer-video-director` have `allowsInventedProps === true`, whiteboard/cutout prop-sliding (`slid in from the frame edge, written on, wiped off`), morph budget lines, and `DUAL_KEYFRAME_GLIDE_RULES`.
3. Non-explainer directors (e.g. `story-short-director`, `talking-broll-director`, `editorial-interview-director`, `street-lookbook-director`, `follow-shot-director`, `product-demo-director`, `tutorial-director`, `dialogue-qa-director`) have `allowsInventedProps === false`, include `STRICT SOURCE FIDELITY (ZERO INVENTED PROPS)` in Phase A, and NEVER output whiteboard phrases (`slid in from the frame edge, written on, wiped off`, `Whiteboard cardboard physics`, `presenter corner`, `a cloud becomes a flower`) in Phase A or Phase B.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/director/rules/rules.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Create the 22 per-director rule files in `src/service/director/rules/`, wire `run-phase-a.ts`, `phase-b-clip-prompt.ts`, `run-phase-b.ts`, and `video-locks.ts`, and document the rule in `AGENTS.md`**

Each director file in `src/service/director/rules/<slug>.ts` is self-contained (duplicating its own rules with zero cross-director prompt imports) and carries the header comment:
`// ISOLATED DIRECTOR RULES: 1 Director = 1 File. Do NOT share or import prompt rules from other directors. Modify only this file when tuning this director.`
Also add the permanent **Director Prompt Isolation (`src/service/director/rules/<director-slug>.ts`)** rule to `AGENTS.md`.

- [ ] **Step 4: Run all director and project tests**

Run: `npx tsx --test src/service/director/rules/rules.test.ts 'src/service/director/**/*.test.ts'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md src/service/director/
git commit -m "refactor(director): isolate all director rules into 1-director-per-file modules with zero shared generic prompts"
```
