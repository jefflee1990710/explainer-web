# Post SAM Studio: Seedream 5.0 Pro Post Generation & SAM 3 Element Editing Design

**Date:** 2026-11-04  
**Status:** Draft — Pending User Approval

---

## 1. Intent & Why

Previously, `/app/posts` (`POSTS_FEATURE_ENABLED = false`) used 16 static SVG layout blueprints (`layout-01` .. `layout-16`) where the editor only moved SVG rectangles and text boxes without modifying the AI-generated image pixels.

The new **Post Studio** replaces the legacy SVG template system altogether and follows the exact workflow and `<DirectorDock>` architecture of **Scro Swap (`JutsuStudio`)**, **Teleport (`TeleportStudio`)**, and **ObjectJutsu (`object_swap`)**:
1. **Direct Image Generation via Seedream 5.0 Pro**: Users describe a social post/poster (or upload an existing image), optionally attach their Scro Characters (full-body looks), Products, Visual Style, and composition reference image, and generate a `2K` post image directly via `bytedance-seed/seedream-5-0-pro`.
2. **SAM 3 Multi-Category Separation (`Text`, `People`, `Object`)**: Using **Approach A**, a lightweight VLM pass (`OPENROUTER_JUTSU_VLM_MODEL`) inventories the distinct foreground objects in the post while `fal-ai/sam-3/image-rle` segments **People (`person`)**, **Text (`text`)**, and **Objects (`object`)** into pixel-accurate sparse RLE masks.
3. **Interactive Select & Regenerate (ObjectJutsu-style)**: Users click any segmented Person, Object, or Text silhouette directly on the post canvas (or via the category pill bar below it) and run **Generate** again to modify, swap, or remove that specific element while preserving the rest of the post image. Each edit appends to the post's revision history so users can chain multiple edits or revert to any prior revision.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Remove all legacy 16-layout SVG poster code (`post-layers.ts`, `layouts.ts`, `designer.ts`, `save-layers.ts`, `layer-edits.ts`, `post-canvas.tsx`, `post-editor.tsx`, `create-post-dialog.tsx`, `post-list.tsx`, `post-card.tsx`).
- Enable `/app/posts` in the main left navigation (`POSTS_FEATURE_ENABLED = true`), redirecting `/app/posts/[id]` to `/app/posts?id=[id]` so the entire workflow lives in the unified `<DirectorDock>` studio with a top-right `歷史紀錄` (History) dialog.
- Generate `2K` posts with OpenRouter `bytedance-seed/seedream-5-0-pro` supporting aspect ratios `9:16`, `1:1`, `16:9`, and `2:3`, plus optional Scro Character donors, Product donors, Style look, and reference image.
- Automatically segment generated (or uploaded) post images into `person`, `text`, and `object` RLE masks using VLM object inventory + `fal-ai/sam-3/image-rle`.
- Render a color-coded interactive RLE silhouette overlay (`PostElementRleOverlay`) and element tabs (`PostElementTabsBar`) where clicking an element opens context-sensitive edit controls:
  - **Person (`person`)**: Swap with a Scro Character + 9:16 Outfit preset/version or custom photo (`character_swap`), modify appearance/pose via prompt (`change`), or remove (`remove`).
  - **Object (`object`)**: Replace with a Scro Product, uploaded reference image, or text prompt (`change`), or seamlessly remove (`remove`).
  - **Text (`text`)**: Rewrite text content in-place (`change`) while matching the poster's typography and layout, or remove text (`remove`).
- Store a revision history (`revisions[]`) on each `Post` document so every regeneration creates a new revision and re-runs SAM 3 element detection on the new image.

### Non-Goals
- Video or animated GIF generation inside `/app/posts` (Post Studio is strictly for static high-resolution `2K` social posts/posters; video swaps remain in `/app/scroswap` and `/app/teleport`).
- Manual vector font rendering or SVG shape layer dragging.
- Modifying ComfyUI video workflows (`openjutsu-graph.ts`).

