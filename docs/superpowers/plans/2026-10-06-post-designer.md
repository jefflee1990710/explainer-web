# Post Designer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Post rail item that lists generated posters, fills one of 16 layout templates from a content instruction, previews with the scene-image route, and edits text and shapes without calling the model again.

**Architecture:** Post Designer is a Gemini prompt that returns slot text. Layout geometry is fixed in code (x 0–1000, y 0–1500). `createPost` stores those layers, then queues a `postPreview` job through the existing image queue. The editor and PNG export draw the layers. The model image is only `previewUrl` until the first saved edit sets `thumbnailUrl`.

**Tech Stack:** Next.js 16 App Router, React 19, MongoDB driver 7, zod 4, AI SDK `generateText` + `Output.object`, Gemini via `directorModel()`, Higgsfield via `submitImage`, `@vercel/blob`, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-06-post-designer-design.md`

## Global Constraints

- Canvas x is 0–1000, y is 0–1500. Aspect `2:3`. `fontSize` uses that unit.
- Fills: canvas `#FFFFFF`, ink `#1A1A1A`, sage `#9AAF8A`.
- Slot limits: mark 24, headline 40, subhead 80, body 160. Instruction 1–2,000 characters.
- Preview costs `FRAME_COST` (4). CJK copy uses the `zh-Hant` image route; other copy uses `en`. No `zh-Hans` route.
- Check subscription and credits before the designer call. Designer failure creates no post and charges nothing.
- Charge and image-submit failure keep the post, set `previewStatus` to `failed`, and refund when a charge happened.
- Saving layers does not insert a generation job. v1 edits are text, move, and scale only.
- Rail label: English `Post`, zh-Hant `海報`, directly under Video, href `/app/posts`.
- List polls every 4000ms while a visible post is `generating`.
- Hit targets at least 44px. `prefers-reduced-motion` disables decorative motion.

---

### Task 1: Layouts, copy filling, and layer edits

**Files:**
- Create: `src/model/post.ts`
- Create: `src/service/post/layouts.ts`
- Create: `src/service/post/copy.ts`
- Create: `src/service/post/layer-edits.ts`
- Create: `src/presentation/studio/studio-nav-active.ts`
- Test: `src/service/post/copy.test.ts`
- Test: `src/service/post/layer-edits.test.ts`
- Test: `src/presentation/studio/studio-nav-active.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `POSTER_LAYOUTS`, `applyPosterCopy(layout, raw)`, `posterSceneLanguage(text)`, `buildPosterImagePrompt(layers)`, `validatePostInstruction(instruction)`, `mergeLayerEdits(existing, submitted)`, `isStudioNavActive(pathname, href)`, `shouldRefundPreview(status)`

- [ ] **Step 1: Write the failing tests**

`copy.test.ts` asserts unknown slot keys are dropped, headline text is truncated to 40 characters, CJK selects `zh-Hant`, Latin selects `en`, and the image prompt contains the filled wording plus the blueprint instruction.

`layer-edits.test.ts` asserts an unknown layer id is rejected, fill and shape kind stay as stored, and text is truncated.

`studio-nav-active.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { isStudioNavActive } from "@/presentation/studio/studio-nav-active";

