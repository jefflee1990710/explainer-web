# Talking-head subtitle overlay

Date: 2026-10-12
Status: approved

## Goal

For Talking-head read and Full body Talking-head read, when the visual style is Cinematic realistic, the person clip is generated with no writing in the frame. Each clip gets a separate subtitle image from the selected Text Style. That image is keyed to a transparent background and composited onto the clip as the subtitle.

Every other director, and these two directors on any other visual style, keep painting the spoken line into the stills.

## Decisions already made

- The gate is both conditions: `isTalkingHeadSkill(skillSlug)` and Cinematic realistic. That skill check covers `talking-head-director` and `full-body-talking-head-director`. A custom director fork is included because the video stores the template slug via `behaviorSlug`.
- Cinematic realistic means the catalog style id `realistic`, or a user style whose `baseStyleId` is `realistic`. A style that was only renamed to "Cinematic realistic" does not qualify. A fork of Cinematic realistic still qualifies after the user renames it.
- Cartoon explainer on Cinematic realistic is unchanged. `usesSteadyStills` stays limited to that skill.
- The provider video file stays free of burned-in text. The subtitle is a PNG overlay.
- One subtitle image per clip. The line does not change inside the clip. Start and end stills do not each paint a subtitle.
- The spoken line stays in the motion prompt so the mouth can lip-sync. That line is speech direction, not on-screen text.
- Clip splitting stays as it is. A short line is still one clip.
- Existing videos with no `subtitleOverlay` flag keep the current painted-subtitle path. There is no migration.
- Image calls in tests are prompt snapshots and pure functions. No live Higgsfield submit.

## Out of scope

- Painting subtitles into stills for cartoon, listicle, whiteboard, surprise, outfit, or any non-cinematic talking-head video.
- Changing brand-logo layers. Those still cover the whole reel for the whole duration.
- Changing where the subtitle sits relative to today: 9:16 a little below center, 16:9 along the bottom.
- Generating a transparent PNG from the image model. The model paints on a flat key color. Alpha is made locally.
- Re-rendering already finished cinematic talking-head clips. They keep the text the model painted until the user regenerates them under this flag.

## Gate

`usesTalkingHeadSubtitleOverlay` in `src/service/director/subtitle-plate.ts`:

```ts
usesTalkingHeadSubtitleOverlay(input: {
  skillSlug?: string;
  styleId?: string;
  baseStyleId?: string;
}): boolean
```

True when `isTalkingHeadSkill(input.skillSlug)` and (`styleId === "realistic"` or `baseStyleId === "realistic"`).

`loadRenderableStyle` today returns a user style id as a hex string and drops `baseStyleId`. The gate call site loads `baseStyleId` from the user style doc when `styleId` is not a catalog id. Catalog `realistic` passes `styleId: "realistic"` and no `baseStyleId`.

Phase A stores the result on the video as `subtitleOverlay?: boolean` in the same write as the storyboard. `runPhaseAJob` already loads the renderable style. When `styleId` is a user style, that load also reads `baseStyleId` from the user style doc.

Talking-head storyboard rows are not the model’s scenes. `planTalkingHeadClips` replaces them. That function, and `append-clip` when it plans one more row, take the flag and omit on-screen subtitle sentences when it is true. A later Phase A run writes the flag again from the style at that moment. Frame, plate, and reel jobs read the stored flag. They do not re-check the style. Scene-image enqueue reads the flag to decide the plate charge. A video that already has the flag unset stays on the painted-subtitle path.

## Person stills and video prompts

When `subtitleOverlay` is true:

- `talkingHeadDirectorBlock` matches the stored rows: no letters, no subtitle, no caption, no logo, and no writing. It does not call `talkingSubtitleRule`. The stored `startScene`, `endScene`, and `motionCamera` still come from `planTalkingHeadClips`.
- `shotLine` and `withThisClipSubtitle` do not append `subtitleSentence`. Clip 2+ still copies the previous pose and set. The voice line for that clip stays in `motionCamera` and `englishVo`.
- `talkingMotionLine` drops the subtitle fade-in, hold, and fade-out. It keeps the spoken line, the face, the hands, and the locked camera.
- `buildFramePrompt` does not attach `textStyleImageUrl`, does not add the Look line, and does not add the "paint the subtitle" final check. It strips a trailing `Subtitle:` or `字幕：` sentence if one is still in the scene. The final check is: no letters, no subtitle, no caption bar, no watermark.
- `speakOnlyThisClip` stays for old motion text that still says the subtitle changes from one line to another. New overlay plans do not emit that sentence.

When `subtitleOverlay` is absent or false, those functions keep today's wording.

## Subtitle plate

A new generation kind `subtitlePlate`. One job per storyboard clip. It uses the same image route as scene frames (`imageRouteForSceneText` from the video language). It does not wait for the person stills or the clip video.

The prompt asks for the lettering graphic only:

- The only words are this clip's spoken line. Cantonese uses `toWrittenChinese`. Spell them exactly.
- Appearance comes from the selected Text Style. A system look uses `subtitleLookLine`. A custom style uses its `lookLine`, and the sample image is attached with `textStyleSampleLookLine`. The sample is a lettering reference. The prompt says not to copy the words in the sample.
- Any paper strip, sticker, or stroke that belongs to the Look is part of the graphic.
- The Look's usual full-bleed field (black board, cream paper, green board) is not painted. The area outside the graphic is flat `#FF00FF`. No pixel of the letters, paper, sticker, or shadow may be `#FF00FF`.
- No person, no room, no logo, no second line.

After the provider image is stored, a local step writes a PNG with alpha. A pixel becomes transparent when its red and blue channels are each at least 215 and its green channel is at most 40. The keyed PNG is what later steps read. The opaque provider file is not the overlay.