### Anti-Goals
- Never store raw `data:image/...` base64 strings in MongoDB `Post` documents; all generated and uploaded images must be persisted to Vercel Blob (`persistBuffer`).
- Never make live paid API calls (`OpenRouter`, `fal.ai`) in unit tests; all unit tests must inject mocked `fetch`.

---

## 3. Constraints

- **Billing & Credits**: Creating a new post or running a SAM element edit charges `FRAME_COST` (`4` credits) via `assertCanSpendCredits` + `consumeCredits` and refunds automatically via `refundCredits` if image generation fails. SAM 3 segmentation (`detectPostElementsAction`) does not charge extra credits.
- **Seedream 5.0 Pro Reference & Aspect Ratio Rules**:
  - `submitOpenRouterImage` uses `OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL` (`bytedance-seed/seedream-5-0-pro`) at `resolution: "2k"`.
  - When `aspectRatio` is `"2:3"`, map or pass `"2:3"` (or crop/fit cleanly with `sharp` if `AspectRatio` helper requires `"9:16" | "16:9" | "1:1"`; we will support `"9:16" | "1:1" | "16:9" | "2:3"` in Post Studio).
- **Graceful Degradation without `FAL_KEY`**: When `hasFalKey()` is `false`, `detectPostElementsWithSam3` returns `[]` without throwing, and the UI allows whole-post or prompt-based editing without RLE masks.
- **Documentation Sync**: Update `pipeline-models.md` to reflect the new Seedream 5.0 Pro + VLM + `fal-ai/sam-3/image-rle` Post Studio pipeline.

---

## 4. Approaches Considered

### Approach A (Selected): VLM Scene Inventory + Parallel Category SAM 3 RLE + Spatial/Visual Prompt Upsampling
1. **Segmentation**:
   - Run a fast multimodal VLM call (`OPENROUTER_JUTSU_VLM_MODEL` = `qwen/qwen2.5-vl-72b-instruct`) on a `768px` JPEG thumbnail of the post to list up to 4 distinct foreground objects (`[{ prompt: "coffee cup", labelZh: "咖啡杯", labelEn: "Coffee Cup" }, ...]`) and whether visible typography/text exists.
   - In parallel, call `fal-ai/sam-3/image-rle` for:
     - `"person"` (`max_masks: 6`)
     - `"text, headline, title, logo"` (`max_masks: 6`)
     - Each VLM-discovered foreground object prompt (`max_masks: 2` per object, or fallback `"foreground object, product, prop"` if VLM returns none).
   - Deduplicate overlapping RLE masks within the same category (IoU `> 0.65`) and sort left-to-right / top-to-bottom into `DetectedPostElement[]`.
2. **Element Modification (Regenerate)**:
   - Build a structured edit instruction describing the selected element's category (`person` / `object` / `text`), its human-readable label, its normalized bounding box zone (`box`), and the requested action (`swap_character`, `replace_product`, `change`, `remove`).
   - Generate a visual crop/highlight guide buffer (or attach the donor Character/Product image + current post image in deterministic ordinal order) and run `upsampleJutsuFramePrompt` (`JUTSU_PROMPT_UPSAMPLER_SYSTEM`) before calling `submitOpenRouterImage` (`seedream-5-0-pro`, `2K`).
- **Why selected**: Provides specific, meaningful labels for objects (e.g., `📦 物件 #1 · 香水瓶` instead of generic `物件 #1`), reliably separates text, people, and props, and reuses the battle-tested OpenRouter + fal.ai cloud stack from Scro Swap and ObjectJutsu.

### Approach B: Fixed 3-Prompt SAM 3 Only (`"person"`, `"text"`, `"object"`)
- Calls `fal-ai/sam-3/image-rle` with three static prompts without VLM object discovery.
- **Why rejected**: Generic `"object"` prompts frequently miss individual props or merge adjacent items, and cannot label what each detected object actually is.

