# Post Designer: layout blueprints, poster generation, and layer editing

Date: 2026-10-06
Status: approved

## Goal

Add a **Post** item on the left rail, directly under **Video**. It opens a list of the user's posters. Creating a poster picks one of 16 layout blueprints and a content instruction. A system object, **Post Designer**, writes the wording into that layout's text slots. The same image route used for scene frames renders a 2:3 preview. The editor and the export use editable shape and text layers, not the preview pixels.

## Decisions already made

- Post Designer is one system object. Its prompt lives in a TypeScript module. There is no screen to edit that prompt, and no per-user designer.
- The 16 layouts are fixed templates in code. Each template is a list of shape and text layers on a portrait **2:3** canvas. **x is 0–1000, y is 0–1500.** Geometry does not come from the model. `fontSize` uses that same unit.
- A blueprint PNG for each layout is a static asset. The scene-image call receives that PNG as a reference. The editor never paints it.
- The preview uses `submitImage` and `FRAME_COST` (4 credits). Copy that contains CJK uses the `zh-Hant` image route. Any other copy uses the `en` route. This feature does not use the `zh-Hans` route.
- The list card shows `previewUrl` until a layer edit has been saved. After that it shows `thumbnailUrl`.
- Editing text, moving a layer, or scaling a layer writes `layers` only. It does not call Post Designer or the image model.
- The first saved edit uploads a PNG composited from the layers and stores it as `thumbnailUrl`. Later saves replace that file.
- Download composites the current layers to PNG in the browser.
- v1 editing is text content, move, and scale. No color picker, no add or delete layer, no rotation, no font picker. Scaling a text layer changes its box; `fontSize` scales with the box height.

## Out of scope

- Editing the Post Designer prompt in the UI.
- More than one designer.
- Attaching a poster to a video folder.
- Regenerating a poster from the editor.
- Masked inpainting.
- Aspect ratios other than 2:3.
- Sharing posters between users.
- Simplified-Chinese image route.
- Text on a curve. Layout 11's arched wordmark is an axis-aligned text box in that arc's bounds.

## Data model

### Post Designer (code)

`src/service/post/designer.ts` exports:

- `POST_DESIGNER_PROMPT` — system prompt. It receives the layout id, a short description of each text slot, and the user's instruction. It returns one string per slot. It does not return coordinates.
- `designPosterCopy(input)` — calls `directorModel()` through `generateText` + `Output`, with a schema limited to that layout's slot ids.

### Layout templates (code)

`src/service/post/layouts.ts` exports `POSTER_LAYOUTS`, keyed `layout-01` … `layout-16` in row-major order from the reference sheet.

Fills used by every template:

| Token | Hex |
|---|---|
| canvas | `#FFFFFF` |
| ink | `#1A1A1A` |
| sage | `#9AAF8A` |

Shape kinds: `rect`, `circle`, `quarterCircle`, `semicircle`, `triangle`, `lineStack`, `ellipse`, `blob`.

A `lineStack` is one layer and scales as a group. `axis` is `"horizontal"` or `"vertical"`. A `quarterCircle` sets `corner` to `tl`, `tr`, `bl`, or `br`. A `semicircle` sets `side` to `top`, `bottom`, `left`, or `right`. Layout 08's bottle is a `rect` plus an `ellipse`. Mountains in layouts 04, 07, and 10 are one or more `triangle` layers. Layout 13's organic corner is one `blob`; the path is a function of `layout-13` fitted to the layer box, and it is not stored on the post. Layouts 03 and 13 set `vertical: true` on the wordmark. Layout 02 sets a wider `tracking` on the tracked wordmark.

```ts
type PosterShapeLayer = {
  id: string;
  type: "shape";
  shape: "rect" | "circle" | "quarterCircle" | "semicircle" | "triangle" | "lineStack" | "ellipse" | "blob";
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  axis?: "horizontal" | "vertical";
  corner?: "tl" | "tr" | "bl" | "br";
  side?: "top" | "bottom" | "left" | "right";
};

type PosterTextLayer = {
  id: string;
  type: "text";
  role: "mark" | "headline" | "subhead" | "body";
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontWeight: 500 | 700;
  align: "left" | "center" | "right";
  color: string;
  vertical?: boolean;
  tracking?: number;
};

type PosterLayout = {
  id: PosterLayoutId;
  blueprintPath: string; // /posters/layouts/01.png … 16.png
  layers: Array<PosterShapeLayer | PosterTextLayer>;
};
```

