# Post SAM Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy 16-layout SVG poster feature on `/app/posts` with a `<DirectorDock>` Post Studio that generates `2K` posts via OpenRouter `bytedance-seed/seedream-5-0-pro`, segments `person`, `text`, and `object` regions via VLM + `fal-ai/sam-3/image-rle`, and lets users select any RLE element to regenerate/modify in place with full revision history.

**Architecture:** `src/model/post.ts` defines the new `Post`, `DetectedPostElement`, and `PostRevision` types (with backward-compatible normalization for any old documents in `posts`). `src/service/fal/sam3-post.ts` runs a VLM foreground-object inventory followed by parallel `fal-ai/sam-3/image-rle` segmentation and cross-category IoU deduplication. `src/service/post/pipeline.ts` and `src/service/post/prompts.ts` handle initial `seedream-5-0-pro` `2K` generation, element-targeted regeneration (`swap_character`, `replace_product`, `change`, `remove`), revision switching, and `FRAME_COST` (`4` credits) billing/refunds, surfaced through `<PostStudio>` (`src/presentation/components/app/posts/post-studio.tsx`) and `<PostElementRleOverlay>` (`src/presentation/components/app/posts/post-element-rle-mapper.tsx`).

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, MongoDB (`postsCollection`), OpenRouter (`bytedance-seed/seedream-5-0-pro`, `qwen/qwen2.5-vl-72b-instruct`), fal.ai (`fal-ai/sam-3/image-rle`), Sharp, Tailwind CSS, Node built-in test runner (`node:test` + `node:assert/strict`).

**Spec:** `docs/superpowers/specs/2026-11-04-post-sam-studio-design.md`

## Global Constraints

- All image generation and element regeneration must use `OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL` (`bytedance-seed/seedream-5-0-pro`) at `resolution: "2k"` and persist output buffers to Vercel Blob (`persistBuffer`), never storing raw `data:` URLs in MongoDB.
- Every AI post creation or SAM element regeneration charges `FRAME_COST` (`4` credits) via `assertCanSpendCredits` + `consumeCredits` and refunds via `refundCredits` if generation fails; uploading an existing image or running SAM 3 detection (`redetectPostElements`) charges `0` credits.
- When `FAL_KEY` is not configured (`!hasFalKey()`), `detectPostElementsWithFalSam3` must return `[]` without throwing.
- Never make live paid provider calls in unit tests; inject `{ fetch: fakeFetch }` into all VLM, OpenRouter, and fal.ai functions.
- Update `pipeline-models.md` so the Post Studio model & segmentation pipeline stays in sync with the system design.

## Review Focus

1. **Legacy `Post` documents in MongoDB (`layoutId` / `instruction` / `layers` / `previewStatus` without `revisions`)**: `toPublicPost` must normalize legacy fields (`instruction` → `prompt`, `previewUrl || thumbnailUrl` → `currentImageUrl`, `previewStatus: "ready"` → `status: "completed"`) without crashing when listing `/app/posts` or global tasks.
2. **Cross-category RLE mask overlap (`object` duplicating `person` or `text`)**: `detectPostElementsWithFalSam3` must drop any `object` mask whose binary mask IoU with any accepted `person` or `text` mask is `> 0.6`, and deduplicate overlapping `object` masks (`IoU > 0.65`).
3. **VLM malformed JSON or timeout during object inventory**: `discoverPostObjectsWithVlm` must catch JSON parse errors or HTTP failures and return the fallback `[{ prompt: "foreground object, product, item", labelEn: "Object", labelZh: "物件" }]` with `hasText: true` so SAM 3 segmentation still proceeds.
4. **Element edit mode validation (`swap_character` without donor, `text` `change` with empty text)**: `buildPostElementEditPrompt` and `editPostElementJob` must reject missing required inputs before charging credits.
5. **Reverting to an earlier revision (`selectPostRevision`) before editing again**: Switching to an earlier revision must update both `currentImageUrl` and `detectedElements` to that revision's snapshot so subsequent element edits operate on the selected revision's image and masks.

---

### Task 1: Post Data Model, Prompt Builders, and Legacy Cleanup

