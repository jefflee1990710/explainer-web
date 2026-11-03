# Scro Swap SAM 3 RLE Multi-Person Layout & User-to-Character Mapping Design

**Date:** 2026-11-03  
**Status:** Approved for Planning

---

## 1. Goal & Scope

Enable **Scro Swap** (`JutsuStudio` and `ScroSwapCreateDialog`) to:
1. Automatically segment every person in the source video's opening frame (`sectionStart`) using `fal-ai/sam-3/image-rle` and render pixel-accurate **RLE silhouette overlays** (never rough bounding boxes) over the source video preview.
2. Provide an **Active Person Tab** interface where users click any RLE person silhouette (or its tab capsule) and use the existing Character + 9:16 Full-Body Outfit Picker below to map each detected person to either:
   - **Keep Original** (do not swap this person; preserve their original pixels), or
   - **A target Scro Character + Outfit Preset / Historical Version / Custom Photo**.
3. Execute a **Single-Pass Multi-Person Swap** in the backend pipeline:
   - Track each mapped person across the video section via `fal-ai/sam-3/video-rle` using their frame-0 interior RLE anchor point (`point_prompts` + `object_id`).
   - Union only the mapped people's per-frame RLE masks into the `#808080` grey mannequin video (`mannequin.mp4`) so unmapped people remain untouched in the source scene.
   - Pass all mapped character donor images (ordered left-to-right) to OpenRouter `bytedance-seed/seedream-5-0-pro` for the start/end keyframes and to MiniMax H3 `ref2va` for the single-pass video render.

---

## 2. Architecture & Module Boundaries

### 2.1 Frame-0 Multi-Person RLE Detection (`src/service/fal/sam3-image.ts`)
- **Purpose:** Segment all distinct people on the opening frame of the selected video section and return pixel-accurate RLE masks sorted left-to-right.
- **Endpoint:** `fal-ai/sam-3/image-rle`
- **Request Payload:**
  ```json
  {
    "image_url": "<uploaded fal URL or data URI>",
    "prompt": "person",
    "return_multiple_masks": true,
    "max_masks": 6,
    "include_scores": true,
    "include_boxes": true,
    "apply_mask": false
  }
  ```
- **Output Type (`DetectedSourcePerson`):**
  ```ts
  export type DetectedSourcePerson = {
    objectId: number; // Original mask index from fal SAM 3 (0, 1, ...)
    personIndex: number; // 1-based index after sorting left-to-right by normalized box center X
    label: string; // e.g. "Person #1"
    rle: string; // Sparse RLE string "(flatIndex, runLength) ..."
    width: number; // Canvas width of the RLE mask
    height: number; // Canvas height of the RLE mask
    score: number;
    box: { x: number; y: number; width: number; height: number }; // Normalized [0..1]
    anchorPoint: { x: number; y: number }; // Normalized [0..1] foreground pixel closest to mask centroid
  };
  ```
- **Interior Anchor Point (`computeMaskInteriorAnchorPoint` in `src/service/fal/rle.ts`):**
  - Decodes the person's binary mask (`decodeFalSparseRle`).
  - Computes the mean `(cx, cy)` of all foreground pixels (`mask[p] === 1`).
  - Finds the foreground pixel `(px, py)` with minimum Euclidean distance to `(cx, cy)` so concave poses (e.g. wide stance or raised arms) still produce a point strictly inside the person's RLE mask.
  - Filters out tiny noise masks whose foreground pixel area is `< 0.5%` of the frame.

### 2.2 Server Action (`src/presentation/actions/jutsu.ts`)
- `detectJutsuPeopleAction(input: { frameDataUrl: string }): Promise<{ ok: true; people: DetectedSourcePerson[] } | { ok: false; error: string }>`
- Requires authenticated user (`requireAppUser()`), validates `frameDataUrl` (`data:image/(webp|jpeg|png);base64,...`), reads image dimensions with `sharp`, calls `detectPeopleWithFalSam3ImageRle`, and returns the sorted `DetectedSourcePerson[]`.
- When `FAL_KEY` is not configured, returns `{ ok: true, people: [] }` so the UI gracefully falls back to single-character mode.