### Approach C: Approach A + Click-to-Segment Point Prompts + Sharp Mask Feather Compositing
- Adds interactive `(x, y)` point-click SAM segmentation and post-generation pixel compositing outside the dilated RLE mask.
- **Why deferred**: Can be layered on top of Approach A later if needed without changing the core data model.

---

## 5. Architecture & Detailed Design

### 5.1 Data Model (`src/model/post.ts`)

Replace the legacy SVG layer schema in `src/model/post.ts` (and delete `src/model/post-layers.ts`) with the SAM Post Studio model stored in the existing `posts` MongoDB collection (`postsCollection()` in `src/dao/posts.ts`):

```ts
import { ObjectId } from "mongodb";

export const POST_ASPECT_RATIOS = ["9:16", "1:1", "16:9", "2:3"] as const;
export type PostAspectRatio = (typeof POST_ASPECT_RATIOS)[number];

export const POST_ELEMENT_CATEGORIES = ["person", "object", "text"] as const;
export type PostElementCategory = (typeof POST_ELEMENT_CATEGORIES)[number];

export const POST_ELEMENT_EDIT_MODES = [
  "swap_character",
  "replace_product",
  "change",
  "remove",
] as const;
export type PostElementEditMode = (typeof POST_ELEMENT_EDIT_MODES)[number];

export type DetectedPostElement = {
  id: string; // e.g. "person-1", "object-1", "text-1"
  category: PostElementCategory;
  categoryIndex: number; // 1-based index within category
  label: string; // e.g. "Person #1", "Coffee Cup", "Headline Text"
  labelZh?: string; // e.g. "人物 #1", "咖啡杯", "文字 #1"
  rle: string; // Sparse RLE "(flatIndex, runLength) ..."
  width: number;
  height: number;
  score: number;
  box: { x: number; y: number; width: number; height: number }; // Normalized [0..1]
  anchorPoint: { x: number; y: number }; // Normalized [0..1]
};

export type PostRevision = {
  revisionId: string;
  imageUrl: string;
  prompt: string;
  editSummary?: string;
  targetElementId?: string;
  targetCategory?: PostElementCategory;
  editMode?: PostElementEditMode;
  detectedElements?: DetectedPostElement[];
  createdAt: string;
};

export type PostJobStatus = "rendering" | "completed" | "failed";

export type Post = {
  _id: ObjectId;
  userId?: ObjectId;
  clerkUserId: string;
  status: PostJobStatus;
  prompt: string;
  aspectRatio: PostAspectRatio;
  styleId?: string;
  cast?: Array<{
    characterId: ObjectId;
    name: string;
    lookUrl: string;
    outfitSpec?: string;
  }>;
  products?: Array<{
    productId: ObjectId;
    name: string;
    blueprintUrl: string;
  }>;
  referenceImageUrl?: string;
  currentImageUrl?: string;
  detectedElements?: DetectedPostElement[];
  revisions: PostRevision[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicPost = {
  id: string;
  status: PostJobStatus;
  prompt: string;
  aspectRatio: PostAspectRatio;
  styleId?: string;
  cast?: Array<{
    characterId: string;
    name: string;
    lookUrl: string;
    outfitSpec?: string;
  }>;
  products?: Array<{
    productId: string;
    name: string;
    blueprintUrl: string;
  }>;
  referenceImageUrl?: string;
  currentImageUrl?: string;
  detectedElements: DetectedPostElement[];
  revisions: PostRevision[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};
```

> **Backward Compatibility for Legacy Documents in `posts`:**  
> `toPublicPost(doc)` safely normalizes any pre-existing legacy `Post` document in MongoDB (mapping legacy `instruction` → `prompt`, `previewUrl || thumbnailUrl` → `currentImageUrl`, `previewStatus === "ready" ? "completed" : previewStatus === "generating" ? "rendering" : "failed"` → `status`, and defaulting `revisions: []`, `detectedElements: []`, `aspectRatio: "2:3"`).

---