Slot text limits, applied by truncating the designer output: mark 24, headline 40, subhead 80, body 160 characters.

The sixteen arrangements, matching the sheet:

| Id | Arrangement |
|---|---|
| layout-01 | Underlined wordmark. Line stack on the left. Two sage squares on the right. |
| layout-02 | Tracked wordmark. Vertical line stack on the left. Sage quarter-circle, bottom right. |
| layout-03 | Vertical wordmark. Ink bar and sage square on the right. |
| layout-04 | Wordmark top right. Line stack. Sage triangle along the bottom. |
| layout-05 | Wordmark. Sage circle on the left. Vertical lines. Sage rectangle on the right. |
| layout-06 | Sage semicircle at the top holding the wordmark and a line stack. Ink bar at the bottom. |
| layout-07 | Wordmark. Line block. Sage mountain beneath. |
| layout-08 | Wordmark. Line stack. Sage circle, bottle (rect + ellipse), and small rects. |
| layout-09 | Wordmark. Line block. Sage semicircle along the bottom. |
| layout-10 | Wordmark. Line stack. Sage triangle. Sage mountain at the bottom. |
| layout-11 | Wordmark in the arc's bounding box. Lines narrowing downward. Sage square at the bottom. |
| layout-12 | Line frame around the wordmark. Sage circle. Line stack below the circle. |
| layout-13 | Vertical wordmark. Two line columns. Sage blob, bottom right. |
| layout-14 | Sage field on the top half with the wordmark. Line stack on the white bottom half. |
| layout-15 | Wordmark. Sage square grid on the left. Line column on the right. |
| layout-16 | Wordmark. Sage oval. Short line stack under the oval. |

Blueprint PNGs are cropped from the reference sheet into `public/posters/layouts/01.png` … `16.png`. Cropping is a one-time asset step. The template coordinates are authored to those crops, not traced by a vision model.

### `posts` (new collection)

Mongo access is `db.collection<Post>("posts")`. Reads and writes filter on `clerkUserId`.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `clerkUserId` | string | Owner. |
| `layoutId` | `PosterLayoutId` | |
| `instruction` | string | User content instruction. 1–2,000 characters. |
| `layers` | `PosterLayer[]` | Copy of the template with slot text filled. Later edits write here. |
| `previewUrl` | string? | Scene-image preview. Unset until the job completes. |
| `thumbnailUrl` | string? | Layer composite. Unset until the first saved edit. |
| `previewStatus` | `"generating" \| "ready" \| "failed"` | |
| `previewJobId` | ObjectId? | Current `postPreview` job. |
| `aspectRatio` | `"2:3"` | Always. |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### Generation job

Add kind `"postPreview"` and optional `postId: ObjectId`. `projectId` stays unset. Completion writes `previewUrl` and sets `previewStatus` to `ready`. Failure sets `previewStatus` to `failed` and refunds the 4 credits for that attempt. A second preview cannot start while `previewStatus` is `generating`.

## Generation

`createPost({ layoutId, instruction })` is a server action. It requires `requireAppUser()`.

1. Reject an empty instruction, an instruction over 2,000 characters, or an unknown `layoutId`. The dialog keeps the field error. No post, no credits.
2. `assertCanSpendCredits` for `FRAME_COST` before the designer call. No subscription or too few credits: the dialog shows that error. No post.
3. `designPosterCopy`. On failure, the dialog shows a retry. No post, no credits.
4. Clone the layout, fill and truncate slot text, insert the `posts` row with `previewStatus: "generating"`.
5. `consumeCredits` for `FRAME_COST`, then `submitImage` with aspect `2:3`, the blueprint URL as the only reference, `enhance_prompt` left off, and a prompt that names the filled wording and tells the model to follow the blueprint's blocks and whitespace. The job kind is `postPreview`.
6. If the charge or the submit throws, set `previewStatus` to `failed`, refund when a charge happened, and keep the post. The user can open it and can retry the preview.

`retryPostPreview({ postId })` repeats steps 5–6 for a post in `failed`. It charges 4 credits again and refunds if that attempt fails.

The image prompt is built in code from the filled slots. It is not a second call to Post Designer.

## Editing

`savePostLayers({ postId, layers, thumbnail })` is a server action.

- The caller must own the post.
- Every submitted layer id must already exist on the post. Shape kind, role, fill, color, align, font weight, `vertical`, `tracking`, `axis`, `corner`, and `side` stay as stored. The action accepts new `x`, `y`, `w`, `h`, and text `text` / `fontSize`.
- Text is truncated to the slot limit for its role.
- `thumbnail` is a PNG uploaded with `@vercel/blob`, same as other image uploads, and stored as `thumbnailUrl`.
- This action does not insert a generation job.

