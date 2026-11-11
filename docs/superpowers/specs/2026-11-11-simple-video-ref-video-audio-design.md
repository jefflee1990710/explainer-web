# Simple Video Creation Form: Ref Video & Ref Audio Support Design

**Date:** 2026-11-11  
**Status:** In Review  
**Context:** MiniMax H3 `ref2va` (Reference-to-Video & Audio) multi-modal conditioning in `SimpleVideoStudio` (`/app/simple`).

---

## 1. Intent & The "Why"

Currently, the `SimpleVideoStudio` creation dock allows users to attach `First Frame` (start keyframe), `Last Frame` (end keyframe), and `Scene / Reference` (0–4 static images).

MiniMax H3 `ref2va` natively supports full multi-modal conditioning:
- `ref_videos.ref_video_0` (`reference_video`): Motion & camera trajectory reference (e.g. motion masks, dynamic footage, camera movement).
- `ref_video_audios.ref_video_audio_0` (`reference_audio`): Speech lip-sync synchronization and background audio soundscape.

By exposing `Ref Video` and `Ref Audio` in the Simple Video creation dock, creators can directly guide camera motion, character movements, and audio lip-sync without relying exclusively on text prompts.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Director Panel Cells**: Add dedicated `Ref Video` and `Ref Audio` stepper cells inside `DirectorDockPanel` in `SimpleVideoStudio`.
- **Media Upload**: Allow uploading `.mp4` / `.mov` / `.webm` (max 15s duration, max 50MB) and `.mp3` / `.wav` / `.m4a` (max 50MB) directly to Vercel Blob.
- **Composer Integration**:
  - Show attached chips in `DirectorDockComposer.topMediaSlot` with a remove (`✕`) button and preview badge.
  - Add quick action pills (`Ref Video` and `Ref Audio`) in the composer bottom bar, showing a checkmark (`✓`) when attached.
- **Backend & ComfyUI ref2va Pipeline**:
  - Pass `referenceVideoUrl` and `referenceAudioUrl` through `createSimpleVideoAction` into `Project` and `StoryboardRow` / `VideoClip`.
  - In `buildComfyRef2VaLatentGuideGraph` and `submitComfyStoryboardClipVideo`:
    - When `referenceVideoUrl` is present: upload the video to ComfyUI, link to `VHS_LoadVideo` (Node 5) scaled via Node 32 into `ref_videos.ref_video_0` on `MiniMaxH3ReferenceToVideo` (Node 30).
    - When `referenceAudioUrl` is present: upload the audio to ComfyUI, link to `ref_video_audios.ref_video_audio_0` on Node 30.
    - When absent: clean up unused video/audio input slots as before.

### Non-Goals
- Real-time client-side video trimming or video re-encoding (the user uploads their intended clip; validation checks file size and duration).
- Multi-video reference chaining in a single shot (H3 accepts 1 motion reference video and 1 audio track per shot).

### Anti-Goals
- Never break existing text-only or image-only workflows. All media attachments remain strictly optional.
- Never force external ElevenLabs TTS synthesis when a user has provided a custom `refAudioUrl`.

---

## 3. Approaches Considered

1. **Option 1 (Chosen): Dedicated Cells in Director Panel + Composer Pills & Chips**
   - Direct and visible: `Ref Video` and `Ref Audio` sit as peer cells in `DirectorDockPanel` alongside First Frame, Last Frame, and Scene/Reference.
   - Composer pills provide instant access; top chips provide clear visual feedback and removal.
   - Matches the user's selected preference.

2. **Option 2: Unified "Media Reference" Dropdown / Modal**
   - Consolidates images, video, and audio under one button to conserve horizontal space.
   - *Tradeoff:* Adds extra clicks, hides capabilities, and obscures attached video/audio status at a glance.

3. **Option 3: Bottom Composer Pills Only (No Director Panel Cells)**
   - Leaves Director Panel untouched and only puts uploads in the bottom dock.
   - *Tradeoff:* Breaks layout consistency with First Frame / Last Frame, which exist in both the Director Panel and bottom dock.

---

## 4. Detailed Specification

### 4.1 Frontend UI (`SimpleVideoStudio`)