### 5.2 SAM 3 Multi-Category Segmentation (`src/service/fal/sam3-post.ts`)

Create `src/service/fal/sam3-post.ts` building on `src/service/fal/sam3-image.ts` and `src/service/fal/rle.ts`:

1. **VLM Foreground Object Inventory (`discoverPostObjectsWithVlm`)**:
   - Sends the resized post image (`maxEdge: 768`, JPEG) to OpenRouter VLM (`OPENROUTER_JUTSU_VLM_MODEL`).
   - System prompt asks for a compact JSON object:
     ```json
     {
       "objects": [
         { "prompt": "perfume bottle", "labelEn": "Perfume Bottle", "labelZh": "香水瓶" }
       ],
       "hasText": true
     }
     ```
   - Caps `objects` at 4 distinct non-person, non-text foreground items. If VLM fails or times out, falls back to `[{ prompt: "foreground object, product, item", labelEn: "Object", labelZh: "物件" }]` and `hasText: true`.

2. **Parallel `fal-ai/sam-3/image-rle` Segmentation (`detectPostElementsWithFalSam3`)**:
   - Uploads the scaled image buffer once via `uploadFalBuffer`.
   - Runs `falQueueSubscribe(FAL_SAM3_IMAGE_RLE_ENDPOINT, ...)` in parallel for:
     - **People**: `prompt: "person"`, `max_masks: 6`, min area ratio `0.005` (`0.5%`).
     - **Text**: `prompt: "text, title, headline, typography, logo"`, `max_masks: 6`, min area ratio `0.002` (`0.2%`, since text lines can be thinner).
     - **Objects**: For each VLM-discovered object item (up to 4), `prompt: item.prompt`, `max_masks: 2`, min area ratio `0.004` (`0.4%`).
   - Decodes each sparse RLE via `decodeFalSparseRle`, computes `normalizedBBoxFromMask` and `computeMaskInteriorAnchorPoint`, and filters out any `object` mask whose IoU with a detected `person` or `text` mask exceeds `0.6` (so a person's body or a headline isn't double-counted as a generic object) or duplicates another `object` mask (`IoU > 0.65`).
   - Sorts elements within each category left-to-right (`box.x + box.width / 2`) and assigns deterministic IDs (`person-1`, `object-1`, `text-1`).

---

### 5.3 Post Generation & Element Edit Pipeline (`src/service/post/pipeline.ts`)

1. **`createPostJob(input)`**:
   - Authenticates user (`requireAppUser()`), validates `prompt` (or uploaded `sourceImageUrl`), and checks credits (`assertCanSpendCredits(user, FRAME_COST)` when generating a new image).
   - If the user uploaded an existing post image (`sourceImageUrl`) without requesting a fresh generation:
     - Persists the image, runs `detectPostElementsWithFalSam3`, and inserts a `completed` `Post` document with Revision #1 (`0` credit charge).
   - Otherwise (AI Generation via Seedream 5.0 Pro):
     - Resolves selected Scro Characters (`resolveCharacterDonorForSwap` for full-body `profileUrl` + `outfitSpec`), Products (`blueprintUrl`), and Style (`loadRenderableStyle`).
     - Consumes `FRAME_COST` (`4` credits), inserts a `rendering` `Post` document, and triggers `runCreatePostJobInBackground(postId)` via `after()` (or runs inline when fast):
       - Builds the initial generation prompt combining `prompt`, character names/outfits, product names, and style look.
       - Upsamples with `upsampleJutsuFramePrompt` when reference images are attached.
       - Calls `submitOpenRouterImage({ model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL, prompt, aspectRatio, resolution: "2k", referenceImageUrls })`.
       - Persists the generated WebP buffer to Vercel Blob.
       - Immediately runs `detectPostElementsWithFalSam3` on the generated image buffer so the RLE masks are ready as soon as the job completes.
       - Updates the `Post` document to `status: "completed"`, sets `currentImageUrl`, `detectedElements`, and appends Revision #1. On error, refunds `FRAME_COST` and sets `status: "failed"`.

