# Canvas Scro tools as visible node groups

Date: 2026-11-22
Status: approved in chat, pending spec review

## Goal

Dropping a Scro tool on `/app/canvas` never leaves a single black-box tool node. Like Explainer, Talking Head, Swap, Teleport, Life Photo, and Poster open a setup dialog and then land as a group of connected nodes that builds the same feature. The canvas assistant builds the same groups.

## Decisions

- Scope: all five tools in one project (approach A). Swap and Teleport keep exactly one render step node each, because the OpenJutsu Comfy workflow (SAM masks, grey mannequin, edit) runs as one unit inside Comfy.
- Talking Head follows the Explainer planner flow: plan first (free), then expand.
- Every tool opens a dialog first. Life, Poster, Swap, and Teleport expand immediately after the dialog; Talking Head shows a planning card.
- Existing single `scro:talking-head / swap / teleport / life / poster` nodes stay on old canvases and still run with the same price.

## Section 1: Nodes

### New FFmpeg nodes ($0.00, Vast worker, visible in the sidebar)

| Id | Ports | Behaviour |
|----|-------|-----------|
| `ffmpeg:color-grade` | `video` → video | `toolParams.gradeLook`: `jutsu` → `applyJutsuColorGradeBuffer` (`src/service/jutsu/color-grade.ts`); `talking-head` / `talking-head-selfie` → `gradeTalkingHeadSensorTextureBuffer` (`src/service/style/realistic-grade.ts`, `handheldSelfie` for the selfie look). |
| `ffmpeg:smooth-silence` | `video` → video | `trimClipSmoothSilence` (`src/service/voice/smooth-silence.ts`). |

Both run through the existing `canvas_ffmpeg` worker path (`src/service/canvas/ffmpeg-ops.ts`, `worker-runner.ts`).

### New hidden Scro step nodes (`hiddenInSidebar: true`)

| Id | Ports | Behaviour | Price |
|----|-------|-----------|-------|
| `scro:swap-render` | `video` (required, ≤15s), `refImages`, `prompt` → video | Reuses `startScroSwapJobForUser` with the whole input as the section (start 0, length = clip duration) and with the final colour grade skipped. Comfy for character/object when `COMFY_BASE_URL` is set; relight stays on the cloud path. `toolParams`: `swapMode` (`character` / `object` / `relight`), `characterId`, `objectEditMode`, `objectTarget`, `lightLookId`. | $0.15 + $0.10/s (same as `scro:swap`) |
| `scro:teleport-render` | `video` (required, ≤15s), `image` (scene, required), `prompt` (optional mood) → video | Reuses `startTeleportJobForUser` with the whole input as the section and the colour grade skipped. Fails with the existing message when Comfy is not configured. | $0.10/s |
| `scro:director-frame` | `prompt` → image | Generalises `scro:explainer-frame`: draws one stored still of a plan-only director video through `regenerateFrame(..., { useStoredPrompt: true })`. `toolParams`: `plannerVideoId`, `clipNumber`. `scro:explainer-frame` stays as an alias on the same implementation. | $0.15 |

`swap-render` and `teleport-render` set `skipBilling: true` on their `jutsu_jobs` / `teleport_jobs`; `canvas_jobs` charges once and refunds on failure. They poll through `pollScroAsyncJob` with the existing `jutsu` / `teleport` domain kinds.

### Reused nodes

`openrouter:bytedance-seed/seedream-5-0-pro`, `openrouter:heygen/avatar-iv`, `scro:tts`, `ffmpeg:trim-speed`, `ffmpeg:concat`, `media` (character and product blueprint URLs, uploaded videos and scene photos), and `prompt`.

`scro:tts` gains `toolParams.ttsConversational` (passed to `synthesizeSpeechWithTimestamps` as `conversational`), matching the talking-head director.

`openrouter:heygen/avatar-iv` uses the `refAudio` length (capped at 120s) as its duration for submit and billing when audio is wired.

## Section 2: Dialogs and groups

Each dialog lives in its own `"use client"` file in `src/app/app/canvas/`, styled like `explainer-plan-dialog.tsx`. Group builders are pure functions, one file per tool, in `src/service/canvas/scro-groups/`, shared by the dialogs and the canvas assistant. Groups are laid out without overlap and moved clear of existing nodes (same approach as `explainer-layout.ts`).

### Life Photo

Dialog: character (required), scene description, aspect ratio.

```
[character blueprint media] --refImages--> [Seedream 5.0 Pro]
[prompt: Candid lifestyle photograph … Scene and mood: {scene} …] --prompt--> 
```

The prompt node holds the same template `scro:life` uses today, so the user can edit it.

### Poster

Dialog: design prompt (required), character (optional), product (optional), aspect ratio.

