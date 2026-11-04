# Unified Videos List View & OpenCut Default Editor Design

## Intent & Why
Users want `/app/videos` (`https://www.scro.io/app/videos`) to display all generated videos (Explainer & Talking Head, Scro Swap, and Teleport) in a single unified horizontal List View with pagination, and want all video generations (including standalone Scro Swap and Teleport) to open directly in the OpenCut editor by default.

## Goals
1. **Single Unified List View with Paging on `/app/videos`**:
   - Merge Studio videos (`PublicVideoCard`), Scro Swap jobs (`PublicJutsuJob`), and Teleport jobs (`PublicTeleportJob`) into a single chronological list (sorted by `createdAt` descending).
   - Provide category filter tabs (`All Videos`, `Explainer & Talking Head`, `Scro Swap`, `Teleport`) and stage filter pills (`All`, `In Progress`, `Ready to Post`, `Posted`, `Archived`, `Failed`) that filter the single unified list.
   - Render each item as a rich horizontal List View row (`VideoListRow`) displaying thumbnail preview, title, category badge, stage/status badge, specs (aspect ratio, duration, language/mode), creation timestamp, and row actions (Open in OpenCut, Download, Mark Posted, Archive/Unarchive, Delete).
   - Paginate the unified list using `VideoTablePager` (`VIDEO_PAGE_SIZE = 12`).
2. **Default Open in OpenCut Editor for All Video Generations**:
   - Standalone Scro Swap (`video` / `gif`) and Teleport jobs automatically create and link a single-clip `Project` (`videos` collection, `skillSlug: "scro-swap-director"` or `"teleport-director"`, `targetVideoId`, `targetClipNumber: 1`) when started without an existing `targetVideoId`.
   - As the engine job prepares start frames (`preparedStartFrameUrl`) and finishes rendering (`outputVideoUrl`), sync the linked `Project`'s `frames[0]` and `clips[0]` so the OpenCut editor displays live progress, poster frame, and final playable clip on the timeline.
   - Submitting a standalone Scro Swap (`video`/`gif`) or Teleport job on `/app/scroswap`, `/app/teleport`, or their create dialogs navigates immediately to `/app/videos/[targetVideoId]` (OpenCut editor).
   - Clicking any Scro Swap or Teleport video in `/app/videos` or history panels opens it in the OpenCut editor (lazily provisioning the linked `Project` via a server action if it is a legacy job without `targetVideoId`).

## Non-Goals
- Changing how in-place clip replacement works when Scro Swap or Teleport is triggered on an existing storyboard clip inside OpenCut.
- Forcing static image swaps (`sourceMediaKind === "image"`) into the video timeline editor on creation (static images stay downloadable/previewable as 2K images).

## Approaches Considered
- **Approach A (Selected)**: Provision a backing single-clip `Project` in `videos` for standalone Scro Swap and Teleport video jobs and link via `targetVideoId` + `targetClipNumber: 1`. Reuses OpenCut autosave (`opencut_edits`), subtitles, audio tools, export, and polling with zero duplication.
- **Approach B**: Create separate mock-project OpenCut routes for `JutsuJob` and `TeleportJob`. Rejected because OpenCut server actions require a real `videos._id`.
