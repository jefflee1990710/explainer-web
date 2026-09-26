# Light CapCut studio shell

Date: 2026-09-26  
Status: approved in chat, pending spec review

## Goal

Logged-in pages share one light editing-desk chrome, held in a single
module. The video editor uses a CapCut-style three-pane body plus a
bottom filmstrip. Production behavior (generate, poll, delete, export,
credits, form fields) stays as it is.

Public marketing pages and the sign-in page stay on the current warm
paper canvas.

## Decisions already made

- **Approach: Studio kit.** New UI primitives live in
  `src/presentation/studio/`. Pages keep their data and actions; they
  sit in the shell.
- **Light mode.** White panels, gray canvas, hairline dividers. The
  filmstrip keeps a teal title bar.
- **Logged-in scope.** `/app` and everything under it: projects,
  characters, billing, affiliate, MCP, new project, folder, character
  detail, and the video editor.
- **Editor covers the app rail.** Opening a video still fills the
  viewport. The editor's left column is the clip list, not the app
  nav. Closing returns to the project page with the rail visible.
- **Create is not the editor frame.** A dialog with no video yet shows
  the brief form in a studio panel. `StudioFrame` is only for an
  existing video.
- **One video track.** No text track and no audio track.
- **Playhead does not scrub.** It is a vertical mark on the left edge
  of the selected clip. It is not draggable and does not seek time.
- **Selection is one value.** The left clip list and the filmstrip both
  read and write `ClipProduction`'s existing `selectedClip`.
- **List interiors stay.** Project cards, character cards, plan cards,
  and tables keep their current inner styling. This pass changes the
  chrome around them, not every card.
- **Old layout A is superseded visually.** The per-clip production spec
  (2026-09-19) put a chip rail above one workspace card. This spec
  moves that workspace into the three panes and replaces the chip rail
  with the filmstrip. Per-clip stage, stale warnings, and credit rules
  in that spec stay.

## Module

`src/presentation/studio/` is the only place for this chrome.

| File | Responsibility |
|---|---|
| `tokens.css` | Light tokens. Imported from `globals.css`. Applied under `.studio-app`, so `:root` paper colors for the marketing site stay. |
| `studio-shell.tsx` | Logged-in frame: icon rail + top bar + main slot. |
| `studio-panel.tsx` | White content panel for list and form pages. |
| `studio-frame.tsx` | Editor slots: `media`, `preview`, `inspector`, `timeline`. |
| `studio-button.tsx` | `primary` (filled ink) and `ghost` (hairline) buttons for the editor header and inspector. |
| `media-list.tsx` | Presentational clip rows for the editor's left column. Same item shape as the filmstrip. No video fetching. |
| `filmstrip.tsx` | Presentational clip strip. No video fetching. |
| `clip-item.ts` | Shared `StudioClipItem` type used by `media-list` and `filmstrip`. |
| `format-timecode.ts` | `durationSeconds` → `HH:MM:SS:FF` with frames always `00`. |

`AppShell` becomes a thin client wrapper that renders `StudioShell`
with the existing nav items, credits, language switcher, and user
button.

## Tokens

Set on `.studio-app`:

| Token | Value | Use |
|---|---|---|
| `--studio-canvas` | `#f3f4f6` | Page background behind panels |
| `--studio-panel` | `#ffffff` | Panels, top bar, editor |
| `--studio-line` | `#e5e7eb` | Hairlines |
| `--studio-ink` | existing `--accent-ink` (`#12141c`) | Text, playhead |
| `--studio-teal` | existing `--teal` (`#14b8a6`) | Active nav, filmstrip title, selected clip stroke |
| `--studio-muted` | existing `--muted` | Secondary labels |

The warm `.studio-canvas` gradient in `globals.css` is not used inside
`.studio-app`.

## App shell

Left rail, five links, same destinations as today's header:

- 專案 `/app`
- 角色 `/app/characters`
- MCP `/app/mcp`
- 聯盟 `/app/affiliate`
- 帳單 `/app/billing`

The current route uses a teal-tinted background and teal text. At
`lg` and up the rail is 200px and shows icon plus label. Below `lg`
it is 72px and shows icons only.

Top bar: brand mark, credits, language switcher, account button.
White background, hairline along the bottom.

Main region: one `StudioPanel` that fills the remaining width and
scrolls itself. Remove the `max-w-5xl` / `max-w-7xl` centering and
the page's extra horizontal padding that assumed a narrow column.
Folder and character detail pages use the same panel; they no longer
need a separate wide-route flag for max width.

## Editor

`VideoEditorDialog` stays a full-viewport dialog (`fixed inset-0`).
Header actions stay: title, Production / 成片 switch, 下一步：成片,
syncing state, 刪除影片, 關閉. Header surface becomes studio panel +
hairline. Those header buttons use `studio-button` (`primary`
filled ink, `ghost` hairline) so the header does not
keep the lime offset-shadow pills. Labels and enabled rules stay.

Body for an existing video is `StudioFrame`:

