# Scro Swap Multi-Character Reference Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users in `/app/scroswap` and OpenEdit's clip Scro Swap dialog to either select an existing Scro `Character` or upload 1–6 custom reference images of the target character, wiring single and multiple reference images end-to-end through the Cloud and ComfyUI pipelines.

**Architecture:** Extend `JutsuJob` and `JutsuPersonMapping` with `referenceImageUrls?: string[]` (capped at `MAX_CHARACTER_REFERENCES = 6`, keeping `referenceImageUrl` set to the first URL for backward compatibility). On the Cloud path, pass all character reference URLs in order to the VLM prompt upsampler, `Seedream 5.0 Pro`, and `MiniMax H3 ref2va` (`identityImageUrls`) with ordinal-aware prompts; on the self-hosted ComfyUI path (`simple.api.json`), pass a single image directly or stitch 2–6 images via `sharp` (`composeJutsuCharacterReferenceSheet`) into one high-resolution `Picture 1` reference sheet.

**Tech Stack:** TypeScript, Next.js 16 App Router, React 19, MongoDB (`jutsu_jobs`), `sharp`, Node built-in test runner (`node:test` + `node:assert/strict` via `tsx`).

**Spec:** `docs/superpowers/specs/2026-11-07-scro-swap-multi-character-images-design.md`

## Global Constraints

- Maximum custom character reference images per character slot: `MAX_CHARACTER_REFERENCES = 6` (imported from `@/service/character/reference-urls`).
- Backward compatibility: whenever `referenceImageUrls` is populated, `referenceImageUrl` MUST be set to `referenceImageUrls[0]`; when only `referenceImageUrl` is provided, `referenceImageUrls` normalizes to `[referenceImageUrl]`.
- Zero live paid provider calls in unit tests: mock `fetch` (`fakeFetch`) or test pure functions + local `sharp` buffers only.
- Update `pipeline-models.md` if pipeline reference inputs change.

## Review Focus

1. **Duplicate / blank / >6 URLs in `referenceImageUrls`**: `normalizeJutsuReferenceUrls` must trim, deduplicate while preserving order, filter non-`https://` or empty strings, and cap at `MAX_CHARACTER_REFERENCES` (6).
2. **Single-person multi-image prompt ordinals**: When 3 custom photos are uploaded for a single-person swap, the donor images are `attached images 1 to 3` and the source video frame is `attached image 4` (not `attached image 2`).
3. **Multi-person multi-image prompt ordinals**: When Person #1 has 2 uploaded photos and Person #2 has 1 character look, Person #1 maps to `attached images 1 to 2`, Person #2 maps to `attached image 3`, and the base scene frame is `attached image 4`.
4. **ComfyUI multi-photo composite (`composeJutsuCharacterReferenceSheet`)**: When 1 buffer is passed, it returns that buffer unchanged; when 2–6 buffers are passed (even with mixed aspect ratios or PNG alpha), it composites them onto a clean dark/neutral canvas without throwing or distorting aspect ratios.
5. **Switching between Character and uploaded photos in UI**: Selecting a saved `Character` clears active custom photo selection for that slot; uploading 1 or more custom photos switches the slot to custom photos; removing one photo from a 3-photo upload leaves the remaining 2 photos active.

---

### Task 1: Model & Reference URL Normalization + Prompt Ordinal Support (Cloud Pipeline)

**Files:**
- Modify: `src/model/jutsu-job.ts`
- Modify: `src/service/jutsu/light-looks.ts`
- Modify: `src/service/jutsu/describer.ts`
- Modify: `src/service/jutsu/minimax-h3-ref2va.ts`
- Modify: `src/service/jutsu/jutsu.test.ts`

**Interfaces:**
- Produces in `src/model/jutsu-job.ts`:
  - `JutsuPersonMapping.referenceImageUrls?: string[]`
  - `JutsuJob.referenceImageUrls?: string[]`
  - `PublicJutsuJob.referenceImageUrls?: string[]`
  - `normalizeJutsuReferenceUrls(urls?: readonly (string | undefined | null)[], fallbackUrl?: string | null): string[]` (caps at 6, trims, deduplicates)
- Produces in `src/service/jutsu/describer.ts`:
  - `buildDefaultJutsuEditPrompt(input: { ..., referenceImageCount?: number }): string`
  - `buildMultiPersonJutsuEditPrompt(input: { mappings: readonly JutsuPersonMapping[]; totalDetectedPeople?: number; relightId?: string; customLightPrompt?: string }): string`
  - `flattenPersonMappingDonorUrls(mappings: readonly JutsuPersonMapping[]): string[]`
