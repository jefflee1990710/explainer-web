# Explainer Exclusive Auto On-Screen Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an Explainer-exclusive automated workflow where creators can select an AI artistic text style and coverage mode (`hook` vs `all`) in the creation dock, automatically generating face-safe SAM-3 positioned artistic text into the video timeline without needing to enter the editor.

**Architecture:** Extend `Project` model with `onScreenTextStyleId` and `onScreenTextCoverage`. Build a dedicated Explainer brief dock pill and modal dialog showcasing the 13 artistic text styles with visual cards and coverage toggle. Add an automated orchestration service `auto-onscreen-text.ts` triggered upon Explainer storyboard completion that computes the safe blank zone (via SAM-3 face avoidance) and generates Seedream 5.0 Pro artistic text patches directly into `project.onscreenTexts`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, MongoDB, Sharp, Seedream 5.0 Pro (OpenRouter), SAM-3 (Fal.ai), OpenCut Bridge.

**Spec:** `docs/superpowers/specs/2026-11-11-explainer-auto-onscreen-text-design.md`

## Global Constraints
- Strictly exclusive to Explainer: Do not alter Talking Head or Story dock interfaces or behaviors.
- Default coverage is `"hook"` (Clip 1 only); optional coverage is `"all"` (all storyboard clips).
- Never occlude human faces: reuse `detectCenteredFaceSafeTextZone` which enforces high face-penalty and searches low-variance blank zones.
- All code, identifiers, and comments remain in English; user-facing labels follow i18n with Traditional Chinese (繁體中文) default.

## Review Focus
- When `onScreenTextStyleId` is empty or undefined, the auto on-screen text pipeline must cleanly no-op with 0 jobs scheduled.
- In `"hook"` coverage mode, only Clip 0 (Clip 1) must be scheduled, using `phaseA.localizedTitle` or Scene 1 `「...」` text.
- In `"all"` coverage mode, if a clip has no dialogue / text, it must fallback cleanly to `phaseA.localizedTitle` or skip gracefully without throwing.
- Re-running storyboard regeneration or appending clips must not duplicate existing `onscreenTexts` entries for the same clip.
- OpenCut timeline and player must immediately display the auto-generated `onscreenTexts` without requiring manual addition.

---

### Task 1: Data Model & Serialization for Explainer Auto On-Screen Text

**Files:**
- Modify: `src/model/project.ts`
- Modify: `src/presentation/serialize.ts`
- Test: `src/model/project-onscreen-text.test.ts`

**Interfaces:**
- Consumes: `Project`, `PublicVideo`, `SUBTITLE_LOOK_IDS`
- Produces: `Project.onScreenTextStyleId?: string`, `Project.onScreenTextCoverage?: "hook" | "all"`

- [ ] **Step 1: Write failing unit test for `Project` on-screen text fields and serialization**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { projectSchema } from "@/model/project";
import { toPublicVideo } from "@/presentation/serialize";

test("projectSchema validates onScreenTextStyleId and onScreenTextCoverage", () => {
  const parsed = projectSchema.parse({
    _id: "673200000000000000000001",
    projectId: "673200000000000000000002",
    clerkUserId: "user_test",
    source: "Test explainer",
    status: "draft",
    skillSlug: "explainer",
    onScreenTextStyleId: "clean",
    onScreenTextCoverage: "hook",
  });
  assert.equal(parsed.onScreenTextStyleId, "clean");
  assert.equal(parsed.onScreenTextCoverage, "hook");
});