- **Media (280px).** Clip list for this video. Each row: start-frame
  thumbnail, `Clip{n}.mp4`, duration label, stage label. Busy shows a
  spinner. Failed or stale shows on the row. Click selects the clip.
  Empty list shows 「尚未有片段」.
- **Preview (flex).** If this clip has a video, show the existing
  player. If not, show the start frame and end frame large. Clicking
  a finished frame still opens `FrameEditDialog`. Playback controls
  stay in the preview.
- **Inspector (300px).** Time range, stage, scene prompts, frame
  prompt, draw / redraw / generate-video buttons, short-credits link,
  stale copy, and the existing error string. Button labels, costs,
  and disabled rules stay; chrome uses the studio button variants.
- **Timeline (112px, horizontal scroll, not part of the column
  scroll).** One filmstrip track.

Each of the three columns scrolls on its own. The timeline stays
pinned to the bottom of the dialog.

Below `lg`, the three columns stack in one scrolling column (media,
preview, inspector). The timeline stays fixed at the bottom.

成片 step: preview plays the reel, inspector shows the existing reel
status and export content, timeline stays the same clip track.

`ClipWorkspace` is split so its current three regions feed preview
and inspector. One mapper next to `ClipTimeline` turns `ClipState`
into `StudioClipItem[]` for both `media-list` and `filmstrip`.
`FrameEditDialog` stays a dialog on top.

## Filmstrip

Each item:

- Title: `Clip{n}.mp4`
- Duration: `formatTimecode(durationSeconds)`, for example 6 seconds
  → `00:00:06:00`. Frame field is always `00` because durations are
  whole seconds.
- Thumbnail: start frame, or a flat placeholder when there is none
  or the frame is still generating.
- Title bar: teal background, white text.
- Body: thumbnail strip on a white clip sitting on the
  `--studio-canvas` track.
- Unselected stroke: 1px `--studio-line`.
- Selected stroke: 2px `--studio-teal`. A white stroke would
  disappear on the light track, so teal is the light-mode selection.
- Playhead: 2px `--studio-ink` vertical line on the selected clip's
  left edge.

`filmstrip.tsx` props are `items`, `selectedId`, and `onSelect`.
Items carry `id`, `title`, `durationLabel`, `thumbnailUrl`,
`statusLabel`, `busy`, and `stale`. They do not include a project
document.

## Data flow

No new server action, collection field, or route.

`ClipProduction` already owns `selectedClip`. It passes that number
to the media list, the workspace, and the filmstrip. Selecting either
control calls the existing setter.

Thumbnail and stage strings keep coming from the current
`STAGE_LABEL` map and `mediaSrc` helper in that mapper. The studio
module does not import `PublicVideo`.

## Error and empty states

- No clips: media column and filmstrip show 「尚未有片段」. Preview
  and inspector stay blank.
- Missing thumbnail: gray placeholder in the row and on the clip.
- In-progress stage: spinner on the media row and on the filmstrip
  title.
- Failed stage or stale media: the existing stage / 需重做 text,
  shown on the row and the filmstrip title.
- Action error string: inspector, same `role="alert"` as today.
- Delete, billing, and frame-edit dialogs stay separate dialogs.

## Files

Create the studio module files listed above.

Edit:

- `src/app/globals.css` — add an import of `tokens.css`. Leave
  `:root` marketing colors and the warm `.studio-canvas` gradient
  class in place for pages outside `.studio-app`.
- `src/presentation/components/app-shell.tsx` — render `StudioShell`.
- `src/presentation/components/app/projects/[id]/video-editor-dialog.tsx`
  — studio header; children still supplied by the caller.
- `src/presentation/components/project/clip-production.tsx` — place
  media, preview, inspector, and timeline into `StudioFrame` when a
  video exists.
- `src/presentation/components/project/clip-workspace.tsx` — expose
  preview and inspector regions for those slots.
- `src/presentation/components/project/clip-timeline.tsx` — map clips
  to `StudioClipItem[]` and render `media-list` plus `filmstrip`.
- `src/presentation/components/app/projects/new/new-project-form.tsx`
  — when there is no video yet, the brief form sits in
  `StudioPanel`, not `StudioFrame`.

Do not edit generation, billing, or director services for this
design.

## Testing

- Unit: `formatTimecode` covers 0, 6, 90, and 3661 seconds
  (`00:00:00:00`, `00:00:06:00`, `00:01:30:00`, `01:01:01:00`).
- Browser, desktop width: `/app`, characters, billing, affiliate,
  MCP, and one project folder share the light shell; the current
  item is teal. Open an editor, select a clip from the left list and
  from the filmstrip, and confirm both move together and the preview
  follows. Switch to 成片 and confirm the preview is the reel while
  the filmstrip remains.
- Browser, below `lg`: rail is icons only; editor columns stack;
  filmstrip stays at the bottom.
- Existing `npx tsx --test` suite still passes. No production-status
  assertions change.

## Out of scope

- Restyling every list card, table row, and form control to a CapCut
  control set.
- A draggable playhead, trim handles, or multi-track timeline.
- Import / generate / library tabs copied from CapCut's media bin.
- Dark mode.
- Marketing site, Clerk sign-in, and server-side generation.
