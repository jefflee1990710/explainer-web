# Project folders (campaigns) with multiple videos

Date: 2026-09-17  
Status: draft, pending user review

## Goal

A **project** is a named folder. A user can put **many videos** in it. The dashboard grid still lists projects. Opening a project shows a split workspace: video list on the left, the existing reel form + stepper on the right.

## Decisions already made

- Each existing one-video project is **wrapped** in a folder named from the storyboard title (or「未命名專案」).
- **Skill is per video**, not per folder.
- New folder: modal on `/app` that only asks for a **name**.
- Data: two collections — `projects` (folders) + `videos` (today’s job documents).
- `generationJobs.projectId` **keeps pointing at the video id** for this change (pipeline churn stays low).
- Routes: `/app/projects/[folderId]` + `?video=` to select; empty selection or「新增影片」shows the create form.
- `/app/projects/new` is no longer a standalone create-video page.
- Skills page stays a catalog; the create form on the right includes the style picker.

## Out of scope

- Billing: remaining-credit progress UI and ad-hoc credit packs (separate request).
- Renaming `generationJobs.projectId` → `videoId`.
- Sharing, collaborators, or nested folders.

## Data model

### `projects` (folder)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Folder id in the URL |
| `userId` | ObjectId | App user |
| `clerkUserId` | string | Auth |
| `name` | string | Required, trimmed, max 80 chars |
| `createdAt` | Date | |
| `updatedAt` | Date | Bumped when a child video changes |

No stored cover image. The grid derives preview from the newest child video that has a frame / still / clip poster.

### `videos` (one explainer)

Same fields as today’s `Project` type, plus:

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId | Parent folder |
| `_id` | ObjectId | **Preserved** on migrate so jobs and blob paths stay valid |

Status, frames, clips, credits, skill, language, stepper state all live on the video.

### `generationJobs`

Unchanged shape. `projectId` means **video id**.

## Migration

One script (`scripts/migrate-project-folders.ts`), idempotent:

1. For each document in `projects` that looks like a video (`skillSlug` present, `name` absent).
2. Insert a folder with `name` = `phaseA.localizedTitle || phaseA.englishTitle ||「未命名專案」`.
3. Insert into `videos` a copy of the document with `projectId` set and the **same `_id`**.
4. Delete the original from `projects`.
5. Skip if a `videos` doc with that `_id` already exists.

Dashboard queries only folder-shaped `projects` (`name` exists). Leftover unmigrated video docs must not appear as grid cards.

## Routes

| Path | UI |
|---|---|
| `/app` | Folder grid +「新增專案」modal |
| `/app/projects/[id]` | Split workspace for that folder |
| `/app/projects/[id]?video={videoId}` | Same workspace, that video selected |
| `/app/skills` | Style catalog only |
| `/app/projects/new` | Redirect to `/app` |

Auth: folder and videos must belong to the signed-in user. Invalid id → 404.

## `/app` grid

- Cards are **folders**, not videos.
- Title = folder `name`.
- Feature image = latest child preview (same fallback chain as today’s card: clip 1 start frame → any frame → still → upload). Empty folder uses the aspect placeholder.
- Status badge = roll-up: any `failed` → failed; else any in-flight → working; else any `awaiting_approval` / `frames_ready` → action; else all `ready` → success; empty → 草稿.
- Compact stepper is **not** shown on the folder card (it describes one video). Show video count instead.
- Filters: apply to folder roll-up status. Keyword search matches folder name **and** child video titles / source.
- Retry on a failed folder card is **not** offered; retry stays on the video inside the workspace.

## Workspace (`/app/projects/[id]`)

Layout: two columns from `md` up; on small screens list above, pane below.

**Header:** folder name (inline rename), video count, back to `/app`.

**Left: video list**

- Newest first.
- Each row: preview thumb, title (`phaseA.localizedTitle` or「未命名影片」), `StatusBadge`.
- In-flight rows poll with the existing project poller (now per video).
-「新增影片」button: clear `?video=`, show create form.
- Selecting a row sets `?video=id`.

**Right: existing flow**

- No selection / 新增影片: today’s create form **plus** a style picker (list skills). Submit creates a `videos` row with this `projectId` and starts Phase A. Then select that video and continue stepper in place (no navigation away).
- Selected video: same client flow as `NewProjectForm` / project page — storyboard, frames timeline, generation, player, retry. Stepper on top of the right pane.
- Failed video: keep the retry card; stay in the folder.

## Create folder modal

- Fields: name only.
- Submit: insert `projects` row, `router.push(/app/projects/{id})` with empty list + create form.

## Credits and jobs

- Charges, refunds, and Higgsfield jobs stay attached to the **video**.
- Blob paths stay `explainer/{videoId}/…`.
- Polling: workspace polls the selected video; left list refreshes statuses for in-flight siblings at a slower interval.

## Files likely to change (implementation, not this spec)

- New types: folder `Project`, rename today’s type to `Video`.
- Collections: `videosCollection()`, keep `projectsCollection()` for folders.
- Serialize: `PublicProject` (folder) + `PublicVideo`.
- Actions: `createProjectAction` (name only), `createVideoAction` (current create), existing approve/retry take video id.
- UI: `project-grid` for folders; new `project-workspace`, `video-list`, reuse form/stepper.
- Seed/migrate script.

## Success criteria

- `/app` shows named folders; empty folders are allowed.
- A folder can contain 0..n videos in mixed statuses.
- Creating a video does not leave the folder page.
- Migrated users see one folder per old video, content intact, jobs still complete.
- Style can differ between videos in the same folder.