**Files:**
- Modify: `src/model/post.ts`
- Modify: `src/service/post/feature.ts`
- Create: `src/service/post/prompts.ts`
- Test: `src/service/post/post-pipeline.test.ts`
- Delete: `src/model/post-layers.ts`, `src/service/post/layouts.ts`, `src/service/post/designer.ts`, `src/service/post/save-layers.ts`, `src/service/post/layer-edits.ts`, `src/service/post/layer-edits.test.ts`, `src/service/post/copy.ts`, `src/service/post/copy.test.ts`, `src/service/post/send-preview.ts`, `src/service/post/sync-preview.ts`

**Interfaces:**
- Produces in `src/model/post.ts`:
  - `POST_ASPECT_RATIOS = ["9:16", "1:1", "16:9", "2:3"] as const`, `PostAspectRatio`
  - `POST_ELEMENT_CATEGORIES = ["person", "object", "text"] as const`, `PostElementCategory`
  - `POST_ELEMENT_EDIT_MODES = ["swap_character", "replace_product", "change", "remove"] as const`, `PostElementEditMode`
  - `DetectedPostElement`, `PostRevision`, `PostJobStatus`, `Post`, `PublicPost`
  - `isPostAspectRatio(v: string): v is PostAspectRatio`
  - `toPublicPost(doc: Record<string, unknown> & { _id: ObjectId }): PublicPost`
- Produces in `src/service/post/prompts.ts`:
  - `buildPostCreatePrompt(input: { prompt: string; styleName?: string; styleLook?: string; cast?: Array<{ name: string; outfitSpec?: string }>; products?: Array<{ name: string }>; hasReferenceImage?: boolean }): string`
  - `buildPostElementEditPrompt(input: { element: Pick<DetectedPostElement, "category" | "categoryIndex" | "label" | "box">; editMode: PostElementEditMode; instruction?: string; characterName?: string; characterOutfitSpec?: string; productName?: string; hasDonorImage?: boolean }): string`
  - `postTaskTitle(post: { prompt?: string; instruction?: string }): string`

- [ ] **Step 1: Write the failing unit tests in `src/service/post/post-pipeline.test.ts`**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { isPostAspectRatio, toPublicPost } from "@/model/post";
import {
  buildPostCreatePrompt,
  buildPostElementEditPrompt,
  postTaskTitle,
} from "@/service/post/prompts";

test("toPublicPost normalizes both new SAM Post docs and legacy SVG Post docs", () => {
  const id = new ObjectId("65f000000000000000000001");
  const now = new Date("2026-11-04T10:00:00.000Z");

  const legacyPublic = toPublicPost({
    _id: id,
    clerkUserId: "u1",
    instruction: "Summer iced coffee promo",
    previewUrl: "https://blob.example/legacy.webp",
    previewStatus: "ready",
    aspectRatio: "2:3",
    createdAt: now,
    updatedAt: now,
  });

  assert.equal(legacyPublic.id, id.toHexString());
  assert.equal(legacyPublic.status, "completed");
  assert.equal(legacyPublic.prompt, "Summer iced coffee promo");
  assert.equal(legacyPublic.currentImageUrl, "https://blob.example/legacy.webp");
  assert.deepEqual(legacyPublic.detectedElements, []);
  assert.equal(legacyPublic.revisions.length, 1);
  assert.equal(isPostAspectRatio("9:16"), true);
  assert.equal(isPostAspectRatio("2:3"), true);
  assert.equal(isPostAspectRatio("4:3"), false);
});

test("buildPostCreatePrompt includes cast outfits, products, and style look in ordinal order", () => {
  const text = buildPostCreatePrompt({
    prompt: "A neon streetwear poster with headline 'NIGHT DROP'",
    styleName: "Cyber Editorial",
    styleLook: "high-contrast neon rim lighting",
    cast: [{ name: "Luna", outfitSpec: "black leather jacket and cargo pants" }],
    products: [{ name: "Glow Sneaker" }],
    hasReferenceImage: true,
  });

  assert.match(text, /attached image 1.*Luna/i);
  assert.match(text, /black leather jacket and cargo pants/i);
  assert.match(text, /attached image 2.*Glow Sneaker/i);
  assert.match(text, /attached image 3/i);
  assert.match(text, /NIGHT DROP/);
});

