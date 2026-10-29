# Custom Director Editor & Standalone `IDirector` Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy `user_directors` template-fork model with a 100% standalone `IDirector` database collection (`directors`), a deterministic prompt compiler (`compileDirectorPrompts`), a Reference Video / IG Reel AI Analyzer, and a directly editable Director Studio UI (`behavior` controls + 8 `profile` fields + `performance` slots + AI Co-Pilot).

**Architecture:** Every user-created director is stored in MongoDB's `directors` collection (`directorsCollection()`) as a complete, self-contained `IDirector` document (with its own `behavior`, `profile`, `performance`, `extraInstructions`, and compiled `systemPrompt` + `references`). Built-in directors stay in `src/service/director/catalog/`, while `listSelectableSkills`, `findSelectableSkill`, and `loadStoredSkill` seamlessly read both built-in and standalone database directors without any runtime `baseSlug` dependency.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, MongoDB (`mongodb`), Zod, Vercel AI SDK (`ai` + Google Gemini `directorModel()`), Node built-in test runner (`node:test` + `tsx`).

**Spec:** `docs/superpowers/specs/2026-10-29-custom-director-editor-design.md`

## Global Constraints

- Always define MongoDB collection types explicitly: `db.collection<Skill>("directors")`.
- Never use live paid Higgsfield API calls in tests; use pure functions or mock `fetch`.
- Keep new UI components in separate focused files with `'use client'` at the top whenever React hooks are used.
- Ensure `npx tsc --noEmit` and `npx eslint` pass cleanly.

---

### Task 1: Standalone `IDirector` Schema, `directorsCollection` DAO, and `compileDirectorPrompts`

**Files:**
- Modify: `src/model/director.ts`
- Modify: `src/model/skill.ts`
- Create: `src/dao/directors.ts`
- Delete: `src/dao/user-directors.ts`
- Modify: `src/dao/index.ts`
- Create: `src/service/director/compile-director-prompts.ts`
- Test: `src/service/director/compile-director-prompts.test.ts`

**Interfaces:**
- Produces:
  - `directorsCollection(): Promise<Collection<OptionalId<Skill>>>` in `src/dao/directors.ts`
  - `DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR: IDirectorBehavior` in `src/service/director/compile-director-prompts.ts`
  - `compileDirectorPrompts(input: CompileDirectorInput): { systemPrompt: string; references: SkillReference[] }` in `src/service/director/compile-director-prompts.ts`

- [ ] **Step 1: Write the failing test `src/service/director/compile-director-prompts.test.ts`**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  compileDirectorPrompts,
  DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
} from "@/service/director/compile-director-prompts";
import { emptyProfile } from "@/service/director/profile";

