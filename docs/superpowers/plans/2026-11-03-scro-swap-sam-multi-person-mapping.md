# Scro Swap SAM 3 RLE Multi-Person Layout & Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically detect and render pixel-accurate SAM 3 RLE person silhouettes on the source video's opening frame in Scro Swap, allow the user to map each detected person to a target Scro Character + 9:16 Outfit (or "Keep Original"), and execute a single-pass multi-person swap via unioned SAM 3 RLE grey mannequins, `seedream-5-0-pro` keyframes, and MiniMax H3 `ref2va`.

**Architecture:** We add `src/service/fal/sam3-image.ts` (`fal-ai/sam-3/image-rle`) plus RLE interior-anchor & union utilities in `src/service/fal/rle.ts`, exposed via a new Server Action `detectJutsuPeopleAction`. On the frontend, a new `'use client'` component `src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx` captures the debounced frame at `sectionStart`, draws colored RLE silhouette overlays on `<canvas>`, and renders Active Person Tabs that share the existing Character + 9:16 Outfit Picker. On submit, `startScroSwapJob` and `runScroSwapJobInBackground` track each mapped person via `fal-ai/sam-3/video-rle` (`point_prompts` with positive target anchor and negative non-target anchors), union the mapped people's per-frame RLE masks into one grey mannequin video, and condition both `seedream-5-0-pro` and MiniMax H3 `ref2va` on the left-to-right ordered donor images.

**Tech Stack:** Next.js 16 App Router (Webpack), TypeScript, React 19 (`'use client'`), `sharp`, fal.ai (`fal-ai/sam-3/image-rle` & `fal-ai/sam-3/video-rle`), OpenRouter (`bytedance-seed/seedream-5-0-pro`, `google/gemini-2.5-flash`), MiniMax Video V2 (`MiniMax-H3`), Node built-in test runner (`npx tsx --test`).

**Spec:** `docs/superpowers/specs/2026-11-03-scro-swap-sam-multi-person-mapping-design.md`

## Global Constraints

- Never make live paid provider calls during unit tests; use pure functions or mock `fetch` (`{ fetch: fakeFetch }`).
- Do not call the Higgsfield API.
- Always create new UI components in a separate file to prevent files from growing too large, and place `"use client"` at the top when hooks are used.
- Always use Server Actions instead of RESTful APIs for internal UI-to-server calls.
- Keep `pipeline-models.md` in sync whenever model/endpoint usage in `src/service/` changes.

---

### Task 1: RLE Interior Anchor, Union Mask Utilities & `fal-ai/sam-3/image-rle` Service

**Files:**
- Modify: `src/service/fal/rle.ts`
- Create: `src/service/fal/sam3-image.ts`
- Modify: `src/service/fal/sam3-video.ts`
- Test: `src/service/fal/fal.test.ts`

**Interfaces:**
- Consumes: `falQueueSubscribe` from `@/service/fal/queue`, `uploadFalBuffer` from `@/service/fal/storage`, `hasFalKey` from `@/service/fal/key`
- Produces:
  - `computeMaskInteriorAnchorPoint(mask: Uint8Array, width: number, height: number): { x: number; y: number } | null` in `src/service/fal/rle.ts`
  - `unionBinaryMasks(masks: readonly Uint8Array[], size: number): Uint8Array` in `src/service/fal/rle.ts`
  - `maskForegroundRatio(mask: Uint8Array): number` in `src/service/fal/rle.ts`
  - `DetectedSourcePerson` and `detectPeopleWithFalSam3ImageRle` in `src/service/fal/sam3-image.ts`
  - `FalSam3PointPrompt` and `pointPrompts?: FalSam3PointPrompt[]` in `src/service/fal/sam3-video.ts`

- [ ] **Step 1: Write the failing tests in `src/service/fal/fal.test.ts`**

Add tests for `computeMaskInteriorAnchorPoint`, `unionBinaryMasks`, `detectPeopleWithFalSam3ImageRle`, and `pointPrompts` forwarding in `segmentVideoWithFalSam3Rle`:

```ts
import {
  computeMaskInteriorAnchorPoint,
  decodeFalSparseRle,
  maskForegroundRatio,
  normalizedBBoxFromMask,
  resizeBinaryMaskNearest,
  unionBinaryMasks,
} from "@/service/fal/rle";
import { detectPeopleWithFalSam3ImageRle } from "@/service/fal/sam3-image";
import {
  resolveFalSam3RleFrames,
  segmentVideoWithFalSam3Rle,
} from "@/service/fal/sam3-video";
```

And append test cases at the bottom of `src/service/fal/fal.test.ts`:

```ts
test("computeMaskInteriorAnchorPoint picks a foreground pixel inside concave masks and unionBinaryMasks merges masks", () => {
  // 10x10 grid with two vertical bars at x=1 and x=8
  const maskA = decodeFalSparseRle("11 1 21 1 31 1", 10, 10);
  const maskB = decodeFalSparseRle("18 1 28 1 38 1", 10, 10);

  const anchorA = computeMaskInteriorAnchorPoint(maskA, 10, 10);
  assert.ok(anchorA);
  // Center pixel of maskA is (1, 2) -> normalized (1.5/10, 2.5/10) = (0.15, 0.25)
  assert.equal(anchorA.x, 0.15);
  assert.equal(anchorA.y, 0.25);

  const merged = unionBinaryMasks([maskA, maskB], 100);
  assert.equal(merged[21], 1);
  assert.equal(merged[28], 1);
  assert.equal(merged[25], 0);
  assert.equal(maskForegroundRatio(merged), 6 / 100);
});

test("detectPeopleWithFalSam3ImageRle decodes multi-person RLE masks, filters noise, and sorts left-to-right", async () => {
  process.env.FAL_KEY = "fal_sk_test:secret";
  // 20x10 frame (200 pixels). Person on right (cols 14..16, rows 2..6) is index 0; person on left (cols 2..4, rows 2..6) is index 1.
  const rightPersonRle = "54 3 74 3 94 3 114 3 134 3";
  const leftPersonRle = "42 3 62 3 82 3 102 3 122 3";
  const tinyNoiseRle = "0 1"; // 1/200 = 0.5% -> below 0.6% threshold

  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/storage/upload/initiate")) {
      return new Response(
        JSON.stringify({
          upload_url: "https://upload.test/put-img",
          file_url: "https://cdn.test/frame0.jpg",
        }),
        { status: 200 },
      );
    }
    if (url === "https://upload.test/put-img") {
      return new Response(null, { status: 200 });
    }
    if (url === "https://queue.fal.run/fal-ai/sam-3/image-rle") {
      return new Response(
        JSON.stringify({
          request_id: "img-req-1",
          status_url: "https://queue.fal.run/status/img-req-1",
          response_url: "https://queue.fal.run/result/img-req-1",
        }),
        { status: 200 },
      );
    }
    if (url === "https://queue.fal.run/status/img-req-1") {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
    }
    if (url === "https://queue.fal.run/result/img-req-1") {
      return new Response(
        JSON.stringify({
          rle: [rightPersonRle, leftPersonRle, tinyNoiseRle],
          scores: [0.92, 0.95, 0.41],
          metadata: [
            { index: 0, score: 0.92 },
            { index: 1, score: 0.95 },
            { index: 2, score: 0.41 },
          ],
        }),
        { status: 200 },
      );
    }
    return new Response("unexpected", { status: 500 });
  };

  const people = await detectPeopleWithFalSam3ImageRle(
    {
      imageBuffer: Buffer.from("fake-jpeg"),
      width: 20,
      height: 10,
    },
    { fetch: fakeFetch, pollIntervalMs: 1 },
  );

  assert.equal(people.length, 2);
  // Left person comes first (personIndex = 1, original objectId = 1)
  assert.equal(people[0]!.personIndex, 1);
  assert.equal(people[0]!.objectId, 1);
  assert.equal(people[0]!.label, "Person #1");
  assert.ok(people[0]!.box.x < people[1]!.box.x);
  // Right person comes second (personIndex = 2, original objectId = 0)
  assert.equal(people[1]!.personIndex, 2);
  assert.equal(people[1]!.objectId, 0);
  assert.equal(people[1]!.label, "Person #2");
});

test("segmentVideoWithFalSam3Rle forwards pointPrompts with object_id and foreground/background labels", async () => {
  process.env.FAL_KEY = "fal_sk_test:secret";
  let submittedPayload: Record<string, unknown> | null = null;

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/storage/upload/initiate")) {
      return new Response(
        JSON.stringify({
          upload_url: "https://upload.test/put-vid",
          file_url: "https://cdn.test/sec.mp4",
        }),
        { status: 200 },
      );
    }
    if (url === "https://upload.test/put-vid") {
      return new Response(null, { status: 200 });
    }
    if (url === "https://queue.fal.run/fal-ai/sam-3/video-rle") {
      submittedPayload = JSON.parse(String(init?.body || "{}"));
      return new Response(
        JSON.stringify({
          request_id: "vid-req-1",
          status_url: "https://queue.fal.run/status/vid-req-1",
          response_url: "https://queue.fal.run/result/vid-req-1",
        }),
        { status: 200 },
      );
    }
    if (url === "https://queue.fal.run/status/vid-req-1") {
      return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
    }
    if (url === "https://queue.fal.run/result/vid-req-1") {
      return new Response(JSON.stringify({ rle: ["10 5"] }), { status: 200 });
    }
    return new Response("unexpected", { status: 500 });
  };

  await segmentVideoWithFalSam3Rle(
    {
      videoBuffer: Buffer.from("mp4"),
      prompt: "person",
      pointPrompts: [
        { x: 120, y: 240, label: 1, frame_index: 0, object_id: 1 },
        { x: 400, y: 250, label: 0, frame_index: 0, object_id: 1 },
      ],
    },
    { fetch: fakeFetch, pollIntervalMs: 1 },
  );

  assert.deepEqual(submittedPayload?.point_prompts, [
    { x: 120, y: 240, label: 1, frame_index: 0, object_id: 1 },
    { x: 400, y: 250, label: 0, frame_index: 0, object_id: 1 },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/fal/fal.test.ts`
