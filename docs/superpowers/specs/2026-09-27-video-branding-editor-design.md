# Video tab: branding layers and reusable templates

Date: 2026-09-27  
Status: approved in chat, pending spec review

## Goal

The editor's second tab becomes a light branding editor. A user adds
logo or image layers over the finished reel plus an optional intro and
outro, exports one final MP4, and saves the setup as a template to
reuse on the next generated video.

## Decisions already made

- **Scope: branding pack.** Image layers (logo or any picture) sit over
  the whole main reel. Plus one intro and one outro, each an uploaded
  video or image. No per-layer timing, no text layers, no transitions,
  no multi-track timeline.
- **Tab rename.** The `Reel` step is labelled **Video** in every
  locale. The Video tab does not render the bottom filmstrip.
- **Templates are applied by hand.** The Video tab lists the user's
  templates; picking one copies it onto this video. No default
  template and no folder binding.
- **Templates are ratio-agnostic.** Layers are stored as anchor +
  margin % + width %. Intro and outro media are scaled and cropped to
  fill the video's frame. One template works on 9:16 and 16:9.
- **Copy, not link.** A video keeps its own copy of the edit. Editing
  it never changes the template. Overwriting a template never changes
  videos that applied it earlier.
- **Preview in the browser, render on the server.** The preview is the
  existing reel `<video>` with DOM overlays. Output is produced by the
  existing server `ffmpeg` pipeline, extended with overlay and
  intro/outro concat.
- **Export is free.** No credits are charged for the final render.

## Data model

New collection `videoTemplates`, accessed as
`db.collection<VideoTemplate>('videoTemplates')`.

```ts
type BrandAnchor = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

type BrandLayer = {
  id: string;
  kind: "image";
  assetUrl: string;   // Vercel Blob
  anchor: BrandAnchor;
  marginPct: number;  // gap to the anchored edges, % of the short side, 0–20
  widthPct: number;   // layer width, % of frame width, 2–100
  opacity: number;    // 0–1
};

type BookendClip = {
  kind: "video" | "image";
  assetUrl: string;
  durationSec: number; // images only, 1–10, default 2; videos use their own length
};

type VideoEdit = {
  layers: BrandLayer[]; // array order = stacking order, last on top
  intro?: BookendClip;
  outro?: BookendClip;
};

type VideoTemplate = VideoEdit & {
  _id: ObjectId;
  clerkUserId: string;
  name: string;       // trimmed, 1–60 chars, unique per user
  createdAt: Date;
  updatedAt: Date;
};
```

New optional fields on the video document:

| Field | Meaning |
|---|---|
| `edit` | This video's own `VideoEdit` copy. |
| `editTemplateId` | Template last applied to or saved from this video. |
| `finalUrl` | Blob URL of the branded MP4. |
| `finalStatus` | `queued` / `in_progress` / `completed` / `failed`. |
| `finalFingerprint` | Fingerprint the final file was rendered from. |
| `finalError` | User-facing error for a failed render. |

The existing `reel*` fields are unchanged. The plain reel stays
available as its own file.

## Template rules

1. **Apply.** Copy the template's `layers`, `intro`, `outro` into
   `video.edit` and set `editTemplateId`. Later edits touch only the
   video.
2. **Save as new.** Prompt for a name, insert a template from the
   current `edit`, set `editTemplateId` to it.
3. **Update template.** Shown only when `editTemplateId` exists and
   `isEditDirty(edit, template)` is true. A confirm dialog reads
   「會覆寫〈名稱〉，之前套用過的影片不會變。」. Overwrites `layers`,
   `intro`, `outro`, `updatedAt`.
4. **Rename / delete** from the template list. Deleting a template
   leaves every video's `edit` copy intact; `editTemplateId` pointing
   at a missing template hides the update button.
5. A user only sees and changes their own templates.

## Fingerprint

`finalFingerprint = clipReelFingerprint(video) + ":" + hash(edit)`,
where `hash` is a stable hash of the edit with keys in fixed order.
The final file is current when `finalStatus === "completed"` and the
stored fingerprint matches. A clip redo or any edit change makes it
stale.

## Video tab UI

Three columns, reusing `StudioFrame` without the `timeline` slot.