test("buildPostElementEditPrompt handles person swap_character, object replace_product, text change, and remove", () => {
  const personSwap = buildPostElementEditPrompt({
    element: {
      category: "person",
      categoryIndex: 1,
      label: "Person #1",
      box: { x: 0.1, y: 0.2, width: 0.3, height: 0.7 },
    },
    editMode: "swap_character",
    characterName: "Aria",
    characterOutfitSpec: "white silk blouse and pleated skirt",
    hasDonorImage: true,
  });
  assert.match(personSwap, /attached image 2/i);
  assert.match(personSwap, /attached image 1/i);
  assert.match(personSwap, /white silk blouse and pleated skirt/i);

  const objectChange = buildPostElementEditPrompt({
    element: {
      category: "object",
      categoryIndex: 1,
      label: "Coffee Cup",
      box: { x: 0.6, y: 0.5, width: 0.2, height: 0.25 },
    },
    editMode: "replace_product",
    productName: "Matcha Tin",
    instruction: "held in the right hand",
    hasDonorImage: true,
  });
  assert.match(objectChange, /Coffee Cup/);
  assert.match(objectChange, /Matcha Tin/);
  assert.match(objectChange, /attached image 2/i);

  const textEdit = buildPostElementEditPrompt({
    element: {
      category: "text",
      categoryIndex: 1,
      label: "Headline Text",
      box: { x: 0.15, y: 0.08, width: 0.7, height: 0.14 },
    },
    editMode: "change",
    instruction: "GRAND OPENING 50% OFF",
  });
  assert.match(textEdit, /GRAND OPENING 50% OFF/);
  assert.match(textEdit, /font|typography/i);

  const removeEdit = buildPostElementEditPrompt({
    element: {
      category: "object",
      categoryIndex: 2,
      label: "Sunglasses",
      box: { x: 0.4, y: 0.3, width: 0.15, height: 0.08 },
    },
    editMode: "remove",
  });
  assert.match(removeEdit, /Remove.*Sunglasses/i);
  assert.equal(postTaskTitle({ prompt: "  Hello world  " }), "Hello world");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/post/post-pipeline.test.ts`
Expected: FAIL with module/export not found (`isPostAspectRatio`, `@/service/post/prompts`).

- [ ] **Step 3: Implement `src/model/post.ts`, `src/service/post/feature.ts`, `src/service/post/prompts.ts`, and delete legacy SVG poster files**

- Set `POSTS_FEATURE_ENABLED = true` in `src/service/post/feature.ts`.
- Implement `src/model/post.ts` with the exact types from Spec §5.1 and `toPublicPost` normalizing both current `Post` documents and legacy `{ instruction, previewUrl, thumbnailUrl, previewStatus }` documents (synthesizing a single fallback `PostRevision` when `revisions` is empty/missing and `currentImageUrl` exists).
- Implement `src/service/post/prompts.ts`:
  - `buildPostCreatePrompt`: Reference image ordinal order is `[...castLookUrls, ...productBlueprintUrls, referenceImageUrl?]`. Explicitly describe each ordinal reference image, style look, and the user's `prompt`.
  - `buildPostElementEditPrompt`:
    - When `editMode === "swap_character"` (`hasDonorImage === true`), reference order is `[donorImageUrl, currentPostImageUrl]` (`attached image 1` = donor character, `attached image 2` = base post image) matching `JutsuStudio` `character_swap`.
    - For all other modes (`replace_product`, `change`, `remove`), reference order is `[currentPostImageUrl, donorImageUrl?]` (`attached image 1` = base post image, `attached image 2` = optional product/reference donor) matching `JutsuStudio` `object_swap`.
    - Include normalized spatial location (`horizontalZoneLabel` + vertical percentage range from `element.box`) and explicit preservation of unselected people, objects, and typography.
- Delete the legacy SVG layout files listed above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/post/post-pipeline.test.ts`
Expected: PASS (3 tests passing).

- [ ] **Step 5: Commit**

```bash
git add -A src/model/post.ts src/model/post-layers.ts src/service/post/
git commit -m "feat(post): replace SVG poster model with SAM Post Studio model and prompts"
```

---

### Task 2: SAM 3 Multi-Category Segmentation Service (`person`, `text`, `object`)

**Files:**
- Modify: `src/service/fal/rle.ts`
- Create: `src/service/fal/sam3-post.ts`
- Test: `src/service/fal/sam3-post.test.ts`

**Interfaces:**
- Produces in `src/service/fal/rle.ts`:
  - `binaryMaskIoU(a: Uint8Array, b: Uint8Array): number`
- Produces in `src/service/fal/sam3-post.ts`:
  - `DiscoveredPostObject = { prompt: string; labelEn: string; labelZh: string }`
  - `discoverPostObjectsWithVlm(imageBuffer: Buffer, options?: { fetch?: typeof fetch }): Promise<{ objects: DiscoveredPostObject[]; hasText: boolean }>`
  - `detectPostElementsWithFalSam3(input: { imageBuffer: Buffer; width: number; height: number }, options?: { fetch?: typeof fetch; pollIntervalMs?: number; maxWaitMs?: number }): Promise<DetectedPostElement[]>`

- [ ] **Step 1: Write the failing unit tests in `src/service/fal/sam3-post.test.ts`**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { binaryMaskIoU } from "@/service/fal/rle";
import {
  detectPostElementsWithFalSam3,
  discoverPostObjectsWithVlm,
} from "@/service/fal/sam3-post";

test("binaryMaskIoU computes intersection-over-union for binary masks", () => {
  const a = new Uint8Array([1, 1, 0, 0]);
  const b = new Uint8Array([1, 0, 1, 0]);
  assert.equal(Math.round(binaryMaskIoU(a, b) * 100), 33);
  assert.equal(binaryMaskIoU(a, a), 1);
});

test("discoverPostObjectsWithVlm parses VLM JSON and falls back cleanly on error", async () => {
  const prevKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-or-key";
  try {
    const okRes = await discoverPostObjectsWithVlm(Buffer.from("fake-jpg"), {
      fetch: (async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '```json\n{"objects":[{"prompt":"perfume bottle","labelEn":"Perfume Bottle","labelZh":"香水瓶"}],"hasText":true}\n```',
                },
              },
            ],
          }),
          { status: 200 },
        )) as typeof fetch,
    });
    assert.equal(okRes.objects.length, 1);
    assert.equal(okRes.objects[0]?.prompt, "perfume bottle");
    assert.equal(okRes.objects[0]?.labelZh, "香水瓶");
    assert.equal(okRes.hasText, true);

    const fallbackRes = await discoverPostObjectsWithVlm(Buffer.from("fake-jpg"), {
      fetch: (async () => new Response("server error", { status: 500 })) as typeof fetch,
    });
    assert.equal(fallbackRes.objects.length, 1);
    assert.equal(fallbackRes.objects[0]?.labelEn, "Object");
    assert.equal(fallbackRes.hasText, true);
  } finally {
    process.env.OPENROUTER_API_KEY = prevKey;
  }
});

