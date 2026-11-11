# Simple Video Ref Video & Ref Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable creators in the Simple Video studio (`/app/simple`) to attach optional reference video (`ref video` for motion/camera trajectory) and reference audio (`ref audio` for speech/soundscape) alongside first/last keyframes and reference images, feeding them into the MiniMax H3 `ref2va` generation pipeline.

**Architecture:** Extend `Project` and `VideoClip` models with `referenceVideoUrl` and `referenceAudioUrl`. Expose a new media upload Server Action `uploadSimpleMediaAction` supporting video/audio uploads to Vercel Blob. Update `createSimpleVideoAction` to persist the references. Update `submitComfyStoryboardClipVideo` to upload the media to ComfyUI and wire `ref_videos.ref_video_0` (via `VHS_LoadVideo`) and `ref_video_audios.ref_video_audio_0` (via `VHS_LoadAudio`) on `MiniMaxH3ReferenceToVideo`. Update `SimpleVideoStudio` with dedicated Director Panel cells, Composer top media chips with removal buttons, and bottom quick-action pills.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Vercel Blob, ComfyUI (`MiniMaxH3ReferenceToVideo`, `VHS_LoadVideo`, `VHS_LoadAudio`), Node built-in test runner (`node:test` + `node:assert/strict`).

**Spec:** `docs/superpowers/specs/2026-11-11-simple-video-ref-video-audio-design.md`

## Global Constraints

- Never break existing text-only or image-only workflows; all media attachments remain strictly optional.
- Keep video uploads constrained to `.mp4, .mov, .webm` (duration ≤ 15s, size ≤ 50MB) and audio to `.mp3, .wav, .m4a` (size ≤ 50MB).
- All image/video generation continues using existing conventions; non-talking-head clips route to Vast.ai ComfyUI `ref2va` when Comfy endpoint is configured.
- When `refAudioUrl` is provided, do not force external TTS synthesis over it.

## Review Focus

1. Uploading video without audio: `VHS_LoadVideo` loads motion frames; `ref_video_audios.ref_video_audio_0` uses video's audio or is omitted cleanly without ComfyUI execution failure.
2. Uploading standalone audio without video: `VHS_LoadAudio` connects to `ref_video_audios.ref_video_audio_0` while `ref_videos.ref_video_0` is cleanly omitted from `MiniMaxH3ReferenceToVideo`.
3. Removing an attached video/audio chip via `✕`: UI clears the state immediately, unchecks the bottom pill, and does not submit URLs to the backend.
4. Duration validation (>15s video): UI warns user and rejects submission or alerts before proceeding.
5. Missing ComfyUI endpoint fallback: returns clean descriptive error instead of unhandled crash.

---

### Task 1: Data Model & Media Upload Server Action

**Files:**
- Modify: `src/model/project.ts`
- Create: `src/presentation/actions/simple-media.ts`
- Test: `src/service/project/simple-media.test.ts`

**Interfaces:**
- Produces:
  - `uploadSimpleMediaAction(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }>`
  - `Project.referenceVideoUrl?: string`
  - `Project.referenceAudioUrl?: string`
  - `VideoClip.referenceVideoUrl?: string`
  - `VideoClip.referenceAudioUrl?: string`

- [ ] **Step 1: Write failing test for simple media upload validation**

```typescript
// src/service/project/simple-media.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateSimpleMediaFile } from "@/service/project/simple-media-validation";

test("validateSimpleMediaFile validates video and audio MIME types and size constraints", () => {
  assert.equal(validateSimpleMediaFile({ type: "video/mp4", size: 10 * 1024 * 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "audio/mpeg", size: 5 * 1024 * 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "audio/wav", size: 5 * 1024 * 1024 }).ok, true);
  assert.equal(validateSimpleMediaFile({ type: "image/png", size: 1024 }).ok, false);
  assert.equal(validateSimpleMediaFile({ type: "video/mp4", size: 60 * 1024 * 1024 }).ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/project/simple-media.test.ts`
Expected: FAIL with "Cannot find module '@/service/project/simple-media-validation'"

- [ ] **Step 3: Implement validation and models**

- Add `referenceVideoUrl?: string;` and `referenceAudioUrl?: string;` to `Project` and `VideoClip` in `src/model/project.ts`.
- Create `src/service/project/simple-media-validation.ts` with `validateSimpleMediaFile`.
- Create `src/presentation/actions/simple-media.ts` implementing `uploadSimpleMediaAction(formData: FormData)` using `@vercel/blob` put under `explainer/simple-media/${Date.now()}-${file.name}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/project/simple-media.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/project.ts src/service/project/simple-media-validation.ts src/service/project/simple-media.test.ts src/presentation/actions/simple-media.ts
git commit -m "feat(simple): add media validation, models, and uploadSimpleMediaAction"
```

---

### Task 2: Service Action Persistence (`createSimpleVideoAction`)

**Files:**
- Modify: `src/service/project/actions.ts:1337-1475`
- Test: `src/service/project/actions.test.ts`