- Produces in `src/service/jutsu/minimax-h3-ref2va.ts`:
  - `buildJutsuRef2VaPrompt(input: { ..., identityImageCount?: number }): string`

- [ ] **Step 1: Write the failing unit tests in `src/service/jutsu/jutsu.test.ts`**

Add tests covering:
1. `normalizeJutsuReferenceUrls` deduplicates, trims, falls back to `fallbackUrl`, and caps at 6 URLs.
2. `buildDefaultJutsuEditPrompt({ mode: "character_swap", referenceImageCount: 3 })` references `attached images 1 to 3` as the character donor and `attached image 4` as the source scene frame (while `referenceImageCount: 1` or omitted keeps `attached image 1` and `attached image 2`).
3. `buildMultiPersonJutsuEditPrompt` with Person #1 having `referenceImageUrls: ["https://blob.test/p1-a.jpg", "https://blob.test/p1-b.jpg"]` and Person #2 having `referenceImageUrl: "https://blob.test/p2.jpg"` assigns `attached images 1 to 2` to Person #1, `attached image 3` to Person #2, and `attached image 4` as the base scene frame; `flattenPersonMappingDonorUrls` returns all 3 URLs in left-to-right person order.
4. `buildJutsuRef2VaPrompt` with `hasIdentityImage: true, identityImageCount: 3` mentions `Reference images 2 to 4` locking the true face, identity, and exact outfit across angles.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/service/jutsu/jutsu.test.ts`
Expected: FAIL (`normalizeJutsuReferenceUrls` / `flattenPersonMappingDonorUrls` not exported or prompt ordinal assertions fail).

- [ ] **Step 3: Implement model fields, `normalizeJutsuReferenceUrls`, and multi-image prompt builders**

- In `src/model/jutsu-job.ts`:
  - Add `referenceImageUrls?: string[]` to `JutsuPersonMapping`, `JutsuJob`, `PublicJutsuJob`, and `toPublicJutsuJob`.
  - Export `normalizeJutsuReferenceUrls(urls?: readonly (string | undefined | null)[], fallbackUrl?: string | null): string[]` (max 6 unique non-empty trimmed URLs).
- In `src/service/jutsu/light-looks.ts` and `src/service/jutsu/describer.ts`:
  - Support `referenceImageCount?: number` (default `1`) in `buildDefaultJutsuEditPrompt`: when `count > 1`, donor label is `attached images 1 to ${count}` (same person across reference angles/views) and source frame is `attached image ${count + 1}`.
  - Export `flattenPersonMappingDonorUrls(mappings: readonly JutsuPersonMapping[]): string[]` and update `buildMultiPersonJutsuEditPrompt` so each sorted mapping consumes `urls = normalizeJutsuReferenceUrls(m.referenceImageUrls, m.referenceImageUrl)` (1..6 URLs) and computes `startIdx..endIdx` and `sourceImgIndex = totalDonorCount + 1`.
- In `src/service/jutsu/minimax-h3-ref2va.ts`:
  - Update `buildJutsuRef2VaPrompt` to accept `identityImageCount?: number` and support multi-image `mapping.referenceImageUrls` per person in `subject_definitions`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/jutsu/jutsu.test.ts`
Expected: PASS

---

### Task 2: ComfyUI Multi-Image Reference Sheet Composite & Pipeline Wiring

**Files:**
- Modify: `src/service/comfy/submit-swap.ts`
- Modify: `src/service/comfy/openjutsu-graph.test.ts`
- Modify: `src/service/jutsu/pipeline.ts`
- Modify: `src/service/opencut/clip-jutsu.ts`
- Modify: `src/service/opencut/clip-jutsu.test.ts`

**Interfaces:**
- Produces in `src/service/comfy/submit-swap.ts`:
  - `resolveJobCharacterReferenceUrls(job: Pick<JutsuJob, "referenceImageUrl" | "referenceImageUrls" | "personMappings">): string[]`
  - `composeJutsuCharacterReferenceSheet(imageBuffers: readonly Buffer[]): Promise<Buffer>`
- Produces in `src/service/jutsu/pipeline.ts`:
  - `PrepareJutsuJobInput.referenceImageUrls?: string[]`
  - `StartScroSwapInput.referenceImageUrls?: string[]`