- **Left: layers panel.**
  - Template picker + 「套用」.
  - Layer list: add image layer, reorder, delete, select.
  - Intro and outro slots: upload, replace, remove.
  - 「儲存為新樣板」 and, when rule 3 applies, 「更新樣板〈名稱〉」.
- **Centre: preview.** The current reel plays with each image layer
  drawn as an absolutely positioned `<img>` using `layerBox`. The
  selected layer can be dragged and resized; dragging snaps to the
  nearest anchor and stores margin and width as percentages. Intro
  and outro show as small cards before and after the player; clicking
  one previews it.
- **Right: properties** of the selected item: anchor, margin %,
  width %, opacity; image duration for intro/outro.
- **Actions.** 「匯出影片」 renders the final MP4. When it is
  current, 「下載」 downloads it. When the edit changed after export,
  the download is labelled 「下載（舊版）」 with a re-export prompt.
  Without any edit, the plain reel download stays available.

Edits save to `video.edit` through a debounced server action so a
reload keeps them.

## Server actions

All are server functions, no REST routes.

- `updateVideoEditAction(videoId, edit)`: validate with zod and store.
- `uploadBrandAssetAction(formData)`: check MIME (png, jpg, webp,
  mp4, mov) and size (image ≤ 5 MB, video ≤ 50 MB), store in Blob,
  return the URL. Raise `serverActions.bodySizeLimit` to fit.
- `listTemplatesAction()`, `applyTemplateAction(videoId, templateId)`,
  `saveTemplateAction(videoId, name)`,
  `overwriteTemplateAction(videoId, templateId)`,
  `renameTemplateAction(templateId, name)`,
  `deleteTemplateAction(templateId)`.
- `exportFinalVideoAction(videoId)`: if the reel is not current, run
  the existing reel compose first. Set `finalStatus: "queued"` with
  the new fingerprint and run `runFinalJob` in `after()`. Idempotent
  for a fingerprint that is already queued, running, or current.

## Render pipeline

`runFinalJob(videoId, fingerprint)` mirrors `runReelJob`:

1. Download the reel and every asset.
2. **Normalize bookends** to the reel's width, height, fps, and audio
   layout. Images use `-loop 1 -t durationSec` with a silent audio
   track. Both use `scale` + `crop` to cover the frame.
3. **Overlay layers** on the main reel only. For each layer,
   `layerBox(layer, w, h)` gives pixel `{x, y, w}`; opacity uses
   `format=rgba,colorchannelmixer=aa=<opacity>`.
4. **Concat** intro, branded main, outro with the existing edge-fade
   concat.
5. Upload to `explainer/{videoId}/final-{fingerprint short hash}.mp4`,
   then write `finalUrl`, `finalStatus: "completed"`, and
   `finalFingerprint`, only if the stored fingerprint still matches.

Pure helpers live beside the reel code and are shared by preview and
render:

- `layerBox(layer, frameW, frameH)` → `{ x, y, w }`.
- `buildFinalFilter(input)` → the `filter_complex` string.
- `finalFingerprint(video)` and `isEditDirty(edit, template)`.

## Errors

- A missing asset, an unsupported format, or an `ffmpeg` failure sets
  `finalStatus: "failed"` with a readable Chinese `finalError` and
  shows 「重新匯出」. The plain reel is untouched.
- Upload over the limit or with a bad type is rejected before Blob
  storage with a message naming the limit.
- Template name blank or duplicate for the user is rejected.
- Acting on another user's video or template returns 「找不到」.

## Testing

`node:test` via `npx tsx --test`:

- `layerBox` for all five anchors on 1080×1920 and 1920×1080.
- `finalFingerprint` changes for layer, intro, outro, or clip changes,
  and is stable for an identical edit.
- `buildFinalFilter` for: layers only, intro only, intro + outro,
  several layers, no layers with bookends.
- `isEditDirty` for identical, reordered, and changed edits.
- A local `ffmpeg-static` smoke test: small PNG layer, 2 s image
  intro, short clip; output duration ≈ intro + clip.

## Out of scope

Per-layer timing, text layers, transition choice, animated logos,
auto-applied or folder default templates, and syncing template edits
back to videos that already applied them.