**Interfaces:**
- Consumes: `createSimpleVideoAction(input)` from Task 1
- Produces: `createSimpleVideoAction` accepting optional `refVideoUrl?: string` and `refAudioUrl?: string` and persisting to `videosCollection`

- [ ] **Step 1: Write failing test for `createSimpleVideoAction` media persistence**

```typescript
// src/service/project/actions.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSimpleVideoClipDraft } from "@/service/project/actions";

test("buildSimpleVideoClipDraft preserves referenceVideoUrl and referenceAudioUrl on clip and project payload", () => {
  const result = buildSimpleVideoClipDraft({
    prompt: "Camera tracking shot",
    refVideoUrl: "https://blob.example.com/ref.mp4",
    refAudioUrl: "https://blob.example.com/ref.mp3",
    durationSeconds: 6,
  });
  assert.equal(result.clip.referenceVideoUrl, "https://blob.example.com/ref.mp4");
  assert.equal(result.clip.referenceAudioUrl, "https://blob.example.com/ref.mp3");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/project/actions.test.ts`
Expected: FAIL with "buildSimpleVideoClipDraft is not exported or does not preserve media URLs"

- [ ] **Step 3: Update `createSimpleVideoAction` in `src/service/project/actions.ts`**

- Extract helper `buildSimpleVideoClipDraft` (or update input interface of `createSimpleVideoAction`).
- Accept `refVideoUrl?: string` and `refAudioUrl?: string`.
- Save `referenceVideoUrl` and `referenceAudioUrl` on `video` document and `video.phaseA.clips[0]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/project/actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/project/actions.ts src/service/project/actions.test.ts
git commit -m "feat(simple): persist refVideoUrl and refAudioUrl in createSimpleVideoAction"
```

---

### Task 3: ComfyUI Graph Wiring (`MiniMaxH3ReferenceToVideo`)

**Files:**
- Modify: `src/service/comfy/submit-clip-video.ts`
- Modify: `src/service/higgsfield/generate.ts`
- Test: `src/service/comfy/submit-clip-video.test.ts`

**Interfaces:**
- Consumes:
  - `buildComfyRef2VaLatentGuideGraph`
  - `submitComfyStoryboardClipVideo`
- Produces:
  - `buildComfyRef2VaLatentGuideGraph({ ..., videoName?: string | null, audioName?: string | null })`
  - Dynamic wiring of Node 5 (`VHS_LoadVideo`), Node 32 (`ImageScaleToMaxDimension`), and Node 74 (`VHS_LoadAudio`) into Node 30 (`MiniMaxH3ReferenceToVideo`)

- [ ] **Step 1: Write failing test in `src/service/comfy/submit-clip-video.test.ts`**

```typescript
test("buildComfyRef2VaLatentGuideGraph connects ref_videos and ref_video_audios when videoName and audioName are provided", () => {
  const graph = buildComfyRef2VaLatentGuideGraph({
    runId: "test_run",
    aspectRatio: "9:16",
    durationSeconds: 6,
    prompt: "Camera moves through street",
    startName: "start.jpg",
    videoName: "motion.mp4",
    audioName: "speech.mp3",
  });

  assert.equal(graph["5"]?.class_type, "VHS_LoadVideo");
  assert.equal(graph["5"]?.inputs?.video, "motion.mp4");
  assert.deepEqual(graph["30"]?.inputs?.["ref_videos.ref_video_0"], ["32", 0]);

  assert.equal(graph["74"]?.class_type, "VHS_LoadAudio");
  assert.equal(graph["74"]?.inputs?.audio, "speech.mp3");
  assert.deepEqual(graph["30"]?.inputs?.["ref_video_audios.ref_video_audio_0"], ["74", 0]);
});

test("buildComfyRef2VaLatentGuideGraph removes video and audio loader nodes when videoName and audioName are omitted", () => {
  const graph = buildComfyRef2VaLatentGuideGraph({
    runId: "test_run_empty",
    aspectRatio: "9:16",
    durationSeconds: 6,
    prompt: "Camera moves through street",
    startName: "start.jpg",
  });

  assert.equal(graph["5"], undefined);
  assert.equal(graph["30"]?.inputs?.["ref_videos.ref_video_0"], undefined);
  assert.equal(graph["30"]?.inputs?.["ref_video_audios.ref_video_audio_0"], undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/comfy/submit-clip-video.test.ts`
Expected: FAIL with missing inputs or assertions

- [ ] **Step 3: Implement dynamic video/audio graph wiring in `src/service/comfy/submit-clip-video.ts`**

- In `buildComfyRef2VaLatentGuideGraph`:
  - When `videoName` is provided: keep Node 5 and Node 32; assign `graph["5"].inputs.video = videoName`; wire `graph["30"].inputs["ref_videos.ref_video_0"] = ["32", 0]`.
  - When `audioName` is provided: inject Node 74 (`class_type: "VHS_LoadAudio"`, `inputs: { audio: audioName }`); wire `graph["30"].inputs["ref_video_audios.ref_video_audio_0"] = ["74", 0]`.
  - When absent: delete Node 5, Node 6, Node 32, and delete the respective input keys on Node 30.