test("compileDirectorPrompts builds standalone systemPrompt and Phase A/B references from profile, behavior, and extraInstructions", () => {
  const compiled = compileDirectorPrompts({
    slug: "director-abc123",
    title: "Coffee Shop Founder Interview",
    description: "Warm 15-degree off-camera interview with espresso B-roll.",
    behavior: {
      ...DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
      speechMode: "lip-sync",
      bansNarration: true,
      audioFirstLipSync: true,
    },
    profile: {
      ...emptyProfile(),
      bestFor: "Founder stories and artisan product launches",
      hook: "Opens on a candid confession while pouring espresso",
      visual: "Warm café window light, 50mm f/1.8 shallow bokeh",
    },
    extraInstructions: "Always end on a warm sip of coffee.",
  });

  assert.match(compiled.systemPrompt, /Coffee Shop Founder Interview/);
  assert.match(compiled.systemPrompt, /Founder stories and artisan product launches/);
  assert.match(compiled.systemPrompt, /Always end on a warm sip of coffee/);
  assert.match(compiled.systemPrompt, /lip-sync/i);
  assert.equal(compiled.references.length, 2);
  assert.equal(compiled.references[0].path, "references/proposal-contract.md");
  assert.equal(compiled.references[1].path, "references/prompt-contract.md");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/director/compile-director-prompts.test.ts`

- [ ] **Step 3: Implement `directorsCollection`, `IDirectorBehavior` extensions, and `compileDirectorPrompts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/director/compile-director-prompts.test.ts`

---

### Task 2: Standalone Director Edits, Actions, and Reference Video / IG Reel Analyzer

**Files:**
- Modify: `src/service/director/director-edits.ts`
- Modify: `src/service/director/director-edits.test.ts`
- Create: `src/service/director/analyze-reference-video.ts`
- Modify: `src/service/director/director-actions.ts`
- Modify: `src/presentation/actions/directors.ts`
- Modify: `src/service/director/run-skill.ts`
- Modify: `src/service/director/run-skill.test.ts`

**Interfaces:**
- Produces:
  - `createDirectorAction(input: { templateSlug?: string; title: string; description: string; suggestedUseCase?: string }): Promise<CreateDirectorResult>`
  - `analyzeReferenceVideoForDirectorAction(formData: FormData): Promise<CreateDirectorResult>`
  - `saveDirectorAction(input: { id: string; title: string; description: string; suggestedUseCase?: string; behavior?: Partial<IDirectorBehavior>; customProfile: DirectorProfile; extraInstructions: string; customPerformance?: PerformanceSlots }): Promise<SaveDirectorResult>`

- [ ] **Step 1: Update `director-edits.ts` & `run-skill.ts` so custom directors store and run from their own standalone `behavior`, `systemPrompt`, `references`, `profile`, and `performance`**
- [ ] **Step 2: Implement `analyze-reference-video.ts` to extract IG Reel / MP4 frames & caption and generate a complete standalone `IDirector` via `directorModel()`**
- [ ] **Step 3: Run unit tests `director-edits.test.ts` and `run-skill.test.ts`**

---

### Task 3: Wire Standalone Database Directors into `selectable-skills`, `load-skill`, and Pipeline

**Files:**
- Modify: `src/service/director/selectable-skills.ts`
- Modify: `src/service/director/selectable-skills.test.ts`
- Modify: `src/service/director/load-skill.ts`
- Modify: `src/service/director/load-skill.test.ts`
- Modify: `src/service/director/clip-continuity.ts`
- Modify: `src/service/higgsfield/pipeline.ts`
- Modify: `src/service/generation/task-senders.ts`
- Modify: `src/service/generation/task-list.ts`
- Modify: `src/service/generation/task-advance.ts`
- Modify: `src/service/director/director-preview.ts`

- [ ] **Step 1: Update `listSelectableSkills(clerkUserId)`, `findSelectableSkill(clerkUserId, slug)`, and `loadStoredSkill(id)` to query `directorsCollection()` alongside built-in `DIRECTORS`**
- [ ] **Step 2: Honor `behavior.audioFirstLipSync` and `behavior.wardrobeBuild` on custom directors in `pipeline.ts` and `clip-continuity.ts`**
- [ ] **Step 3: Run `selectable-skills.test.ts` and `load-skill.test.ts`**

---

### Task 4: Directly Editable Director Studio UI + Reference Reel Analyzer Modal

**Files:**
- Create: `src/presentation/components/app/directors/[id]/director-behavior-section.tsx`
- Modify: `src/presentation/components/app/directors/[id]/director-profile-section.tsx`
- Modify: `src/presentation/components/app/directors/[id]/director-performance-section.tsx`
- Modify: `src/presentation/components/app/directors/[id]/director-info-panel.tsx`
- Modify: `src/presentation/components/app/directors/[id]/director-workspace.tsx`
- Modify: `src/presentation/components/app/directors/create-director-dialog.tsx`
- Modify: `src/presentation/components/app/directors/directors-view.tsx`
- Modify: `src/app/app/directors/page.tsx`

- [ ] **Step 1: Make `DirectorProfileSection` and `DirectorPerformanceSection` directly editable with textareas for custom directors**
- [ ] **Step 2: Create `DirectorBehaviorSection` with visual segmented controls and switches for `speechMode`, `audioFirstLipSync`, `keyframeMode`, `chainsClipStarts`, `dualBeat`, `requiredCastCount`, `wardrobeBuild`, `requiresSpokenScript`, etc.**
- [ ] **Step 3: Upgrade `CreateDirectorDialog` and `DirectorsView` with 3 creation modes: (1) Analyze IG Reel / Reference Video, (2) Copy from Existing Director (100% standalone copy), and (3) Blank Custom Director**
- [ ] **Step 4: Run `npx tsc --noEmit`, `npx eslint`, and all unit tests, then commit and push**