test("toPublicVideo serializes onScreenTextStyleId and onScreenTextCoverage", () => {
  const publicVideo = toPublicVideo({
    _id: "673200000000000000000001",
    projectId: "673200000000000000000002",
    clerkUserId: "user_test",
    source: "Test explainer",
    status: "draft",
    skillSlug: "explainer",
    onScreenTextStyleId: "neon",
    onScreenTextCoverage: "all",
  } as any);
  assert.equal(publicVideo.onScreenTextStyleId, "neon");
  assert.equal(publicVideo.onScreenTextCoverage, "all");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/model/project-onscreen-text.test.ts`
Expected: FAIL with missing properties on schema or `toPublicVideo`.

- [ ] **Step 3: Update `src/model/project.ts` and `src/presentation/serialize.ts`**

In `src/model/project.ts`:
- Add `onScreenTextStyleId?: string` and `onScreenTextCoverage?: "hook" | "all"` to `Project` interface and `projectSchema`.
- In `src/presentation/serialize.ts`: add `onScreenTextStyleId` and `onScreenTextCoverage` to `PublicVideo` interface and assign them in `toPublicVideo`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/model/project-onscreen-text.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/project.ts src/presentation/serialize.ts src/model/project-onscreen-text.test.ts
git commit -m "feat(model): add onScreenTextStyleId and onScreenTextCoverage to project model and public serializer"
```

---

### Task 2: Explainer Auto On-Screen Text Target Resolver & Background Trigger

**Files:**
- Create: `src/service/director/auto-onscreen-text.ts`
- Test: `src/service/director/auto-onscreen-text.test.ts`
- Modify: `src/service/project/actions.ts`

**Interfaces:**
- Consumes: `Project`, `PublicVideo`, `enqueueOpencutOnScreenText`
- Produces:
  - `resolveExplainerAutoOnScreenTextTargets(project: Project): Array<{ clipIndex: number; text: string; playheadSeconds: number }>`
  - `triggerExplainerAutoOnScreenText(projectId: string | ObjectId): Promise<{ ok: boolean; enqueuedCount: number }>`

- [ ] **Step 1: Write failing test for `resolveExplainerAutoOnScreenTextTargets`**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { resolveExplainerAutoOnScreenTextTargets } from "@/service/director/auto-onscreen-text";
import type { Project } from "@/model/project";

test("resolveExplainerAutoOnScreenTextTargets returns only Clip 1 when coverage is 'hook'", () => {
  const project = {
    skillSlug: "explainer",
    onScreenTextStyleId: "clean",
    onScreenTextCoverage: "hook",
    phaseA: {
      localizedTitle: "香港買樓 3 大陷阱",
      storyboard: [
        { clipNumber: 1, startScene: "Hook: 「買樓避坑」", startVo: "買樓千祈咪踩呢個陷阱" },
        { clipNumber: 2, startScene: "Point 1", startVo: "第一點係印花稅" },
      ],
    },
    clips: [
      { clipNumber: 1, durationSeconds: 5 },
      { clipNumber: 2, durationSeconds: 6 },
    ],
  } as unknown as Project;

  const targets = resolveExplainerAutoOnScreenTextTargets(project);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].clipIndex, 0);
  assert.equal(targets[0].text, "買樓避坑");
  assert.equal(targets[0].playheadSeconds, 0);
});