#### Director Panel
- **Ref Video Cell (`DirectorDockStepperCell`)**:
  - Icon: Film camera / video camera svg.
  - Label: `Ref Video` (en) / `參考影片` (zh-Hant).
  - Value:
    - Uploading: `Uploading...` / `上傳中...`
    - Attached: `Attached (Click to change)` / `已附加（點擊更換）`
    - Empty: `Optional (Upload Motion Ref)` / `選填（點擊上傳動態參考）`
  - Input: Accepts `video/mp4,video/quicktime,video/webm`.
  - Client validation: Warns if file duration exceeds 15 seconds or file size exceeds 50MB.

- **Ref Audio Cell (`DirectorDockStepperCell`)**:
  - Icon: Waveform / headphones svg.
  - Label: `Ref Audio` (en) / `參考音訊` (zh-Hant).
  - Value:
    - Uploading: `Uploading...` / `上傳中...`
    - Attached: `Attached (Click to change)` / `已附加（點擊更換）`
    - Empty: `Optional (Upload Audio / Speech)` / `選填（點擊上傳語音／音效）`
  - Input: Accepts `audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/m4a`.
  - Client validation: Warns if file size exceeds 50MB.

#### Composer Top Media Preview (`DirectorDockComposer.topMediaSlot`)
- If `referenceVideoUrl` is present:
  - Chip with video icon, `Ref Video` / `參考影片` badge, and `✕` remove button.
- If `referenceAudioUrl` is present:
  - Chip with audio icon, `Ref Audio` / `參考音訊` badge, and `✕` remove button.

#### Composer Bottom Pills
- Add `Ref Video` and `Ref Audio` pills after `Reference`:
  - When attached: displays green checkmark `Ref Video ✓` / `參考影片 ✓`.
  - When empty: displays `Ref Video` / `參考影片`.

---

### 4.2 Server Actions & Media Upload

- **Upload Action (`uploadSimpleMediaAction`)**:
  - Accepts `FormData` with `file: File` (`video/*` or `audio/*`).
  - Validates authenticated user via `requireAppUser()`.
  - Uploads to Vercel Blob under `explainer/simple-media/${Date.now()}-${file.name}`.
  - Returns `{ ok: true, url: blob.url }` or `{ ok: false, error: string }`.

- **Creation Action (`createSimpleVideoAction`)**:
  - Accepts `refVideoUrl?: string` and `refAudioUrl?: string`.
  - Validates HTTPS URLs.
  - Stores on the generated `Project`:
    - `referenceVideoUrl?: string;`
    - `referenceAudioUrl?: string;`
  - Stores on `Project.phaseA.clips[0]`:
    - `referenceVideoUrl?: string;`
    - `referenceAudioUrl?: string;`
  - When `refAudioUrl` is provided, automatically adjusts prompt hints so mouths naturally match audio.

---

### 4.3 ComfyUI H3 `ref2va` Pipeline

In `src/service/comfy/submit-clip-video.ts`:

- **Video Reference**:
  - When `input.referenceVideoUrl` is provided:
    - Fetch video bytes and upload to ComfyUI via `uploadComfyVideo` (`POST /upload/image` with `subfolder: "input"` or upload endpoint).
    - In `extendWorkflowJson` (Node 5, `VHS_LoadVideo`): set `inputs.video = uploadedVideoFilename`.
    - Do NOT delete Nodes `5` and `32`.
    - Wire `graph["30"].inputs["ref_videos.ref_video_0"] = ["32", 0]`.
  - When absent: delete Node 5, Node 32, and delete `graph["30"].inputs["ref_videos.ref_video_0"]`.

- **Audio Reference**:
  - When `input.referenceAudioUrl` is provided:
    - Fetch audio bytes and upload to ComfyUI.
    - In `extendWorkflowJson`: set audio source or load audio into `ref_video_audios.ref_video_audio_0` on Node 30.
  - When absent: delete `graph["30"].inputs["ref_video_audios.ref_video_audio_0"]`.

---

## 5. What's Left to the Builder
- Exact SVG icons for audio and video in `DirectorDockStepperCell`.
- Exact localized strings (en / zh-Hant) in i18n dictionaries.
- Unit tests validating graph construction in `submit-clip-video.test.ts` with and without `referenceVideoUrl` / `referenceAudioUrl`.
