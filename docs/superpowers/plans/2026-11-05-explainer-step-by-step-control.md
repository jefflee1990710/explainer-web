# Explainer Step-by-Step Cartoon & Diagram Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give users structured step-by-step control over cartoon character placement/actions, diagram archetypes, visual teaching nodes, and interactive canvas stamps in Explainer clip drafts, wired end-to-end from AI Auto-Draft through Phase A and Seedream 5.0 Pro frame generation.

**Architecture:** Extend `StoryboardClipDraft` with structured cartoon/diagram fields (`diagramLayout`, `characterPosition`, `characterAction`, `visualNodes`, `sketchElements`), upgrade `draftStoryboardClipsWithAi` to auto-plan those fields plus `0..100` wireframe `sketchElements`, add Fabric.js stamp/layout rendering to `AnnotationEditor` + `StoryboardSketchPad`, add the structured control UI to `StoryboardDraftsStep`, and wire `clipDraft` layout locks + `sketchUrl` references into `frame-prompts.ts`.

**Tech Stack:** Next.js 16, TypeScript, Zod, Fabric.js (`AnnotationEditor`), Vercel AI SDK (`generateText` + `Output.object`), Node built-in test runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-11-05-explainer-step-by-step-control-design.md`

## Global Constraints
- Preserve backward compatibility for existing `StoryboardClipDraft` documents containing only `{ clipNumber, explanation, voDraft, sketchUrl }`.
- Never make live paid provider calls in unit tests.
- All UI labels must support both English (`en`) and Traditional Chinese (`zh-Hant`).

## Review Focus
- Empty `visualNodes` or `"auto"` layout/position values must not emit noisy prompt lines.
- AI Auto-Draft updates must preserve existing hand-drawn `sketchUrl` unless new `sketchElements` are generated or applied.
- `sanitizeClipDraftsInput` must accept drafts that only specify structured controls (`diagramLayout`, `characterPosition`, `characterAction`, or `visualNodes`) even when `explanation` is initially empty.
- `frameSubmitPlan` must only attach `clipDraft.sketchUrl` when it is a valid `https://` or `data:image/` URL and only on `position === "start"` so end-frame motion is not locked to the static wireframe.

---

### Task 1: Model & Storyboard Draft Service (`project.ts` & `storyboard-draft-chat.ts`)
- [ ] Extend `StoryboardClipDraft` and `projectSchema` in `src/model/project.ts` with `diagramLayout`, `characterPosition`, `characterAction`, and `visualNodes`.
- [ ] Update `sanitizeClipDraftsInput`, `buildStoryboardDraftPhaseABlock`, `mergeAiDraftsWithExistingSketches`, `buildPresetSketchElements`, and `draftStoryboardClipsWithAi` in `src/service/director/storyboard-draft-chat.ts`.
- [ ] Add unit tests in `src/service/director/storyboard-draft-chat.test.ts` and verify they pass.

### Task 2: Frame Prompt & Seedream Sketch Reference Wiring (`frame-prompts.ts`)
- [ ] Add `clipDraftStagingLine` and `clipDraftSketchReference` in `src/service/higgsfield/frame-prompts.ts` so `buildFramePrompt` and `frameSubmitPlan` incorporate `clipDraft` structured controls and attach `clipDraft.sketchUrl` on `start` frames.
- [ ] Add unit tests in `src/service/higgsfield/frame-prompts.test.ts` and verify they pass.

### Task 3: Interactive Stamp Canvas & Structured Cartoon Control UI (`annotation-editor.tsx`, `storyboard-sketch-pad.tsx`, `storyboard-drafts-step.tsx`)
- [ ] Add `addStamp` and `loadSketchElements` to `AnnotationEditor` (`src/presentation/components/annotation-editor.tsx`).
- [ ] Add 1-click stamp buttons (`+ 角色 Person`, `+ 方框 Box`, `+ 圓形 Circle`, `+ 箭咀 Arrow`, `+ 標題 Banner`) and automatic `sketchElements` rendering to `StoryboardSketchPad`.
- [ ] Add Diagram Layout picker, Character Position & Action controls, and Step-by-Step Visual Nodes chip editor to `StoryboardDraftsStep` + i18n keys in `brief.en.ts` and `brief.zh-Hant.ts`.
- [ ] Run `npx tsc --noEmit` and unit tests to verify 0 errors.