2. **`editPostElementJob(input)`**:
   - Input:
     ```ts
     export type EditPostElementInput = {
       postId: string;
       elementId: string; // e.g. "person-1", "object-2", "text-1"
       editMode: PostElementEditMode; // "swap_character" | "replace_product" | "change" | "remove"
       instruction?: string; // New text content, object description, or character modification prompt
       characterId?: string;
       characterLookUrl?: string;
       productId?: string;
       referenceImageUrl?: string;
     };
     ```
   - Looks up the target `DetectedPostElement` in `post.detectedElements` (sorted position, `category`, `label`, `box`).
   - Builds a category-specific edit prompt (`buildPostElementEditPrompt` in `src/service/post/prompts.ts`):
     - **`person` + `swap_character`**: Resolves donor character image & `outfitSpec`, attaches `[donorImageUrl, currentPostImageUrl]`, and instructs Seedream 5.0 Pro to replace the person at `box` (`horizontalZoneLabel` + vertical zone) with the character from image 1 while keeping all other people, objects, text typography, and background in image 2 unchanged.
     - **`object` + `replace_product` / `change`**: Attaches `[currentPostImageUrl, donorImageUrl?]` and instructs Seedream 5.0 Pro to replace or modify the `element.label` at `box` with the specified product/reference/description, matching perspective, contact shadows, and lighting while keeping all text and people untouched.
     - **`text` + `change`**: Attaches `[currentPostImageUrl]` and instructs Seedream 5.0 Pro to replace the text inside `box` (`element.label`) with the exact string `"${instruction}"`, matching the surrounding font family, weight, color, and alignment while keeping the rest of the image identical.
     - **Any category + `remove`**: Instructs Seedream 5.0 Pro to cleanly remove the `element.label` at `box` and inpaint the background seamlessly.
   - Runs `upsampleJutsuFramePrompt` with the attached image buffers, calls `submitOpenRouterImage` (`seedream-5-0-pro`, `2K`), persists the new image, re-runs `detectPostElementsWithFalSam3`, and appends the new `PostRevision` to `post.revisions`.

3. **`selectPostRevision(postId, revisionId)` & `redetectPostElements(postId)`**:
   - Allows switching `currentImageUrl` + `detectedElements` back to any previous revision in `post.revisions` so the user can branch or undo edits at any time.
   - Allows manually re-triggering SAM 3 element detection on the current image.

---

### 5.4 UI Architecture (`src/presentation/components/app/posts/`)

Following `JutsuStudio` (`src/presentation/components/app/jutsu/jutsu-studio.tsx`) and `TeleportStudio` (`src/presentation/components/app/teleport/teleport-studio.tsx`):