Download does not call the server. The browser draws the layers to a canvas and saves a PNG.

## UI

### Rail

In `AppShell`, insert `{ href: "/app/posts", label, icon: "posts", section: "generation" }` immediately after the Video item. English label **Post**. zh-Hant label **海報**. `StudioNavItem.icon` gains `"posts"`. The icon is a portrait frame with a single block, stroke width matching the other rail icons.

`isActive` treats `/app/posts` and `/app/posts/:id` as that item. `/app` stays the Video item only.

### List `/app/posts`

Page title uses the same label as the rail. A primary button opens the create dialog. The empty state offers that same action and no other.

The dialog shows the 16 blueprint images as a selectable grid. Each hit target is at least 44×44px. `layout-01` is selected when the dialog opens. A labeled textarea holds the instruction. Submit disables the button and shows a pending label until the action returns.

The grid is portrait 2:3 cards.

- `thumbnailUrl` present: show it.
- Otherwise `previewUrl` present: show it.
- `previewStatus === "generating"` and no image yet: a reserved 2:3 skeleton and a status label.
- `previewStatus === "failed"` and no `thumbnailUrl`: a failure label and a retry button on the card.

Clicking the card goes to `/app/posts/[id]`. The retry control does not navigate. While any visible post is `generating`, the list refreshes every 4000ms, the same interval as the folder generation poll.

Copy lives in `post.en.ts` and `post.zh-Hant.ts`, wired like the other workspace message modules.

### Editor `/app/posts/[id]`

A back link returns to `/app/posts`. The canvas renders `layers` as SVG on a white 2:3 stage. It does not draw `previewUrl`.

Clicking a layer selects it. The selected text layer opens a labeled field beside the canvas; edits update the SVG immediately. Dragging moves the layer. Corner handles scale it, with a minimum size so the box cannot invert. Handles are large enough to hit without a pixel-perfect grab.

Saving writes `savePostLayers`. A failed save leaves the local edits in place and offers save again. The preview status sits beside the title and does not block the canvas. Download uses the current layers.

Keyboard: Tab moves across layers and then the text field. Arrow keys nudge the selected layer. Focus rings stay visible. `prefers-reduced-motion` disables decorative motion; drag still tracks the pointer.

Buttons and inputs are at least 44px tall. Strings are at least 16px. The stage scales down to the viewport so the page does not scroll sideways.

## Errors

| Case | Result |
|---|---|
| Empty instruction, instruction too long, or bad layout id | Dialog field error. No post. |
| No subscription or too few credits | Dialog error. No post. No designer call. |
| Designer throws | Dialog retry. No post. No charge. |
| Charge or image submit throws | Post kept, `previewStatus: "failed"`, refund if charged. |
| Provider fails the job | Same as a submit failure: `failed` and refund. |
| Save throws | Canvas edits remain. Save again. |
| Download | Uses layers. A failed preview does not block it. |

## Testing

- Designer output fills only that layout's slots. Unknown slot keys are dropped. Over-long slot text is truncated.
- `createPost` inserts `layers` before the image job is submitted.
- A failed preview job sets `failed` and refunds `FRAME_COST`.
- `savePostLayers` does not insert a generation job, and it rejects a layer id that is not on the post.
- The card image is `previewUrl` when `thumbnailUrl` is absent, and `thumbnailUrl` when it is set.
- Rail active state: `/app/posts/[id]` highlights Post and does not highlight Video.

## Files

- `src/model/post.ts` — types and zod schema.
- `src/service/post/designer.ts` — prompt and `designPosterCopy`.
- `src/service/post/layouts.ts` — 16 templates.
- `public/posters/layouts/01.png` … `16.png` — blueprint crops.
- `src/service/post/create-post.ts` — create and retry.
- `src/service/post/save-layers.ts` — layer save and thumbnail upload.
- `src/model/generation-job.ts` — `postPreview` and `postId`.
- Completion path for generation jobs — branch for `postPreview`.
- `src/app/app/posts/page.tsx`, `src/app/app/posts/[id]/page.tsx`.
- `src/presentation/components/app/posts/` — list, create dialog, card, editor, canvas. One component per file.
- `src/presentation/studio/studio-nav.tsx` and `studio-shell.tsx` — Post icon.
- `src/util/i18n/messages/workspace/post.en.ts` and `post.zh-Hant.ts`.