Character and product blueprint media → Seedream ← prompt node containing `buildPostCreatePrompt({ prompt, products, hasReferenceImage })`.

### Swap

Dialog: source video (upload or pick a canvas video), mode (character / object / relight / colorfix), mode fields (character or reference image; object target, change-to, add/remove; light look), section start and length (2–15s, default 0s and 6s).

Character, object, relight:

```
[source video media] -> [ffmpeg:trim-speed section] -> [scro:swap-render] -> [ffmpeg:color-grade jutsu]
[character / reference media] --refImages--> swap-render
[prompt: custom instruction] --prompt--> swap-render
```

Colorfix: `[source video media] -> [ffmpeg:color-grade jutsu]` on the whole video, no trim.

### Teleport

Dialog: source video, scene (photo upload or text), optional mood text, section.

```
[source video] -> [trim] -> [scro:teleport-render] -> [ffmpeg:color-grade jutsu]
[scene photo media] --image--> teleport-render
[mood prompt] --prompt--> teleport-render (optional)
```

Text-only scene: the scene photo becomes `[prompt: buildTeleportScenePlatePrompt(text, aspect)] -> [Seedream]` wired into `image`.

### Talking Head

Dialog: character (required), script, language, framing (`collarbone-close` / `waist-up` / `handheld-selfie` / `full-body`), aspect ratio. Planning flow in Section 3.

## Section 3: Talking Head plan and expansion

1. The dialog places a planning card (`scro:talking-head` with `toolParams.plannerMode`), reusing the Explainer card, polling, retry, and remove behaviour.
2. The server creates a `canvasPlanOnly` `talking-head-director` video and runs Phase A only, then locks the character. No stills, voice, or charge.
3. When ready, the plan stores per clip: spoken line, the HeyGen prompt from `heyGenAvatarIvMotionPrompt(talkingHeadPoseId, { spokenScript, directorMotionNote, motionPrompt, language })`, and Clip 1's start-still prompt.
4. The client replaces the card with:

```
[director-frame: Clip 1 start] --startImage--> [HeyGen clip N] -> [ffmpeg:smooth-silence] -> [ffmpeg:color-grade talking-head] --videos--> [ffmpeg:concat]
[scro:tts clip N: spoken line, characterId, ttsConversational] --refAudio--> [HeyGen clip N]
```

- One `scro:director-frame` feeds every clip (later clips follow Clip 1's start, as in the director).
- `color-grade` uses `talking-head-selfie` when framing is `handheld-selfie`.
- No concat when there is one clip; concat chains every 8 inputs like Explainer.
- Layout in `talking-head-layout.ts`: the still on the left, one row per clip, TTS under its HeyGen node.
- No re-plan: delete the group and drop again.

## Section 4: Pricing, legacy, assistant, errors, tests, docs

Pricing stays equal to today's totals: Life and Poster $0.15; Swap $0.15 + $0.10/s; Teleport $0.10/s plus $0.15 only when a scene plate is generated; Talking Head $0.15 still + $0.18/s HeyGen + $0.02 per TTS; planning and FFmpeg nodes are free.

Legacy: existing single Scro tool nodes render and run unchanged. The sidebar entries and the starter templates open the dialogs instead of adding those nodes.

Assistant:

- New tool `add_scro_group({ tool, ...dialog fields })` builds the same groups; Talking Head adds a planning card that starts planning after the turn.
- `add_model_node` rejects the five legacy ids and points to `add_scro_group`.
- The system prompt is updated. The guard that blocks offering a talking head for explainer requests stays.

Errors:

- Dialogs validate required fields before submit.
- `swap-render` / `teleport-render` reject inputs longer than 15s and tell the user to adjust the trim node. Missing Comfy shows on the node (Teleport fails, Swap falls back to the cloud path).
- Talking Head plan failures show on the card with retry and remove.

Tests (pure functions and mocks, no paid provider calls):

- Each group builder: node count, wiring, template prompts, and branches (Swap colorfix, Teleport with and without a scene photo).
- Talking Head layout has no overlap.
- New FFmpeg ops build the right arguments.
- `swap-render` / `teleport-render` use the whole input as the section and skip the grade (mocked).
- HeyGen duration follows the audio length.
- Assistant: `add_scro_group` and the legacy id rejection.
- `npx tsc --noEmit`, `npx eslint`, and all unit tests pass.

Docs: update `pipeline-models.md` and `AGENTS.md`.

## Build order

1. `ffmpeg:color-grade` and `ffmpeg:smooth-silence`.
2. Life and Poster dialogs and groups.
3. `swap-render`, `teleport-render`, their dialogs and groups.
4. Talking Head plan, expansion, and `scro:director-frame`.
5. Canvas assistant.
6. Docs.