- Produces in `src/service/opencut/clip-jutsu.ts`:
  - `applyClipScroSwap(input: { videoId: string; clipNumber: number; characterId?: string; referenceImageUrl?: string; referenceImageUrls?: string[] }): Promise<ApplyClipEngineResult>`

- [ ] **Step 1: Write failing tests in `src/service/comfy/openjutsu-graph.test.ts` and `src/service/opencut/clip-jutsu.test.ts`**

Add tests verifying:
1. `composeJutsuCharacterReferenceSheet([singleBuf])` returns `singleBuf` unchanged; `composeJutsuCharacterReferenceSheet([buf1, buf2, buf3])` produces a valid JPEG composite image containing all reference views side-by-side/grid.
2. `trySubmitJutsuComfy` with `referenceImageUrls: ["https://blob.test/front.png", "https://blob.test/fullbody.png"]` fetches both URLs, composites them into one reference sheet, and uploads that composite to ComfyUI `/upload/image` for Node `"2"` (`Picture 1`).
3. `resolveJobCharacterReferenceUrls` prefers the mapped person's `referenceImageUrls` (or falls back to `job.referenceImageUrls` / `job.referenceImageUrl`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/comfy/openjutsu-graph.test.ts src/service/opencut/clip-jutsu.test.ts`
Expected: FAIL (`composeJutsuCharacterReferenceSheet` / `resolveJobCharacterReferenceUrls` not found).

- [ ] **Step 3: Implement `composeJutsuCharacterReferenceSheet`, `trySubmitJutsuComfy` multi-image support, and `pipeline.ts` / `clip-jutsu.ts` wiring**

- In `src/service/comfy/submit-swap.ts`:
  - Implement `resolveJobCharacterReferenceUrls(job)` using `normalizeJutsuReferenceUrls`.
  - Implement `composeJutsuCharacterReferenceSheet(imageBuffers)`: if `imageBuffers.length === 1`, return `imageBuffers[0]!`; if `2..6`, resize each image to fit cleanly in a tile (`fit: "contain"`, neutral dark background `#18181b`) and composite into a 1-row (for 2–3 images) or 2-row (for 4–6 images) high-resolution JPEG (`quality: 92`).
  - Update `trySubmitJutsuComfy` in `"character_swap"` mode to fetch all `urls = resolveJobCharacterReferenceUrls(job)` in parallel and pass `await composeJutsuCharacterReferenceSheet(buffers)` to `submitOpenJutsuSimple`.
- In `src/service/jutsu/pipeline.ts`:
  - Accept `referenceImageUrls?: string[]` in `PrepareJutsuJobInput` and `StartScroSwapInput`.
  - When `characterId` is NOT used (or custom uploaded photos are passed), normalize `donorImageUrls = normalizeJutsuReferenceUrls(input.referenceImageUrls, input.referenceImageUrl)` and set `donorImageUrl = donorImageUrls[0]`.
  - In `personMappings` resolution and `runScroSwapJobInBackground` (both `mediaKind === "image"` and video/gif branches) and `prepareJutsuJob`, pass all `donorUrls` (`flattenPersonMappingDonorUrls(activeMappings)` or `donorImageUrls`) to `upsampleJutsuFramePrompt`, `generatePreparedKeyframeBuffer` (`referenceImageUrls: [...donorUrls, rawStartFrameUrl]`), `buildDefaultJutsuEditPrompt` (`referenceImageCount: donorUrls.length`), and `submitMinimaxH3Ref2VaVideo` (`identityImageUrls`).