Expected: FAIL with module/export not found (`@/service/fal/sam3-image` / `computeMaskInteriorAnchorPoint`).

- [ ] **Step 3: Implement RLE utilities in `src/service/fal/rle.ts`, `src/service/fal/sam3-image.ts`, and `pointPrompts` in `src/service/fal/sam3-video.ts`**

In `src/service/fal/rle.ts`, append:

```ts
/** Share of pixels in [0..1] that are foreground (`1`). */
export function maskForegroundRatio(mask: Uint8Array): number {
  if (mask.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) count++;
  }
  return count / mask.length;
}

/**
 * Find the foreground pixel strictly inside `mask` that is closest to the mask's centroid,
 * returned as normalized [0..1] coordinates (`(x + 0.5) / width`, `(y + 0.5) / height`).
 */
export function computeMaskInteriorAnchorPoint(
  mask: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number } | null {
  if (width <= 0 || height <= 0 || mask.length < width * height) return null;
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!mask[row + x]) continue;
      sumX += x;
      sumY += y;
      count++;
    }
  }
  if (count === 0) return null;

  const cx = sumX / count;
  const cy = sumY / count;
  let bestX = 0;
  let bestY = 0;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    const dy = y - cy;
    for (let x = 0; x < width; x++) {
      if (!mask[row + x]) continue;
      const dx = x - cx;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestX = x;
        bestY = y;
      }
    }
  }

  return {
    x: Math.round(((bestX + 0.5) / width) * 1000) / 1000,
    y: Math.round(((bestY + 0.5) / height) * 1000) / 1000,
  };
}

/** Bitwise-OR union of binary masks of length `size`. */
export function unionBinaryMasks(
  masks: readonly Uint8Array[],
  size: number,
): Uint8Array {
  const out = new Uint8Array(Math.max(0, size));
  for (const m of masks) {
    const len = Math.min(out.length, m.length);
    for (let i = 0; i < len; i++) {
      if (m[i]) out[i] = 1;
    }
  }
  return out;
}
```

Create `src/service/fal/sam3-image.ts`:

```ts
import { hasFalKey } from "@/service/fal/key";
import { falQueueSubscribe } from "@/service/fal/queue";
import {
  computeMaskInteriorAnchorPoint,
  decodeFalSparseRle,
  maskForegroundRatio,
  normalizedBBoxFromMask,
} from "@/service/fal/rle";
import { uploadFalBuffer } from "@/service/fal/storage";

export const FAL_SAM3_IMAGE_RLE_ENDPOINT = "fal-ai/sam-3/image-rle";

/** Minimum foreground pixel ratio (0.6% of canvas) to keep a detected person mask. */
const MIN_PERSON_MASK_AREA_RATIO = 0.006;

export type DetectedSourcePerson = {
  objectId: number;
  personIndex: number;
  label: string;
  rle: string;
  width: number;
  height: number;
  score: number;
  box: { x: number; y: number; width: number; height: number };
  anchorPoint: { x: number; y: number };
};

type FalSam3ImageRleResult = {
  rle?: string | string[];
  scores?: Array<number | null> | null;
  metadata?: Array<{ index: number; score?: number | null; box?: number[] | null }> | null;
};

type FetchOptions = {
  fetch?: typeof fetch;
  pollIntervalMs?: number;
  maxWaitMs?: number;
};

/**
 * Segment all people in a single frame using `fal-ai/sam-3/image-rle` and return
 * pixel-accurate RLE masks sorted left-to-right (`Person #1`, `Person #2`, ...).
 */