test("resolveExplainerAutoOnScreenTextTargets returns all clips when coverage is 'all'", () => {
  const project = {
    skillSlug: "explainer",
    onScreenTextStyleId: "neon",
    onScreenTextCoverage: "all",
    phaseA: {
      localizedTitle: "AI 革命",
      storyboard: [
        { clipNumber: 1, startScene: "「AI 改變一切」", startVo: "AI 已經改變工作方式" },
        { clipNumber: 2, startScene: "「自動化工具」", startVo: "自動化工具幫你省時間" },
      ],
    },
    clips: [
      { clipNumber: 1, durationSeconds: 5 },
      { clipNumber: 2, durationSeconds: 6 },
    ],
  } as unknown as Project;

  const targets = resolveExplainerAutoOnScreenTextTargets(project);
  assert.equal(targets.length, 2);
  assert.equal(targets[0].text, "AI 改變一切");
  assert.equal(targets[1].text, "自動化工具");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/director/auto-onscreen-text.test.ts`
Expected: FAIL with module not found or undefined export.

- [ ] **Step 3: Implement `src/service/director/auto-onscreen-text.ts`**

- Extract clean hook text from `startScene` quotes `「...」`, falling back to `project.phaseA.localizedTitle` or `startVo`.
- Implement `resolveExplainerAutoOnScreenTextTargets(project)`.
- Implement `triggerExplainerAutoOnScreenText(projectId)`: fetches project, verifies `skillSlug === "explainer"` and `onScreenTextStyleId`, iterates targets, checks existing `project.onscreenTexts` to avoid re-triggering, and calls `enqueueOpencutOnScreenText` for each target.
- In `src/service/project/actions.ts`: wire `triggerExplainerAutoOnScreenText` into project completion / storyboard settlement.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/director/auto-onscreen-text.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/director/auto-onscreen-text.ts src/service/director/auto-onscreen-text.test.ts src/service/project/actions.ts
git commit -m "feat(explainer): add auto on-screen text target resolver and background orchestration"
```

---

### Task 3: Explainer On-Screen Text Style Picker Modal & Brief Dock Integration

**Files:**
- Create: `src/presentation/components/app/projects/new/explainer-on-screen-text-dialog.tsx`
- Modify: `src/presentation/components/app/projects/new/director-dock-brief.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx`

**Interfaces:**
- Consumes: `SYSTEM_TEXT_STYLE_ORDER`, `systemTextStylePreview`, `SUBTITLE_LOOKS`
- Produces: `ExplainerOnScreenTextDialog`, `onScreenTextStyleId`, `onScreenTextCoverage`

- [ ] **Step 1: Create `ExplainerOnScreenTextDialog` component**

- Create `src/presentation/components/app/projects/new/explainer-on-screen-text-dialog.tsx`:
  - Receives `open`, `onClose`, `enabled`, `onEnabledChange`, `selectedStyleId`, `onStyleIdChange`, `coverage`, `onCoverageChange`.
  - Displays coverage segmented control:
    - `僅第 1 鏡頭 Hook 標題 (預設)` (`hook`)
    - `全部分鏡重點字卡` (`all`)
  - Displays 13 visual style cards with thumbnail from `systemTextStylePreview(styleId)`, name label, and active selection ring.
  - Done button to close.

- [ ] **Step 2: Update `director-dock-brief.tsx` for Explainer**

- In `director-dock-brief.tsx`:
  - When `kind === "explainer"` (or `!talkingHead && !isStory`), render a dedicated `DirectorDockPill` for On-Screen Text:
    - Thumb image: `systemTextStylePreview(onScreenTextStyleId || "clean")`
    - Label: `${styleName} · ${coverage === "all" ? "全分鏡" : "Hook"}`
    - Clicking opens `ExplainerOnScreenTextDialog`.
  - For Talking Head and Story, keep their respective controls untouched.

- [ ] **Step 3: Update `new-project-form.tsx` state and submission**

- Manage `onScreenTextStyleId` (default `"clean"`, Torn Paper) and `onScreenTextCoverage` (default `"hook"`).
- Pass `onScreenTextStyleId` and `onScreenTextCoverage` in `createVideoAction` form data payload.

- [ ] **Step 4: Run typecheck to verify UI wiring**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/app/projects/new/explainer-on-screen-text-dialog.tsx src/presentation/components/app/projects/new/director-dock-brief.tsx src/presentation/components/app/projects/new/new-project-form.tsx
git commit -m "feat(ui): add ExplainerOnScreenTextDialog and brief dock style pill"
```

---

### Task 4: Full System Verification & Regression Testing

**Files:**
- Test: `src/service/director/auto-onscreen-text.test.ts`
- Test: `src/model/project-onscreen-text.test.ts`
- Test: `src/presentation/studio/studio-nav-active.test.ts`

- [ ] **Step 1: Run all related unit tests**

Run: `npx tsx --test 'src/service/director/**/*.test.ts' 'src/model/*.test.ts'`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npx tsc --noEmit`
Expected: Clean exit (0 errors).

- [ ] **Step 3: Run ESLint on touched files**

Run: `npx eslint src/service/director/auto-onscreen-text.ts src/presentation/components/app/projects/new/explainer-on-screen-text-dialog.tsx`
Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: verify explainer auto on-screen text pipeline and tests"
```