If fewer than 1% of pixels stay opaque, the plate is failed. The error shown to the user is `字幕圖沒有留下可疊上的字`. The charge for that plate is refunded. The person stills and the clip video are left as they are.

## Credits and queue

Each plate costs `FRAME_COST` (4). `planGenerateAllScenes` adds `FRAME_COST` times the clip count only when the stored `subtitleOverlay` flag is true. The spend is the scene-image spend plus the plate spend, in the same credit call as today's frame enqueue. A failed enqueue refunds the whole spend, matching `enqueueSceneImagesForNewVideo`.

A single plate retry charges `FRAME_COST` again and refunds it on failure.

Plate failure does not fail the stills or the video. The reel does not start until every plate on a `subtitleOverlay` video is `completed`.

## Data

On the video document:

```ts
subtitleOverlay?: boolean;

subtitlePlates?: Array<{
  clipNumber: number;
  status: "queued" | "in_progress" | "completed" | "failed";
  outputUrl?: string;
  blobUrl?: string; // keyed PNG
  error?: string;
  submittedAt?: string;
  creditsCharged?: number;
}>;
```

`GenerationKind` gains `"subtitlePlate"`. The job uses `projectId` and `clipIndex`. It has no `framePosition`.

## Composite

The burn is one ffmpeg filter, `buildSubtitleOverlayFilter` in `src/service/video-edit/subtitle-placement.ts`.

Users export in the browser (`renderVideoInBrowser`). `shouldQueueReel` returns false, so `runReelJob` does not run on export. The browser export downloads each keyed plate and applies the filter before clips are joined. A one-clip export with a plate does not take the raw-file shortcut. When `subtitleOverlay` is true, export does not reuse an older `reelUrl` that was joined without plates.

`runReelJob` applies the same filter when a server concat does run, including a one-clip reel. Today a one-clip server reel copies the provider URL through unchanged.

Placement lives in one module, `src/service/video-edit/subtitle-placement.ts`, and both ffmpeg and the studio preview use it.

- The plate is scaled to 78% of the frame width. Height follows the image aspect. Horizontal center.
- 9:16: the vertical center of the plate sits at 62% of the frame height.
- 16:9: the bottom of the plate sits 8% of the frame height above the bottom edge.
- Export fade: opacity fades in over the first 0.4s and fades out over the last 0.4s. Talking-head clips are at least 5s, so the two fades do not meet.

`clipReelFingerprint` appends the plate `blobUrl` (last 48 characters) for each clip when `subtitleOverlay` is true. A new plate rebuilds the reel. A video without the flag keeps the current fingerprint.

The studio clip player shows the keyed PNG over the provider video with the same placement, for the whole clip, without the 0.4s fade. The fade exists only in the exported reel.

Brand-logo export runs after this reel, so a logo stacks above the subtitle.

## Errors

| Case | Result |
|---|---|
| Plate provider failure | Plate `failed`, refund 4 credits, stills and video continue, reel waits |
| Key leaves under 1% opaque pixels | Same as provider failure, error `字幕圖沒有留下可疊上的字` |
| Reel starts while a plate is missing or failed | Reel is not queued |
| User retries one plate | New 4-credit charge, then that plate job only |
| `subtitleOverlay` unset on an old video | No plate jobs, no burn, painted subtitles stay |

## Tests

- `usesTalkingHeadSubtitleOverlay` is true for both talking-head slugs with `styleId` `realistic`, and for a hex style id whose `baseStyleId` is `realistic`. It is false for those slugs with `doodle`, false for cartoon explainer with `realistic`, and false when only the style name is "Cinematic realistic".
- Talking-head scene lines and motion lines for an overlay project contain the spoken sentence and contain no `Subtitle:` / `字幕：` / fade-in wording. The same builders without the flag still contain the subtitle sentence.
- `buildFramePrompt` for an overlay talking-head project does not include the Look line, does not list `textStyleImageUrl`, and ends with the no-letters check. A non-overlay talking-head project still includes the Look line.
- The plate prompt contains the exact spoken line, the Look line or the sample-match line, and `#FF00FF`, and does not contain a person or a room instruction.
- The key rule marks `#FF00FF` transparent and keeps a near-black letter pixel opaque.
- Placement math for 9:16 and 16:9 matches the percentages above.
- `clipReelFingerprint` changes when a plate URL changes, and stays unchanged when `subtitleOverlay` is unset.
- The reel filter string overlays one plate per clip and includes a 0.4s fade.

## Files

- `src/service/director/subtitle-plate.ts` — gate, plate prompt, key rule.
- `src/service/director/talking-head.ts` — scene lines and director block branch on the flag.
- `src/service/director/talking-performance.ts` — motion line branch on the flag.
- `src/service/higgsfield/frame-prompts.ts` — still prompt branch on the flag.
- `src/service/video-edit/subtitle-placement.ts` — shared placement.
- `src/model/generation-job.ts` — kind `subtitlePlate`.
- `src/model/project.ts` — `subtitleOverlay` and `subtitlePlates`.
- `src/service/production-plan.ts` and `src/service/clip/enqueue-scene-images.ts` — charge and enqueue plates with the first scene-image batch.
- `src/service/higgsfield/pipeline.ts` — submit and finish the plate, then key it.
- `src/service/reel/fingerprint.ts` and `src/service/director/jobs.ts` — burn, then concat, when a server reel runs.
- `src/presentation/components/app/projects/new/browser-video-export.ts` — the export users actually run. Same filter.
- Studio clip player — PNG overlay from `subtitlePlates`.