### 2.3 Data Model (`src/model/jutsu-job.ts`)
- Add `JutsuPersonMapping` and optional `personMappings?: JutsuPersonMapping[]` to `JutsuJob`, `PublicJutsuJob`, and `startScroSwapJobAction` input:
  ```ts
  export type JutsuPersonMapping = {
    objectId: number;
    personIndex: number; // 1-based left-to-right order
    anchorPoint: { x: number; y: number }; // Normalized [0..1] interior point on frame 0
    box: JutsuPlacementBox; // Normalized [0..1] bounds on frame 0
    characterId?: string;
    characterName?: string;
    referenceImageUrl: string; // Full-body standing donor URL
    characterOutfitSpec?: string;
  };
  ```
- **Backward Compatibility:**
  - `job.characterId`, `job.characterName`, `job.referenceImageUrl`, and `job.characterOutfitSpec` continue to be populated from `personMappings[0]` (or legacy single-character input) so history cards and existing queries work without migration.

### 2.4 UI Component (`src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx`)
- A dedicated `'use client'` component rendered inside `JutsuStudio` and `ScroSwapCreateDialog`.
- **Auto-Detection Trigger:**
  - When `sourceVideoUrl` loads or `sectionStart` changes, waits `800ms` (debounced), seeks a hidden/preview `<video>` element to `sectionStart`, draws the frame onto an offscreen `<canvas>` (max edge `768px`, `image/jpeg` quality `0.85`), and invokes `detectJutsuPeopleAction`.
  - Also exposes a manual **"↻ Redetect People / 重新偵測人物"** button.
- **RLE Silhouette Overlay Canvas:**
  - Renders over the video player matching the video's aspect ratio.
  - Decodes each `DetectedSourcePerson.rle` and paints a translucent colored silhouette fill + crisp 2px contour stroke:
    - Active selected person: vibrant lime (`#d4ff33`) stroke + `28%` fill opacity.
    - Other mapped person(s): sky blue (`#38bdf8`) / amber (`#fbbf24`) / rose (`#fb7185`) stroke + `22%` fill opacity.
    - Unmapped ("Keep Original") person: muted dashed outline + `10%` fill opacity.
  - Clicking directly on any person's RLE pixels switches `activePersonIndex` to that person.
- **Active Person Tabs + Shared Character/Outfit Picker:**
  - Below the video, renders horizontal person pills: `Person #1 (Left) → Scro` | `Person #2 (Right) → Keep Original`.
  - Default mapping upon detection: `Person #1` maps to the user's first Scro character (default look); `Person #2..N` default to **Keep Original** (`unmapped`).
  - In Step 2 ("Select Character"), adds a **"Keep Original / 保留原人物"** pill at the start of the character strip when `people.length > 0`. Selecting a character or 9:16 outfit card updates the mapping for `activePersonIndex`.

### 2.5 Backend Single-Pass Multi-Person Pipeline
1. **Per-Person Video RLE & Union Mannequin (`src/service/jutsu/sam-mannequin.ts` & `src/service/fal/sam3-video.ts`):**
   - Extend `segmentVideoWithFalSam3Rle` to accept `pointPrompts?: FalSam3PointPrompt[]` (`{ x, y, label: 1 | 0, frame_index?: number, object_id?: number }`).
   - In `tryRenderMannequinFramesWithFal`:
     - When `personMappings` is non-empty, for each mapped target $m$, submit `segmentVideoWithFalSam3Rle` with:
       - `prompt: "person"`
       - `pointPrompts: [{ x: Math.round(m.anchorPoint.x * frameW), y: Math.round(m.anchorPoint.y * frameH), label: 1, frame_index: 0, object_id: m.objectId }]`
       - Plus negative points (`label: 0`) at the `anchorPoint` of other detected people so SAM 3 strictly isolates person $m$ even when people stand close together.
     - Decode each mapped person's per-frame RLE into a `Uint8Array` mask and union them per frame (`unionMaskMasks(masks)` in `src/service/fal/rle.ts`).
     - Render `#808080` grey mannequin pixels only where `unionMask[p] === 1`. Unmapped people keep their original RGB pixels.