1. **`PostStudio` (`src/presentation/components/app/posts/post-studio.tsx`)**:
   - Built on `<DirectorDockStage>`, `<DirectorDockHero>`, `<DirectorDockPanel>`, and `<DirectorDockComposer>`.
   - **Left Floating Mode Rail**:
     - `✨ 生成貼文 (Create Post)`: Initial creation mode (Prompt + Cast + Product + Style + Aspect Ratio).
     - `🎯 SAM 局部修改 (SAM Edit)`: Element selection & regeneration mode (automatically activates once a post image is generated or selected).
   - **Director Panel (`🎬 導演面板`)**:
     - In **Create Mode**:
       1. `角色 (Cast)`: `DirectorDockCastGroup` to pick up to 2 Scro Characters.
       2. `產品 (Product)`: Quick tile to pick a Scro Product.
       3. `風格 (Style)`: Visual style selector tile.
       4. `比例 (Aspect Ratio)`: `9:16` / `1:1` / `16:9` / `2:3` cycle cell.
     - In **SAM Edit Mode** (when an element is selected):
       - Dynamically shows the target picker for the selected element category:
         - Selected `👤 Person`: Character & 9:16 Outfit picker (`替換角色` / `指令修改` / `移除人物`).
         - Selected `📦 Object`: Product picker / reference image upload + edit mode (`替換物件` / `移除物件`).
         - Selected `🔤 Text`: Mode toggle (`修改字句` / `移除文字`).
   - **Main Composer & Interactive SAM Stage**:
     - Displays the active post image with **`PostElementRleOverlay`** painted on top.
     - Color palette by category:
       - `person`: Lime (`#d4ff33`)
       - `object`: Sky Blue (`#38bdf8`)
       - `text`: Amber (`#fbbf24`)
     - Below the canvas: **`PostElementTabsBar`** with category filter pills (`全部` / `👤 人物` / `📦 物件` / `🔤 文字`), element chips (`#1 人物`, `#1 香水瓶`, `#1 標題文字`), and a `↻ 重新偵測元素` button.
     - Below or beside the canvas: **Revision Strip (`版本紀錄 V1 · V2 · V3`)** so the user can click any version thumbnail to compare or revert before running the next edit.
     - **Prompt Textarea & Generate Button (`生成 ✦ 4`)**:
       - In Create Mode: enters the post creation prompt and triggers `createPostJobAction`.
       - In SAM Edit Mode: enters the modification instruction (or new text string) for the selected RLE element and triggers `editPostElementJobAction`.

2. **`PostElementRleOverlay` & `PostElementTabsBar` (`src/presentation/components/app/posts/post-element-rle-mapper.tsx`)**:
   - Generalizes `JutsuPersonRleOverlay` (`decodeClientSparseRle`) to support `DetectedPostElement[]` across `person`, `object`, and `text` categories with category icons, hover/active glow, and click hit-testing on the RLE mask pixels.

3. **`PostHistoryDialog` (`src/presentation/components/app/posts/post-history-dialog.tsx`)**:
   - Top-right `歷史紀錄` button opens the history dialog showing all user posts, status badges, revision counts, download button, and delete action.

---

### 5.5 Task List & Cleanup Integration

- **`src/service/generation/task-list.ts`**:
  - Replace the legacy `postPreview` job lookup with `postTask(post)` (just like `scroSwapTask` and `teleportTask`), surfacing `rendering` / `completed` / `failed` posts in the top-right global Task Queue banner.
- **Remove Legacy `postPreview` Queue Plumbing**:
  - Remove `sendPostPreview` (`src/service/post/send-preview.ts`), `syncPostPreviewJob` (`src/service/post/sync-preview.ts`), and legacy SVG layer files (`src/service/post/layouts.ts`, `src/service/post/designer.ts`, `src/service/post/save-layers.ts`, `src/service/post/layer-edits.ts`, `src/service/post/copy.ts`, `src/model/post-layers.ts`).

---

## 6. Verification & Testing Plan

All tests run via `npx tsx --test` with mocked `fetch` (zero live API calls):
1. **`src/service/fal/sam3-post.test.ts`**:
   - Tests `discoverPostObjectsWithVlm` JSON parsing and fallback on VLM failure.
   - Tests `detectPostElementsWithFalSam3` multi-category (`person`, `text`, `object`) RLE decoding, cross-category IoU deduplication, and left-to-right sorting.
2. **`src/service/post/post-pipeline.test.ts`**:
   - Tests `buildPostCreatePrompt` and `buildPostElementEditPrompt` across `person` (`swap_character`, `change`, `remove`), `object` (`replace_product`, `change`, `remove`), and `text` (`change`, `remove`).
   - Tests `toPublicPost` backward compatibility with legacy `Post` documents.
3. **Static Verification**:
   - `npx tsc --noEmit`
   - `npx eslint src/`

---

## 7. What Is Left to the Builder

- Exact showcase thumbnail URLs used in `<DirectorDockHero>` on `/app/posts` (using existing local assets in `/public/`).
- Minor UI spacing and i18n message keys in `src/util/i18n/messages/workspace/post.en.ts` and `post.zh-Hant.ts`.