- In `src/service/opencut/clip-jutsu.ts`:
  - Accept `referenceImageUrls?: string[]` in `applyClipScroSwap` and forward to `startScroSwapJob`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/comfy/openjutsu-graph.test.ts src/service/opencut/clip-jutsu.test.ts src/service/jutsu/jutsu.test.ts`
Expected: PASS

---

### Task 3: Multi-Image Character Upload UI in `/app/scroswap` (`JutsuStudio`) and OpenEdit (`OpenCutClipScroSwapDialog`)

**Files:**
- Modify: `src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx`
- Modify: `src/presentation/components/app/jutsu/jutsu-studio.tsx`
- Modify: `src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx`
- Modify: `pipeline-models.md`

**Interfaces:**
- Produces in `src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx`:
  - `JutsuPersonSlotAssignment.uploadedPhotoUrls?: string[]` (alongside `uploadedPhotoUrl: string`)
- Produces in `src/presentation/components/app/jutsu/jutsu-studio.tsx`:
  - `uploadedPhotoUrls: string[]` state (up to `MAX_CHARACTER_REFERENCES = 6`), multi-file drag-and-drop & `<input type="file" multiple accept="image/png,image/jpeg,image/webp" />` upload, thumbnail strip with remove (`×`) and `+ Add Photos` / `Clear`, and seamless switching between saved `Character` and custom uploaded photo(s).
- Produces in `src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx`:
  - `uploadedPhotoUrls: string[]` state (up to 6 photos), multi-file upload/drop, per-photo remove (`×`), `+ Add Photos`, `Clear`, and passing `referenceImageUrls` to `applyClipScroSwapAction`.

- [ ] **Step 1: Update `jutsu-person-rle-mapper.tsx` for multi-photo slot badges**

- Add `uploadedPhotoUrls?: string[]` to `JutsuPersonSlotAssignment`.
- In `JutsuPersonRleOverlay` and `JutsuPersonTabsBar`, when `slot.uploadedPhotoUrls?.length` is > 1, show count in badge (`Custom Photos (3)` / `自訂相片 (3)`).

- [ ] **Step 2: Update `jutsu-studio.tsx` to support single or multiple character image uploads (1–6 photos) alongside saved Characters**

- Replace single-file `handleCharacterFile` with `handleCharacterFiles(files: FileList | File[])` that uploads up to `MAX_CHARACTER_REFERENCES - currentUrls.length` images in parallel/sequence via `uploadDirectBlob(file, false)`, appends unique URLs to `uploadedPhotoUrls`, and updates the active person slot (`uploadedPhotoUrl: nextUrls[0] ?? ""`, `uploadedPhotoUrls: nextUrls`).
- On the workbench `2. Character` card:
  - Support dropping 1 or multiple image files at once.
  - When `uploadedPhotoUrls.length > 1`, render a clean multi-photo grid preview and badge (`${uploadedPhotoUrls.length} Photos` / `${uploadedPhotoUrls.length} 張相片`).
- In the Character Selection Modal (`charModalOpen`):
  - Allow uploading 1–6 custom photos via a multi-file upload button (`+ Upload Photo(s)` / `上傳自訂人物相（可多張）`) or drag-and-drop.
  - Display an uploaded-photos bar when `uploadedPhotoUrls.length > 0` showing thumbnails of each uploaded photo with individual `×` remove buttons, an `+ Add More` button (when `< 6`), and a `Clear` button.
  - Clicking a saved `Character` switches the active slot to that character (clearing `uploadedPhotoUrls` for that slot); uploading photos switches the active slot to the uploaded photo(s).
- In `builtPersonMappings` and `onSubmit`:
  - Populate `referenceImageUrls` and `referenceImageUrl: referenceImageUrls[0]` on each `JutsuPersonMapping` and on `startScroSwapJobAction`.

- [ ] **Step 3: Update `opencut-clip-scro-swap-dialog.tsx` to support 1–6 custom character reference photos**

- Replace `uploadedPhotoUrl: string` with `uploadedPhotoUrls: string[]` (up to `MAX_CHARACTER_REFERENCES = 6`).
- Support selecting or dropping 1–6 images at once, displaying thumbnails with individual remove (`×`) buttons, `+ Add Photo` (up to 6), and `Clear`, while clicking any saved `Character` switches back to that `Character`.
- Pass `referenceImageUrl: uploadedPhotoUrls[0]` and `referenceImageUrls: uploadedPhotoUrls` to `applyClipScroSwapAction`.
- Update `pipeline-models.md` to note that Scro Swap supports 1–6 character reference images.

- [ ] **Step 4: Run typecheck, lint, and unit tests**

Run:
- `npx tsc --noEmit`
- `npx eslint src/model/jutsu-job.ts src/service/jutsu/describer.ts src/service/jutsu/light-looks.ts src/service/jutsu/minimax-h3-ref2va.ts src/service/jutsu/pipeline.ts src/service/comfy/submit-swap.ts src/service/opencut/clip-jutsu.ts src/presentation/components/app/jutsu/jutsu-person-rle-mapper.tsx src/presentation/components/app/jutsu/jutsu-studio.tsx src/presentation/components/app/projects/new/opencut-clip-scro-swap-dialog.tsx`
- `npx tsx --test src/service/jutsu/jutsu.test.ts src/service/comfy/openjutsu-graph.test.ts src/service/opencut/clip-jutsu.test.ts`
Expected: 0 errors, all tests PASS.