2. **Multi-Character Keyframe Preparation (`src/service/jutsu/describer.ts` & `src/service/jutsu/pipeline.ts`):**
   - Sort active `personMappings` left-to-right by `box.x + box.width / 2`.
   - Build `startRefs = [...donorUrls, rawStartFrameUrl]` and `endRefs = [...donorUrls, rawEndFrameUrl]`.
   - Add `buildMultiPersonJutsuEditPrompt(mappings, relightInput)` in `describer.ts`:
     - Clearly specifies each reference image ordinal (`attached image 1 .. K`) and its target person position in the final attached source frame (`attached image K+1`), instructing `seedream-5-0-pro` to replace each mapped person with their respective donor's face, hair, and full-body outfit while keeping any unmapped people and the background intact.
3. **MiniMax H3 `ref2va` Multi-Donor Conditioning (`src/service/jutsu/minimax-h3-ref2va.ts`):**
   - Extend `buildMinimaxH3Ref2VaBody` and `buildJutsuRef2VaPrompt` to accept `identityImageUrls?: string[]` and `personMappings?: Array<{ personIndex: number; characterName?: string; characterOutfitSpec?: string; horizontalPosition: string }>`:
     - `Reference image 1`: `preparedStartFrameUrl`
     - `Reference image 2 .. K+1`: unique donor images for each mapped person (capped to MiniMax H3's 9-image limit)
     - `Reference video 1`: `mannequinVideoUrl`
   - Prompt explicitly locks each grey mannequin silhouette (from left to right) to its corresponding reference image and outfit spec.

---

## 3. Error Handling & Edge Cases

- **No `FAL_KEY` or 0 People Detected:** `detectJutsuPeopleAction` returns `people: []`; the UI hides the person tabs and operates identically to the existing single-character flow.
- **All People Set to "Keep Original":** When `people.length > 0` and every person is set to "Keep Original", the Generate button is disabled and shows an inline hint (`請至少為 1 位畫面人物指定替換角色` / `Select a character for at least one person`).
- **Overlapping / Close People:** Passing negative `point_prompts` (`label: 0`) from the other detected people's anchor points prevents `sam-3/video-rle` from bleeding one person's mask into another's.
- **pipeline-models.md Sync:** Check if `pipeline-models.md` lists `fal-ai/sam-3/video-rle`; document `fal-ai/sam-3/image-rle` alongside it so `pipeline-models.md` stays 100% in sync with the system design.

---

## 4. Verification & Testing Plan

All tests use `node:test` + `node:assert/strict` with mocked `fetch` (zero live paid provider calls):
1. `src/service/fal/fal.test.ts`:
   - `computeMaskInteriorAnchorPoint` returns a foreground pixel inside both convex and concave/L-shaped RLE masks.
   - `unionBinaryMasks` combines multiple binary RLE masks without mutating unmapped regions.
   - `detectPeopleWithFalSam3ImageRle` parses multi-mask RLE payloads, filters tiny noise masks, and sorts people left-to-right (`Person #1`, `Person #2`).
   - `segmentVideoWithFalSam3Rle` forwards `point_prompts` (`label: 1` target + `label: 0` negative anchors).
2. `src/service/jutsu/jutsu.test.ts`:
   - `buildMultiPersonJutsuEditPrompt` and `buildMinimaxH3Ref2VaBody` / `buildJutsuRef2VaPrompt` with multiple mapped characters order reference images and prompts left-to-right and preserve unmapped people.
3. Lint (`npx eslint src/`) and Typecheck (`npx tsc --noEmit`).