export async function detectPeopleWithFalSam3ImageRle(
  input: {
    imageBuffer: Buffer;
    width: number;
    height: number;
    maxMasks?: number;
  },
  options: FetchOptions = {},
): Promise<DetectedSourcePerson[]> {
  if (!hasFalKey() || input.width <= 0 || input.height <= 0) {
    return [];
  }

  const imageUrl = await uploadFalBuffer(
    {
      bytes: input.imageBuffer,
      fileName: "jutsu-frame0.jpg",
      contentType: "image/jpeg",
    },
    options,
  );

  const result = await falQueueSubscribe<FalSam3ImageRleResult>(
    FAL_SAM3_IMAGE_RLE_ENDPOINT,
    {
      image_url: imageUrl,
      prompt: "person",
      return_multiple_masks: true,
      max_masks: input.maxMasks ?? 6,
      include_scores: true,
      include_boxes: true,
      apply_mask: false,
    },
    options,
  );

  const rawRles = Array.isArray(result.rle)
    ? result.rle
    : typeof result.rle === "string"
      ? [result.rle]
      : [];

  const candidates: Array<Omit<DetectedSourcePerson, "personIndex" | "label">> = [];

  for (let idx = 0; idx < rawRles.length; idx++) {
    const rle = (rawRles[idx] || "").trim();
    if (!rle) continue;
    const mask = decodeFalSparseRle(rle, input.width, input.height);
    if (maskForegroundRatio(mask) < MIN_PERSON_MASK_AREA_RATIO) continue;

    const box = normalizedBBoxFromMask(mask, input.width, input.height);
    const anchorPoint = computeMaskInteriorAnchorPoint(mask, input.width, input.height);
    if (!box || !anchorPoint) continue;

    const metaEntry = result.metadata?.find((m) => m.index === idx) ?? result.metadata?.[idx];
    const objectId = typeof metaEntry?.index === "number" ? metaEntry.index : idx;
    const score =
      typeof metaEntry?.score === "number"
        ? metaEntry.score
        : typeof result.scores?.[idx] === "number"
          ? (result.scores[idx] as number)
          : 1;

    candidates.push({
      objectId,
      rle,
      width: input.width,
      height: input.height,
      score,
      box: {
        x: Math.round(box.x * 1000) / 1000,
        y: Math.round(box.y * 1000) / 1000,
        width: Math.round(box.width * 1000) / 1000,
        height: Math.round(box.height * 1000) / 1000,
      },
      anchorPoint,
    });
  }

  // Sort left-to-right by horizontal center of the person's RLE mask.
  candidates.sort(
    (a, b) => a.box.x + a.box.width / 2 - (b.box.x + b.box.width / 2),
  );

  return candidates.map((item, i) => ({
    ...item,
    personIndex: i + 1,
    label: `Person #${i + 1}`,
  }));
}
```

In `src/service/fal/sam3-video.ts`, add `FalSam3PointPrompt` and pass `point_prompts: input.pointPrompts || []`:

```ts
export type FalSam3PointPrompt = {
  x: number;
  y: number;
  label: 0 | 1;
  frame_index?: number;
  object_id?: number;
};
```

And update `segmentVideoWithFalSam3Rle` input type & payload in `src/service/fal/sam3-video.ts`:

```ts
export async function segmentVideoWithFalSam3Rle(
  input: {
    videoBuffer: Buffer;
    fileName?: string;
    prompt?: string;
    detectionThreshold?: number;
    boxPrompts?: FalSam3BoxPrompt[];
    pointPrompts?: FalSam3PointPrompt[];
  },
  options: FetchOptions & { pollIntervalMs?: number; maxWaitMs?: number } = {},
): Promise<{ rleFrames: string[] }> {
  const videoUrl = await uploadFalBuffer(
    {
      bytes: input.videoBuffer,
      fileName: input.fileName || "sam3-section.mp4",
      contentType: "video/mp4",
    },
    options,
  );

  const prompt = (input.prompt || "person").trim() || "person";
  const result = await falQueueSubscribe<FalSam3VideoRleResult>(
    FAL_SAM3_VIDEO_RLE_ENDPOINT,
    {
      video_url: videoUrl,
      prompt,
      detection_threshold: input.detectionThreshold ?? 0.5,
      point_prompts: input.pointPrompts || [],
      box_prompts: input.boxPrompts || [],
    },
    options,
  );

  const rleFrames = await resolveFalSam3RleFrames(result.rle, options);
  return { rleFrames };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/fal/fal.test.ts`
Expected: PASS (all tests in `fal.test.ts` pass).

- [ ] **Step 5: Commit**

```bash
git add src/service/fal/rle.ts src/service/fal/sam3-image.ts src/service/fal/sam3-video.ts src/service/fal/fal.test.ts
git commit -m "feat(fal): add SAM 3 image-rle multi-person detector and RLE union/anchor helpers"
```

---

### Task 2: `JutsuPersonMapping` Model, Multi-Person Prompts, H3 Multi-Donor & Union Mannequin Pipeline

**Files:**
- Modify: `src/model/jutsu-job.ts`
- Modify: `src/service/jutsu/describer.ts`
- Modify: `src/service/jutsu/minimax-h3-ref2va.ts`
- Modify: `src/service/jutsu/sam-mannequin.ts`
- Modify: `src/service/jutsu/pipeline.ts`
- Modify: `src/presentation/actions/jutsu.ts`
- Modify: `pipeline-models.md`
- Test: `src/service/jutsu/jutsu.test.ts`

**Interfaces:**
- Consumes: `DetectedSourcePerson`, `detectPeopleWithFalSam3ImageRle`, `unionBinaryMasks`, `FalSam3PointPrompt` from Task 1
- Produces:
  - `JutsuPersonMapping` in `src/model/jutsu-job.ts`
  - `buildMultiPersonJutsuEditPrompt` in `src/service/jutsu/describer.ts`
  - Multi-donor support (`identityImageUrls?: string[]`, `personMappings?: JutsuPersonMapping[]`) in `buildMinimaxH3Ref2VaBody` and `buildJutsuRef2VaPrompt`
  - `detectJutsuPeopleInFrame(input: { frameDataUrl: string })` in `src/service/jutsu/pipeline.ts` and `detectJutsuPeopleAction` in `src/presentation/actions/jutsu.ts`

- [ ] **Step 1: Write the failing tests in `src/service/jutsu/jutsu.test.ts`**

Add tests for `buildMultiPersonJutsuEditPrompt` and multi-person `buildMinimaxH3Ref2VaBody` + `buildJutsuRef2VaPrompt` in `src/service/jutsu/jutsu.test.ts`:

```ts
import {
  buildDefaultJutsuEditPrompt,
  buildJutsuObjectSwapPrompt,
  buildMultiPersonJutsuEditPrompt,
} from "@/service/jutsu/describer";
```

And append at the bottom of `src/service/jutsu/jutsu.test.ts`:

```ts
test("buildMultiPersonJutsuEditPrompt and MiniMax H3 ref2va format left-to-right multi-person character mappings while preserving unmapped people", () => {
  const mappings = [
    {
      objectId: 1,
      personIndex: 1,
      anchorPoint: { x: 0.22, y: 0.48 },
      box: { x: 0.1, y: 0.15, width: 0.24, height: 0.75 },
      characterId: "char-scro",
      characterName: "Scro",
      referenceImageUrl: "https://blob.test/scro-standing.png",
      characterOutfitSpec: "Top: Pink crop top; Pants: Blue jeans",
    },
    {
      objectId: 0,
      personIndex: 2,
      anchorPoint: { x: 0.76, y: 0.5 },
      box: { x: 0.62, y: 0.14, width: 0.26, height: 0.78 },
      characterId: "char-alice",
      characterName: "Alice",
      referenceImageUrl: "https://blob.test/alice-standing.png",
      characterOutfitSpec: "Top: Navy tailored blazer",
    },
  ];

  const editPrompt = buildMultiPersonJutsuEditPrompt({
    mappings,
    totalDetectedPeople: 3,
    relightId: "golden_halo",
  });

  // Attached image 1 = Scro, attached image 2 = Alice, attached image 3 = source video frame
  assert.match(editPrompt, /attached image 3/i);
  assert.match(editPrompt, /attached image 1/i);
  assert.match(editPrompt, /attached image 2/i);
  assert.match(editPrompt, /Pink crop top/i);
  assert.match(editPrompt, /Navy tailored blazer/i);
  assert.match(editPrompt, /keep any other unmapped people/i);

  const ref2vaBody = buildMinimaxH3Ref2VaBody({
    prompt: "Multi swap.",
    preparedImageUrl: "https://blob.test/prepared-start.webp",
    identityImageUrls: [
      "https://blob.test/scro-standing.png",
      "https://blob.test/alice-standing.png",
    ],
    mannequinVideoUrl: "https://blob.test/union-mannequin.mp4",
    durationSeconds: 6,
    aspectRatio: "16:9",
  });

  assert.deepEqual(
    ref2vaBody.content.filter((c) => c.type === "image_url"),
    [
      {
        type: "image_url",
        image_url: { url: "https://blob.test/prepared-start.webp" },
        role: "reference_image",
      },
      {
        type: "image_url",
        image_url: { url: "https://blob.test/scro-standing.png" },
        role: "reference_image",
      },
      {
        type: "image_url",
        image_url: { url: "https://blob.test/alice-standing.png" },
        role: "reference_image",
      },
    ],
  );

  const ref2vaPrompt = buildJutsuRef2VaPrompt({
    motionText: "Two people high-five.",
    hasIdentityImage: true,
    personMappings: mappings,
  });
  assert.match(ref2vaPrompt, /Reference image 2/i);
  assert.match(ref2vaPrompt, /Reference image 3/i);
  assert.match(ref2vaPrompt, /Pink crop top/i);
  assert.match(ref2vaPrompt, /Navy tailored blazer/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/jutsu/jutsu.test.ts`
Expected: FAIL with `buildMultiPersonJutsuEditPrompt` not exported.

- [ ] **Step 3: Implement `JutsuPersonMapping`, `buildMultiPersonJutsuEditPrompt`, H3 multi-donor, union mannequin, and `detectJutsuPeopleAction`**

1. In `src/model/jutsu-job.ts`, add `JutsuPersonMapping` and include `personMappings?: JutsuPersonMapping[]` on `JutsuJob`, `PublicJutsuJob`, and `toPublicJutsuJob`:

```ts
export type JutsuPersonMapping = {
  objectId: number;
  personIndex: number;
  anchorPoint: { x: number; y: number };
  box: JutsuPlacementBox;
  characterId?: string;
  characterName?: string;
  referenceImageUrl: string;
  characterOutfitSpec?: string;
};
```

2. In `src/service/jutsu/describer.ts`, add `buildMultiPersonJutsuEditPrompt`:

```ts
import type {
  JutsuMode,
  JutsuObjectEditMode,
  JutsuPersonMapping,
  JutsuPlacementBox,
} from "@/model/jutsu-job";
```

```ts
function horizontalZoneLabel(box: JutsuPlacementBox): string {
  const cx = box.x + box.width / 2;
  if (cx < 0.38) return `on the left (around ${Math.round(cx * 100)}% horizontal position)`;
  if (cx > 0.62) return `on the right (around ${Math.round(cx * 100)}% horizontal position)`;
  return `near the center (around ${Math.round(cx * 100)}% horizontal position)`;
}

/**
 * Build the keyframe edit instruction when 1 or more detected people are mapped to specific
 * character donors. Reference images are attached in order: `[donor_1, ..., donor_K, sourceFrame]`.
 */
export function buildMultiPersonJutsuEditPrompt(input: {
  mappings: readonly JutsuPersonMapping[];
  totalDetectedPeople?: number;
  relightId?: string;
  customLightPrompt?: string;
}): string {
  const sorted = [...input.mappings].sort(
    (a, b) => a.box.x + a.box.width / 2 - (b.box.x + b.box.width / 2),
  );
  if (sorted.length === 0) {
    return buildDefaultJutsuEditPrompt({
      mode: "character_swap",
      relightId: input.relightId,
      customLightPrompt: input.customLightPrompt,
      hasReferenceImage: true,
    });
  }

  const sourceImgIndex = sorted.length + 1;
  const assignments = sorted.map((m, i) => {
    const donorImgIndex = i + 1;
    const zone = horizontalZoneLabel(m.box);
    const outfitLock = m.characterOutfitSpec?.trim()
      ? ` wearing the exact full-body outfit from attached image ${donorImgIndex} (${m.characterOutfitSpec.trim()})`
      : ` wearing the exact full-body outfit and shoes from attached image ${donorImgIndex}`;
    return `replace Person #${m.personIndex} located ${zone} in attached image ${sourceImgIndex} with the person from attached image ${donorImgIndex}${outfitLock}, matching Person #${m.personIndex}'s exact body pose, limb placement, hand gesture, and camera angle`;
  });

  const keepOthers =
    (input.totalDetectedPeople ?? sorted.length) > sorted.length
      ? ` Keep any other unmapped people in attached image ${sourceImgIndex} completely unchanged in their original identity, clothes, and pose.`
      : "";

  const light = resolveJutsuLightText(input.relightId, input.customLightPrompt);
  const lightClause = light
    ? ` Relight the entire scene: ${light}`
    : ` Preserve the exact background, room geometry, props, and scene lighting from attached image ${sourceImgIndex}.`;

  return `Using attached image ${sourceImgIndex} as the base scene frame, ${assignments.join("; and ")}.${keepOthers}${lightClause}`;
}
```

3. In `src/service/jutsu/minimax-h3-ref2va.ts`, support `identityImageUrls?: string[]` and `personMappings?: readonly JutsuPersonMapping[]`:

```ts
import type { JutsuPersonMapping } from "@/model/jutsu-job";
```

In `buildMinimaxH3Ref2VaBody`:
```ts
export function buildMinimaxH3Ref2VaBody(input: {
  prompt: string;
  preparedImageUrl: string;
  identityImageUrl?: string;
  identityImageUrls?: readonly string[];
  mannequinVideoUrl: string;
  audioUrl?: string;
  noLipSync?: boolean;
  durationSeconds: number;
  aspectRatio: AspectRatio;
}) {
  const promptText = input.noLipSync
    ? `${input.prompt.trim()} Nobody sings or speaks along to the music; mouths stay naturally relaxed.`
    : input.prompt.trim();

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string }; role: "reference_image" }
    | { type: "video_url"; video_url: { url: string }; role: "reference_video" }
    | { type: "audio_url"; audio_url: { url: string }; role: "reference_audio" }
  > = [
    { type: "text", text: promptText },
    {
      type: "image_url",
      image_url: { url: input.preparedImageUrl },
      role: "reference_image",
    },
  ];

  const rawIdentityList =
    input.identityImageUrls && input.identityImageUrls.length > 0
      ? input.identityImageUrls
      : input.identityImageUrl
        ? [input.identityImageUrl]
        : [];

  const seenUrls = new Set<string>([input.preparedImageUrl]);
  for (const rawUrl of rawIdentityList) {
    const url = rawUrl?.trim();
    if (!url || seenUrls.has(url)) continue;
    if (seenUrls.size >= 9) break; // MiniMax H3 supports up to 9 reference_image entries
    seenUrls.add(url);
    content.push({
      type: "image_url",
      image_url: { url },
      role: "reference_image",
    });
  }
```

And in `buildJutsuRef2VaPrompt`:
```ts
export function buildJutsuRef2VaPrompt(input: {
  motionText: string;
  lightText?: string;
  hasIdentityImage: boolean;
  characterOutfitSpec?: string;
  personMappings?: readonly JutsuPersonMapping[];
}): string {
  const mappings = input.personMappings
    ? [...input.personMappings].sort(
        (a, b) => a.box.x + a.box.width / 2 - (b.box.x + b.box.width / 2),
      )
    : [];

  if (mappings.length > 1) {
    const locks = mappings.map((m, idx) => {
      const refNum = idx + 2;
      const cx = Math.round((m.box.x + m.box.width / 2) * 100);
      const spec = m.characterOutfitSpec?.trim()
        ? ` (${m.characterOutfitSpec.trim()})`
        : "";
      return `Reference image ${refNum} locks the true face, identity, and exact full-body outfit${spec} for the swapped person at ~${cx}% horizontal position`;
    });
    return [
      "Reference image 1 is the prepared scene with the swapped characters and background to preserve. Reference video 1 shows grey mannequins performing the target motion for the swapped people while unmapped people stay as-is.",
      `${locks.join(". ")}.`,
      "Follow each grey mannequin's pose, hands, and timing in Reference video 1 while keeping every character's face, outfit, any unmapped people, and the background from Reference image 1.",
      input.motionText,
      input.lightText ? `Lighting remains consistent: ${input.lightText}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const cleanOutfit = (
    mappings[0]?.characterOutfitSpec ||
    input.characterOutfitSpec ||
    ""
  ).trim();
  return [
    "Reference image 1 is the person, outfit, and the source scene/background to preserve. Reference video 1 is a grey mannequin performing the motion.",
    input.hasIdentityImage
      ? "Reference image 2 is the true face, identity, and exact outfit of this character: keep that exact face shape, eyes, nose, mouth, skin, and exact outfit (every garment, neckline, sleeve length, color, fabric texture, and graphic print) in every frame, including when hands move near the face."
      : "Keep the exact outfit from Reference image 1 (every garment, neckline, sleeve length, color, fabric texture, and graphic print) unchanged in every frame.",
    cleanOutfit ? `Character outfit lock: ${cleanOutfit}.` : "",
    "Follow the mannequin's pose, hands, and timing exactly, while keeping the person, the exact background/room, and any on-screen text or graphic letters from Reference image 1.",
    input.motionText,
    input.lightText ? `Lighting remains consistent: ${input.lightText}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
```

4. In `src/service/jutsu/sam-mannequin.ts`, accept `personMappings?: readonly JutsuPersonMapping[]` and `allDetectedAnchors?: ReadonlyArray<{ objectId: number; anchorPoint: { x: number; y: number } }>` in `buildSam3MannequinAndMaskVideos` and `tryRenderMannequinFramesWithFal`:
- When `personMappings` is provided and non-empty, run `segmentVideoWithFalSam3Rle` for each mapped person with:
  - `pointPrompts`: positive point (`label: 1`) at `m.anchorPoint` (`object_id: m.objectId`) plus negative points (`label: 0`, `object_id: m.objectId`) at the other detected people's `anchorPoint`s.
- For each frame `i`, decode each mapped person's RLE mask and combine them via `unionBinaryMasks`, then pass the unioned mask into `renderGreyMannequinAndMaskFrameFromMask`.

5. In `src/service/jutsu/pipeline.ts` and `src/presentation/actions/jutsu.ts`:
- Add `detectJutsuPeopleInFrame(input: { frameDataUrl: string })` in `src/service/jutsu/pipeline.ts` and expose `detectJutsuPeopleAction` in `src/presentation/actions/jutsu.ts`.
- Update `startScroSwapJob` and `runScroSwapJobInBackground` to accept `personMappings?: JutsuPersonMapping[]` and `totalDetectedPeople?: number`, resolve each mapping's character donor via `resolveCharacterDonorForSwap`, build multi-person keyframe prompts (`buildMultiPersonJutsuEditPrompt`) when `personMappings` is present, and pass all mapped donor URLs to `submitMinimaxH3Ref2VaVideo`.
- Update `pipeline-models.md` row for **Scro Swap** to mention `fal-ai/sam-3/image-rle` (frame-0 multi-person RLE layout) alongside `fal-ai/sam-3/video-rle`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/jutsu/jutsu.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/jutsu-job.ts src/service/jutsu/describer.ts src/service/jutsu/minimax-h3-ref2va.ts src/service/jutsu/sam-mannequin.ts src/service/jutsu/pipeline.ts src/presentation/actions/jutsu.ts src/service/jutsu/jutsu.test.ts pipeline-models.md
git commit -m "feat(jutsu): support multi-person RLE mappings in SAM mannequin, Seedream keyframes, and MiniMax H3 ref2va"
```

---

### Task 3: Interactive RLE Silhouette Overlay & Active Person Tabs UI

**Files:**
- Create: `src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx`
- Modify: `src/presentation/components/app/jutsu/jutsu-studio.tsx`
- Modify: `src/presentation/components/app/jutsu/scro-swap-create-dialog.tsx`

**Interfaces:**
- Consumes: `detectJutsuPeopleAction` from `@/presentation/actions/jutsu`, `DetectedSourcePerson` from `@/service/fal/sam3-image`, `JutsuPersonMapping` from `@/model/jutsu-job`
- Produces: `JutsuPersonRleOverlay` and `JutsuPersonTabsBar` in `src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx`, wired into `JutsuStudio` and `ScroSwapCreateDialog`.

- [ ] **Step 1: Create `src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx`**

Create the `'use client'` component with:
- Frame-0 capture helper `captureVideoFrameDataUrl(videoEl: HTMLVideoElement, maxEdge = 768): string | null`
- Interactive `<canvas>` RLE silhouette overlay (`JutsuPersonRleOverlay`) that decodes each person's RLE string, draws colored translucent silhouettes + 2px contour outlines, and handles click hit-testing against each person's RLE mask to switch `activePersonIndex`.
- Active Person Tabs capsule bar (`JutsuPersonTabsBar`) below the video showing each detected person (`Person #1`, `Person #2`, ...), their assigned Scro Character + Look name (or `Keep Original / 保留原人物`), and a `↻ Redetect / 重新偵測` button.

- [ ] **Step 2: Integrate into `src/presentation/components/app/jutsu/jutsu-studio.tsx` and `src/presentation/components/app/jutsu/scro-swap-create-dialog.tsx`**

- Debounce (`800ms`) automatic `detectJutsuPeopleAction` whenever `sourceVideoUrl` or `sectionStart` changes.
- Upon detection, default `Person #1` to the currently selected character/look and `Person #2..N` to `Keep Original`.
- Render `JutsuPersonRleOverlay` over the source `<video>` and `JutsuPersonTabsBar` underneath it.
- In Step 2 ("Select Character"), add a **"Keep Original / 保留原人物"** tile when `detectedPeople.length > 0` so the user can toggle any person between "Keep Original" and any Scro Character + 9:16 Outfit card.
- Pass the active `personMappings` and `totalDetectedPeople: detectedPeople.length` into `startScroSwapJobAction`.

- [ ] **Step 3: Run ESLint, Typecheck, and Unit Tests**

Run:
```bash
npx eslint src/presentation/components/app/jutsu/ src/service/jutsu/ src/service/fal/ src/presentation/actions/jutsu.ts src/model/jutsu-job.ts && npx tsc --noEmit && npx tsx --test src/service/fal/fal.test.ts src/service/jutsu/jutsu.test.ts
```
Expected: 0 lint errors, 0 type errors, all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx src/presentation/components/app/jutsu/jutsu-studio.tsx src/presentation/components/app/jutsu/scro-swap-create-dialog.tsx
git commit -m "feat(jutsu-ui): add SAM 3 RLE person silhouette overlay and multi-person character mapping tabs"
```