test("a poster page highlights Post and not Video", () => {
  assert.equal(isStudioNavActive("/app/posts/abc", "/app/posts"), true);
  assert.equal(isStudioNavActive("/app/posts/abc", "/app"), false);
  assert.equal(isStudioNavActive("/app/projects/abc", "/app"), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/post/copy.test.ts src/service/post/layer-edits.test.ts src/presentation/studio/studio-nav-active.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement layouts, copy, edits, and nav active**

Sixteen templates in row-major order. Each has one `headline` slot where the sheet's wordmark sits. Shapes use `rect`, `circle`, `quarterCircle`, `semicircle`, `triangle`, `lineStack`, `ellipse`, and `blob`. Layout 13's blob path is derived from the layer box at render time.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/post/copy.test.ts src/service/post/layer-edits.test.ts src/presentation/studio/studio-nav-active.test.ts`

Expected: PASS

### Task 2: Create, preview job, save

**Files:**
- Create: `src/dao/posts.ts`
- Modify: `src/dao/index.ts`
- Create: `src/service/post/designer.ts`
- Create: `src/service/post/create-post.ts`
- Create: `src/service/post/save-layers.ts`
- Create: `src/service/post/sync-preview.ts`
- Modify: `src/model/generation-job.ts`
- Modify: `src/service/generation/task-senders.ts`
- Modify: `src/service/generation/task-runner.ts`
- Modify: `src/service/generation/task-list.ts`
- Modify: `src/service/higgsfield/pipeline.ts`
- Modify: `src/service/higgsfield/generate.ts` (`aspectRatio` accepts `"2:3"`)
- Create: `src/presentation/actions/posts.ts`
- Modify: `src/util/i18n/messages/workspace/tasks.en.ts`
- Modify: `src/util/i18n/messages/workspace/tasks.zh-Hant.ts`
- Test: `src/service/generation/task-list.test.ts` (add `postPreview` detail)

**Interfaces:**
- Consumes: Task 1 functions, `insertPendingJob`, `kickJob`, `submitImage`, `consumeCredits`, `refundCredits`, `assertCanSpendCredits`, `directorModel`
- Produces: `createPostAction`, `retryPostPreviewAction`, `savePostLayersAction`, `syncPostPreviewJob`

- [ ] **Step 1: Extend the job kind and task label test**

```ts
assert.equal(taskDetail({ kind: "postPreview", clipIndex: 0 }), "海報預覽");
```

- [ ] **Step 2: Run that test and confirm it fails**

Run: `npx tsx --test src/service/generation/task-list.test.ts`

- [ ] **Step 3: Implement create, retry, save, and job sync**

`createPost` validates, checks credits, calls the designer, inserts `posts` with filled layers and `previewStatus: "generating"`, then charges and queues `postPreview`. `sendPostPreview` rebuilds the prompt from layers and sends the blueprint PNG as the only reference. Completion writes `previewUrl`. Failure sets `failed` and refunds once via `previewSpendKey`.

- [ ] **Step 4: Run the task-list test and typecheck the new modules**

Run: `npx tsx --test src/service/generation/task-list.test.ts src/service/post/*.test.ts`

### Task 3: Rail, list, and editor

**Files:**
- Create: `public/posters/layouts/01.png` … `16.png`
- Create: `src/app/app/posts/page.tsx`
- Create: `src/app/app/posts/[id]/page.tsx`
- Create: `src/presentation/components/app/posts/post-list.tsx`
- Create: `src/presentation/components/app/posts/create-post-dialog.tsx`
- Create: `src/presentation/components/app/posts/post-card.tsx`
- Create: `src/presentation/components/app/posts/post-editor.tsx`
- Create: `src/presentation/components/app/posts/post-canvas.tsx`
- Create: `src/util/i18n/messages/workspace/post.en.ts`
- Create: `src/util/i18n/messages/workspace/post.zh-Hant.ts`
- Modify: `src/util/i18n/messages/types.ts`
- Modify: `src/util/i18n/messages/en.ts`
- Modify: `src/util/i18n/messages/zh-Hant.ts`
- Modify: `src/presentation/components/app-shell.tsx`
- Modify: `src/presentation/studio/studio-shell.tsx`
- Modify: `src/presentation/studio/studio-nav.tsx`

- [ ] **Step 1: Crop the 16 blueprint PNGs from the reference sheet into `public/posters/layouts`.**

- [ ] **Step 2: Add the Post rail item under Video and the list/editor screens.**

The list card uses `thumbnailUrl` when set, otherwise `previewUrl`. Generating with no image shows a 2:3 skeleton. Failed with no thumbnail shows retry. The editor draws `layers` only. Drag moves, corner handles scale, the side field edits the selected text. Save uploads the layer PNG. Download uses the same raster.

- [ ] **Step 3: Verify**

Run: `npx tsx --test src/service/post/*.test.ts src/presentation/studio/studio-nav-active.test.ts src/service/generation/task-list.test.ts`

Run: `npx tsc --noEmit`

Run: `npx eslint` on the files touched.