- In `submitComfyStoryboardClipVideo`:
  - Accept `referenceVideoUrl?: string` and `referenceAudioUrl?: string`.
  - Fetch and upload assets via `uploadComfyAsset` when provided.
- In `src/service/higgsfield/generate.ts`: forward `referenceVideoUrl` and `referenceAudioUrl` from `SubmitClipVideoInput` to `submitComfyStoryboardClipVideo`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/comfy/submit-clip-video.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/comfy/submit-clip-video.ts src/service/comfy/submit-clip-video.test.ts src/service/higgsfield/generate.ts
git commit -m "feat(comfy): wire ref_videos and ref_video_audios into H3 ref2va graph"
```

---

### Task 4: UI Implementation in `SimpleVideoStudio`

**Files:**
- Modify: `src/presentation/components/app/simple/simple-video-studio.tsx`
- Test: Manual browser preview & ESLint / Typecheck

**Interfaces:**
- Consumes:
  - `uploadSimpleMediaAction` from Task 1
  - `createSimpleVideoAction` from Task 2
- Produces:
  - Director Panel cells for `Ref Video` and `Ref Audio`
  - Composer Top Media chips for attached video & audio with `✕` removal buttons
  - Composer Bottom pills for `Ref Video` and `Ref Audio` with checkmark indicators
  - Client-side duration (<15s) and file size (<50MB) validations

- [ ] **Step 1: Add state, refs, and upload handlers in `simple-video-studio.tsx`**

- Add states:
  - `refVideoUrl`, `setRefVideoUrl` (string)
  - `refAudioUrl`, `setRefAudioUrl` (string)
  - `uploadingSlot`: extend to `"first" | "last" | "ref" | "video" | "audio" | null`
- Add file inputs:
  - `<input ref={refVideoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" ... />`
  - `<input ref={refAudioInputRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/m4a" ... />`
- Implement `handleUploadMedia(e, slot)` with client-side checks (video duration ≤ 15s via `HTMLVideoElement.duration`, file size ≤ 50MB) and call `uploadSimpleMediaAction(form)`.

- [ ] **Step 2: Add Director Panel Stepper Cells**

- After Cell 3 (`Scene / Reference`):
  - Add `DirectorDockDivider`
  - Add Cell 4 (`Ref Video`):
    - Video camera icon
    - Label: `Ref Video` / `動態參考片`
    - Value: `Attached (Click to change)` or `Optional (Upload Motion Ref)`
    - Click: triggers `refVideoInputRef.current?.click()`
  - Add `DirectorDockDivider`
  - Add Cell 5 (`Ref Audio`):
    - Audio waveform icon
    - Label: `Ref Audio` / `語音／音效`
    - Value: `Attached (Click to change)` or `Optional (Upload Audio)`
    - Click: triggers `refAudioInputRef.current?.click()`

- [ ] **Step 3: Add Composer Chips and Bottom Pills**

- In `DirectorDockComposer.topMediaSlot`:
  - Render chip for `refVideoUrl` with video icon, `Ref Video`, and `✕` button to clear.
  - Render chip for `refAudioUrl` with audio icon, `Ref Audio`, and `✕` button to clear.
- In `DirectorDockComposer.pills`:
  - Add `DirectorDockPill` for `Ref Video` (label shows `Ref Video ✓` when attached).
  - Add `DirectorDockPill` for `Ref Audio` (label shows `Ref Audio ✓` when attached).
- In `handleSubmit`:
  - Forward `...(refVideoUrl ? { refVideoUrl } : {})` and `...(refAudioUrl ? { refAudioUrl } : {})` to `createSimpleVideoAction`.

- [ ] **Step 4: Run typecheck and linter**

Run: `npx tsc --noEmit && npx eslint src/presentation/components/app/simple/simple-video-studio.tsx`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/app/simple/simple-video-studio.tsx
git commit -m "feat(ui): add Ref Video and Ref Audio cells and pills to SimpleVideoStudio"
```

---

### Task 5: Full Verification & Integration Verification

**Files:**
- Test: All test suites and linting

- [ ] **Step 1: Run all unit tests**

Run: `npx tsx --test 'src/service/project/simple-media.test.ts' 'src/service/project/actions.test.ts' 'src/service/comfy/submit-clip-video.test.ts'`
Expected: All tests pass.

- [ ] **Step 2: Run full project typecheck**

Run: `npx tsc --noEmit`
Expected: 0 type errors.

- [ ] **Step 3: Run targeted lint check**

Run: `npx eslint src/service/comfy/submit-clip-video.ts src/presentation/components/app/simple/simple-video-studio.tsx src/presentation/actions/simple-media.ts`
Expected: 0 lint errors.

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore(simple): verify ref video and ref audio end-to-end integration"
```