test("detectPostElementsWithFalSam3 segments person, text, and object masks and filters overlapping object masks", async () => {
  const prevFal = process.env.FAL_KEY;
  const prevOr = process.env.OPENROUTER_API_KEY;
  process.env.FAL_KEY = "test-fal-key";
  process.env.OPENROUTER_API_KEY = "test-or-key";

  // 10x10 canvas (100 pixels):
  // - person at pixels 0..20 ("0 20")
  // - text at pixels 30..40 ("30 10")
  // - object #1 overlapping person at pixels 0..20 ("0 20") -> should be filtered out by IoU > 0.6
  // - object #2 distinct at pixels 60..80 ("60 20") -> should be kept as "Perfume Bottle"
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("openrouter.ai")) {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  objects: [{ prompt: "perfume bottle", labelEn: "Perfume Bottle", labelZh: "香水瓶" }],
                  hasText: true,
                }),
              },
            ],
          ],
        }),
        { status: 200 },
      );
    }
    if (url.includes("rest.alpha.fal.ai/storage/upload/initiate")) {
      return new Response(
        JSON.stringify({
          upload_url: "https://upload.fal.test/put",
          file_url: "https://v3.fal.media/files/post.jpg",
        }),
        { status: 200 },
      );
    }
    if (url === "https://upload.fal.test/put") {
      return new Response("", { status: 200 });
    }
    if (url.includes("queue.fal.run/fal-ai/sam-3/image-rle")) {
      const body = init?.body ? (JSON.parse(String(init.body)) as { prompt?: string }) : {};
      if (body.prompt === "person") {
        return new Response(JSON.stringify({ rle: ["0 20"], scores: [0.95] }), { status: 200 });
      }
      if (body.prompt?.includes("text")) {
        return new Response(JSON.stringify({ rle: ["30 10"], scores: [0.92] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ rle: ["0 20", "60 20"], scores: [0.88, 0.91] }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const elements = await detectPostElementsWithFalSam3(
      { imageBuffer: Buffer.from("fake-jpg"), width: 10, height: 10 },
      { fetch: fakeFetch },
    );
    assert.equal(elements.length, 3);
    assert.deepEqual(
      elements.map((e) => ({ id: e.id, category: e.category, label: e.label, labelZh: e.labelZh })),
      [
        { id: "person-1", category: "person", label: "Person #1", labelZh: "人物 #1" },
        { id: "object-1", category: "object", label: "Perfume Bottle", labelZh: "香水瓶" },
        { id: "text-1", category: "text", label: "Text #1", labelZh: "文字 #1" },
      ],
    );
  } finally {
    process.env.FAL_KEY = prevFal;
    process.env.OPENROUTER_API_KEY = prevOr;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/fal/sam3-post.test.ts`
Expected: FAIL with `binaryMaskIoU` and `@/service/fal/sam3-post` not found.

- [ ] **Step 3: Implement `binaryMaskIoU` in `src/service/fal/rle.ts` and `src/service/fal/sam3-post.ts`**

- In `src/service/fal/rle.ts`, add `binaryMaskIoU(a: Uint8Array, b: Uint8Array): number` computing `intersection / union` (returning `0` when `union === 0`).
- In `src/service/fal/sam3-post.ts`:
  - Implement `discoverPostObjectsWithVlm` calling `OPENROUTER_BASE_URL/api/v1/chat/completions` (`OPENROUTER_JUTSU_VLM_MODEL`) with the image buffer (resized via `sharp` if valid image bytes, or raw buffer fallback in tests) and parsing `{ objects, hasText }` (capped at 4 objects).
  - Implement `detectPostElementsWithFalSam3`:
    - Return `[]` when `!hasFalKey() || input.width <= 0 || input.height <= 0`.
    - Run `uploadFalBuffer` and `discoverPostObjectsWithVlm` in parallel.
    - Query `FAL_SAM3_IMAGE_RLE_ENDPOINT` in parallel for `"person"`, `"text, title, headline, typography, logo"` (when `hasText !== false`), and each discovered object prompt.
    - Filter masks by minimum foreground ratio (`0.005` for `person`, `0.002` for `text`, `0.004` for `object`), drop `object` masks with `binaryMaskIoU > 0.6` against any `person` or `text` mask, deduplicate within each category (`binaryMaskIoU > 0.65`), sort left-to-right within each category, and return `[...people, ...objects, ...texts]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/fal/sam3-post.test.ts`
Expected: PASS (3 tests passing).

- [ ] **Step 5: Commit**

```bash
git add src/service/fal/rle.ts src/service/fal/sam3-post.ts src/service/fal/sam3-post.test.ts
git commit -m "feat(sam3): add multi-category person, text, and object RLE segmentation for posts"
```

---

### Task 3: Post Generation & SAM Element Regeneration Pipeline + Server Actions + Task List Wiring

**Files:**
- Create: `src/service/post/pipeline.ts`
- Modify: `src/service/post/create-post.ts`
- Modify: `src/presentation/actions/posts.ts`
- Modify: `src/service/generation/job-registry.ts`
- Modify: `src/service/generation/task-senders.ts`
- Modify: `src/service/generation/task-list.ts`
- Modify: `src/service/generation/task-list.test.ts`
- Modify: `src/service/post/post-pipeline.test.ts`

**Interfaces:**
- Produces in `src/service/post/pipeline.ts`:
  - `CreatePostJobInput = { prompt: string; aspectRatio?: PostAspectRatio; styleId?: string; characterIds?: string[]; productIds?: string[]; referenceImageUrl?: string; sourceImageUrl?: string }`
  - `EditPostElementInput = { postId: string; elementId: string; editMode: PostElementEditMode; instruction?: string; characterId?: string; characterLookUrl?: string; productId?: string; referenceImageUrl?: string }`
  - `createPostJob(input: CreatePostJobInput): Promise<{ ok: true; post: PublicPost } | { ok: false; error: string }>`
  - `editPostElementJob(input: EditPostElementInput): Promise<{ ok: true; post: PublicPost } | { ok: false; error: string }>`
  - `redetectPostElements(postId: string): Promise<{ ok: true; post: PublicPost } | { ok: false; error: string }>`
  - `selectPostRevision(input: { postId: string; revisionId: string }): Promise<{ ok: true; post: PublicPost } | { ok: false; error: string }>`
  - `deletePostJob(postId: string): Promise<{ ok: true } | { ok: false; error: string }>`
  - `listOwnedPosts(clerkUserId: string, limit?: number): Promise<PublicPost[]>`
  - `loadOwnedPost(postId: string, clerkUserId: string): Promise<PublicPost | null>`
- Produces in `src/presentation/actions/posts.ts`:
  - `createPostJobAction`, `editPostElementJobAction`, `redetectPostElementsAction`, `selectPostRevisionAction`, `deletePostJobAction`, `pollPostJobStatusAction`

- [ ] **Step 1: Add unit tests for revision selection, validation, and task-list integration in `src/service/post/post-pipeline.test.ts` and `src/service/generation/task-list.test.ts`**

```ts
// Add to src/service/post/post-pipeline.test.ts:
import { applyRevisionSelection, validateEditPostElementInput } from "@/service/post/pipeline";

test("validateEditPostElementInput rejects missing donor on swap_character and empty text on text change", () => {
  const personEl = {
    id: "person-1",
    category: "person" as const,
    categoryIndex: 1,
    label: "Person #1",
    rle: "0 10",
    width: 10,
    height: 10,
    score: 0.9,
    box: { x: 0.1, y: 0.1, width: 0.3, height: 0.8 },
    anchorPoint: { x: 0.25, y: 0.5 },
  };
  const textEl = { ...personEl, id: "text-1", category: "text" as const, label: "Text #1" };

  assert.equal(
    validateEditPostElementInput({ element: personEl, editMode: "swap_character" }).ok,
    false,
  );
  assert.equal(
    validateEditPostElementInput({ element: textEl, editMode: "change", instruction: "   " }).ok,
    false,
  );
  assert.equal(
    validateEditPostElementInput({ element: textEl, editMode: "change", instruction: "NEW SALE" }).ok,
    true,
  );
});

test("applyRevisionSelection restores target revision imageUrl and detectedElements", () => {
  const rev1Elements = [
    {
      id: "person-1",
      category: "person" as const,
      categoryIndex: 1,
      label: "Person #1",
      rle: "0 10",
      width: 10,
      height: 10,
      score: 0.95,
      box: { x: 0.1, y: 0.1, width: 0.3, height: 0.8 },
      anchorPoint: { x: 0.2, y: 0.5 },
    },
  ];
  const updated = applyRevisionSelection(
    [
      {
        revisionId: "rev-1",
        imageUrl: "https://blob.example/v1.webp",
        prompt: "v1",
        detectedElements: rev1Elements,
        createdAt: "2026-11-04T10:00:00.000Z",
      },
      {
        revisionId: "rev-2",
        imageUrl: "https://blob.example/v2.webp",
        prompt: "v2",
        detectedElements: [],
        createdAt: "2026-11-04T10:05:00.000Z",
      },
    ],
    "rev-1",
  );
  assert.ok(updated);
  assert.equal(updated.currentImageUrl, "https://blob.example/v1.webp");
  assert.equal(updated.detectedElements.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/post/post-pipeline.test.ts`
Expected: FAIL with `Cannot find module '@/service/post/pipeline'`.

- [ ] **Step 3: Implement `src/service/post/pipeline.ts`, update `src/service/post/create-post.ts`, `src/presentation/actions/posts.ts`, and update `job-registry.ts` / `task-senders.ts` / `task-list.ts`**

- Implement `src/service/post/pipeline.ts`:
  - `createPostJob`:
    - When `sourceImageUrl` is provided without a generation prompt (or upload-only mode), download the image, inspect metadata with `sharp`, persist WebP to Vercel Blob, run `detectPostElementsWithFalSam3`, and store a `completed` `Post` with `revisions: [rev1]` at `0` credit cost.
    - Otherwise, validate `prompt`, check `assertCanSpendCredits(user, FRAME_COST)`, resolve `cast` via `resolveCharacterDonorForSwap` (`src/service/jutsu/pipeline.ts`) and `products` via `productsCollection()`, consume `FRAME_COST` (`4` credits), call `upsampleJutsuFramePrompt` + `submitOpenRouterImage({ model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL, prompt, aspectRatio, resolution: "2k", referenceImageUrls })`, persist the WebP buffer via `persistBuffer`, run `detectPostElementsWithFalSam3`, and save the `completed` `Post` document with Revision #1 (`refundCredits` on error).
  - `editPostElementJob`:
    - Load owned `Post`, locate `elementId` in `post.detectedElements`, validate with `validateEditPostElementInput`, resolve optional donor Character (`resolveCharacterDonorForSwap`) or Product (`productsCollection`) or `referenceImageUrl`, consume `FRAME_COST` (`4` credits), build prompt via `buildPostElementEditPrompt`, run `upsampleJutsuFramePrompt` with attached buffers, submit to `OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL` (`2K`), persist new WebP buffer, run `detectPostElementsWithFalSam3` on the new buffer, and append a new `PostRevision` (`rev-${post.revisions.length + 1}`) while updating `currentImageUrl` and `detectedElements` (`refundCredits` on error).
  - `redetectPostElements`: Fetch `post.currentImageUrl`, scale to max edge `768px` JPEG with `sharp`, run `detectPostElementsWithFalSam3`, and update `detectedElements` on both the post and its active revision.
  - `selectPostRevision`: Use `applyRevisionSelection(post.revisions, revisionId)` to update `currentImageUrl` and `detectedElements` on the `Post` document.
  - `deletePostJob`: Delete owned `Post` document from `postsCollection()`.
- Re-export `listOwnedPosts`, `loadOwnedPost`, `toPublicPost`, and `postHeadline` (aliasing `postTaskTitle`) from `src/service/post/create-post.ts` so existing callers stay clean.
- Update `src/service/generation/job-registry.ts`, `src/service/generation/task-senders.ts`, and `src/service/generation/task-list.ts` so `postPreview` no longer calls deleted `send-preview.ts` / `sync-preview.ts`, and `task-list.ts` surfaces `postTask(post)` directly from `postsCollection()` (just like `scroSwapTask` and `teleportTask`).

- [ ] **Step 4: Run unit tests to verify they pass**

Run: `npx tsx --test src/service/post/post-pipeline.test.ts src/service/generation/task-list.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/post/ src/presentation/actions/posts.ts src/service/generation/
git commit -m "feat(post): implement Seedream 5.0 Pro post creation and SAM element regeneration pipeline"
```

---

### Task 4: `<PostElementRleOverlay>`, `<PostStudio>`, `<PostHistoryDialog>`, and `/app/posts` Routes

**Files:**
- Create: `src/presentation/components/app/posts/post-element-rle-mapper.tsx`
- Create: `src/presentation/components/app/posts/post-history-dialog.tsx`
- Create: `src/presentation/components/app/posts/post-studio.tsx`
- Modify: `src/app/app/posts/page.tsx`
- Modify: `src/app/app/posts/[id]/page.tsx`
- Modify: `src/util/i18n/messages/workspace/post.en.ts`
- Modify: `src/util/i18n/messages/workspace/post.zh-Hant.ts`
- Modify: `pipeline-models.md`
- Delete: `src/presentation/components/app/posts/create-post-dialog.tsx`, `src/presentation/components/app/posts/post-card.tsx`, `src/presentation/components/app/posts/post-list.tsx`, `src/presentation/components/app/posts/post-canvas.tsx`, `src/presentation/components/app/posts/post-editor.tsx`

**Interfaces:**
- Consumes:
  - `PublicPost`, `DetectedPostElement`, `PostAspectRatio`, `PostElementCategory`, `PostElementEditMode` from `@/model/post`
  - `createPostJobAction`, `editPostElementJobAction`, `redetectPostElementsAction`, `selectPostRevisionAction`, `deletePostJobAction`, `pollPostJobStatusAction` from `@/presentation/actions/posts`
  - `DirectorDockStage`, `DirectorDockHero`, `DirectorDockPanel`, `DirectorDockComposer`, `DirectorDockCastGroup`, `DirectorDockStepperCell`, `DirectorDockPill`, `DirectorDockQuickTile` from `@/presentation/components/app/director-dock`
- Produces:
  - `PostElementRleOverlay` and `PostElementTabsBar` in `src/presentation/components/app/posts/post-element-rle-mapper.tsx`
  - `PostHistoryDialog` in `src/presentation/components/app/posts/post-history-dialog.tsx`
  - `PostStudio` in `src/presentation/components/app/posts/post-studio.tsx`

- [ ] **Step 1: Build `src/presentation/components/app/posts/post-element-rle-mapper.tsx`**

- Reuse `decodeClientSparseRle` from `@/presentation/components/app/jutsu/jutsu-person-rle-mapper` to decode each `DetectedPostElement.rle` onto an HTML5 `<canvas>` overlay matching the image's aspect ratio.
- Color-code masks by `element.category`:
  - `person`: `#d4ff33` (`[212, 255, 51]`, lime badge)
  - `object`: `#38bdf8` (`[56, 189, 248]`, sky-400 badge)
  - `text`: `#fbbf24` (`[251, 191, 36]`, amber-400 badge)
- Clicking any foreground pixel in the `<canvas>` or any floating badge selects `element.id` (`onSelectElement(element.id)`).
- Render `PostElementTabsBar` below the canvas with category filter pills (`all` | `person` | `object` | `text`), selectable element chips, and a `↻ 重新偵測元素 / Redetect Elements` button (`onRedetect`).

- [ ] **Step 2: Build `src/presentation/components/app/posts/post-history-dialog.tsx` and `src/presentation/components/app/posts/post-studio.tsx`**

- `PostHistoryDialog`: Modal showing the user's `PublicPost[]` cards (thumbnail, prompt summary, revision badge `V${post.revisions.length}`, aspect ratio badge, open button, download button, delete button).
- `PostStudio`:
  - Uses `<DirectorDockStage>` with top-right `歷史紀錄 (${posts.length})` button.
  - Left floating mode rail switches between `create` (`✨ 生成貼文 / Create`) and `edit` (`🎯 SAM 修改 / SAM Edit`).
  - **Create Mode**:
    - `<DirectorDockPanel>` with Cast selector (`CharacterSelectDialog`), Product selector, Style selector (`StyleSelectDialog`), and Aspect Ratio stepper (`9:16` / `1:1` / `16:9` / `2:3`).
    - `<DirectorDockComposer>` with prompt textarea, `+` upload existing post image (`BrandUploadButton` → `sourceImageUrl`), Reference Image quick tile, and Lime `生成 (✦ 4)` button calling `createPostJobAction`.
  - **SAM Edit Mode** (automatically focused when a post is created or selected):
    - Interactive preview stage showing `activePost.currentImageUrl` + `<PostElementRleOverlay>` + `<PostElementTabsBar>` + revision strip (`V1`, `V2`, ... calling `selectPostRevisionAction`).
    - Context-sensitive edit controls based on `selectedElement.category`:
      - `person`: Mode pills (`替換角色 Swap Character` | `指令修改 Modify` | `移除 Remove`) + Scro Character & 9:16 Outfit picker (or custom photo upload) when `swap_character` is active.
      - `object`: Mode pills (`替換產品 Replace Product` | `指令修改 Modify` | `移除 Remove`) + Product picker / reference image upload.
      - `text`: Mode pills (`修改文字 Edit Text` | `移除文字 Remove Text`) + new text input in composer textarea.
    - Clicking `生成修改 (✦ 4)` invokes `editPostElementJobAction`, updates `activePost` with the new revision and freshly segmented RLE masks, and notifies the task banner (`notifyTasksChanged()`).
- Delete the legacy SVG poster components (`create-post-dialog.tsx`, `post-card.tsx`, `post-list.tsx`, `post-canvas.tsx`, `post-editor.tsx`).

- [ ] **Step 3: Wire `/app/posts/page.tsx`, `/app/posts/[id]/page.tsx`, i18n messages, and `pipeline-models.md`**

- Update `src/app/app/posts/page.tsx` to load `listOwnedPosts(user.clerkUserId)` and `loadStudioPickers(user)` and render `<PostStudio initialPosts={posts} styles={pickers.styles} characters={pickers.characters} products={pickers.products} initialPostId={searchParams?.id} />`.
- Update `src/app/app/posts/[id]/page.tsx` to redirect to `/app/posts?id=${id}`.
- Update `src/util/i18n/messages/workspace/post.en.ts`, `src/util/i18n/messages/workspace/post.zh-Hant.ts`, and `pipeline-models.md`.

- [ ] **Step 4: Run Typecheck, ESLint, and Unit Tests**

Run:
- `npx tsc --noEmit`
- `npx eslint src/model/post.ts src/service/fal/ src/service/post/ src/presentation/actions/posts.ts src/presentation/components/app/posts/ src/app/app/posts/`
- `npx tsx --test src/service/fal/sam3-post.test.ts src/service/post/post-pipeline.test.ts src/service/generation/task-list.test.ts`
Expected: Zero TypeScript errors, zero ESLint errors, and all unit tests passing.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/app/posts/ src/presentation/components/app/posts/ src/util/i18n/messages/workspace/ pipeline-models.md
git commit -m "feat(post): build SAM Post Studio with Director Dock UI and RLE element editor"
```
