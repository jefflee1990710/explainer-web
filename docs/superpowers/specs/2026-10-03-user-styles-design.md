# User styles: browse system styles, fork, edit, and preview your own

Date: 2026-10-03
Status: approved in chat, 2026-10-03

## Goal

Add a **Styles** section next to Directors. It lists the 9 system styles (read-only) and lets a user fork one into their own style. A custom style has a detail page: the left side is a form of the style fields, the right side is an AI chat that edits the draft, and a preview button renders one still so the user can see the look. New-video and character style pickers list system styles and that user's styles. Frame and blueprint prompts read the chosen style's fields.

## Decisions already made

- Custom styles live in a new **`userStyles`** collection. The existing `styles` collection and its 9 documents stay as they are. The process-wide style overlay keeps loading only those 9.
- Forking **copies every prompt field** at that moment, including the five lettering fields. Later edits to the system style do not change the copy. `baseStyleId` records which system style it came from.
- Name and description are edited by hand. AI may edit the visual fields only: `canvas`, `canvasColor`, `look`, `palette`, `typography`, `motion`, `negatives`, and the five lettering fields.
- AI edits land in a **client-side draft**. Nothing is written until the user presses **Save**. **Discard** reverts to the saved version. Chat history is persisted on the user-style document.
- AI chat requires an **active subscription** and does not spend credits. Limits match director chat: message ≤ 2,000 characters, 20 user messages per hour, last 20 messages sent, last 100 kept.
- **Generate preview** spends `FRAME_COST` (4 credits), uses the **saved** fields, and refunds on failure. A dirty form must be saved before generating.
- System styles open a read-only detail page with「用作範本」. They have no chat and no preview button.
- Custom styles can be soft-deleted. Pickers hide them. Videos and characters that already point at them still resolve the document.
- A missing `styleId` on an old video still resolves to doodle. An unknown id that is not one of the 9 system ids and not this user's user-style id **fails generation**. It does not fall back to doodle.

## Out of scope

- Editing, hiding, or regenerating the 9 system styles from this page.
- Sharing styles between users.
- Version history of a style (latest saved fields + chat log only).
- Charging credits for AI chat.
- Restyling an existing video or character when its style is later edited. The next generation reads the style document as it is then.

## Data model

### `userStyles` (new collection)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `ownerClerkUserId` | string | Required. |
| `baseStyleId` | StyleId | System template id (`doodle`, …). |
| `name` | string | ≤ 60 characters. |
| `description` | string | ≤ 300 characters. |
| `canvas` | string | Prompt field, ≤ 2,000 characters. |
| `canvasColor` | string | `#rrggbb`. UI card and alpha flatten. Never sent as a hex in the prompt. |
| `look` | string | ≤ 2,000 characters. |
| `palette` | string | ≤ 2,000 characters. |
| `typography` | string | ≤ 2,000 characters. |
| `motion` | string | ≤ 2,000 characters. |
| `negatives` | string | ≤ 2,000 characters. |
| `letteringLayout` | string | Copied at fork. ≤ 2,000 characters. |
| `letteringLine1` | string | Same. |
| `letteringLine2` | string | Same. |
| `beatTitleLayout` | string | Same. |
| `reelLayout` | string | Same. |
| `chat` | `StyleChatMessage[]?` | Oldest first. Capped at 100 on write. |
| `previewUrl` | string? | Card image. Empty until the first successful preview; the UI then shows the template's `previewUrl`. |
| `previewFullUrl` | string? | Full image the card was built from. |
| `previewHash` | string? | Hash of the prompt that produced the current preview. |
| `previewStatus` | `"idle" \| "generating" \| "failed"` | `generating` blocks a second preview. |
| `deletedAt` | Date? | Soft delete. |
| `createdAt` | Date | |
| `updatedAt` | Date | |

`StyleChatMessage` matches director chat: `role`, `content`, optional `changedPaths` (field names), `createdAt`.

### `styleId` on videos and characters

`Project.styleId` and `Character.styleId` become `string`. System ids stay the nine `StyleId` values. Custom ids are the user-style ObjectId hex.

`loadRenderableStyle({ styleId, ownerClerkUserId })`:

- Empty or missing → system doodle.
- One of the nine ids → that system style from the existing overlay. If the overlay has not been hydrated, hydrate first.
- A valid ObjectId → `userStyles` where `_id` and `ownerClerkUserId` match, **including** soft-deleted rows.
- Anything else, or an ObjectId with no matching row → throw. Callers that build prompts must not substitute doodle.

## Server actions

All require `requireAppUser()`. Custom reads and writes filter on `ownerClerkUserId`. Mongo access is `db.collection<UserStyleDoc>("userStyles")`.

- `createUserStyle({ baseStyleId, name, description })` — `baseStyleId` must be a system style. Copies that style's prompt fields and lettering. Returns the new id.
- `saveUserStyle({ id, ...fields })` — custom, not deleted. Validates lengths and `canvasColor`.
- `deleteUserStyle({ id })` — sets `deletedAt`. Does not remove blobs that videos might still show; the card preview may remain on the document for in-flight jobs.
- `sendUserStyleChat({ id, message, draft })` — custom, not deleted, active subscription, same rate and length limits as director chat. The model returns `{ summary, edits: { field, content }[] }` for visual fields only. Unknown fields are dropped. `canvasColor` edits that are not `#rrggbb` are dropped. If no field changes, return an error and do not append chat. Append the user message and the assistant summary, and return the new draft. Do not write the draft fields.
- `generateUserStylePreview({ id })` — custom, not deleted, form not considered here (the client refuses when dirty). If `previewStatus` is `generating` and the job is younger than 15 minutes, refuse. `assertCanSpendCredits` then `consumeCredits` for `FRAME_COST`. Insert a `generationJobs` row with `kind: "stylePreview"` and `userStyleId`. On enqueue failure, refund and set `previewStatus` back to `idle`.

`GenerationKind` gains `"stylePreview"`. The existing queue sends it with the same image route as a character still (16:9, medium, 1k). The prompt is `styleLinesForFrame` plus lettering lines from the **saved** user style, plus the shared preview scene already used for system cards (character, light bulb, label IDEA). Success writes `previewUrl`, `previewFullUrl`, `previewHash`, and `previewStatus: "idle"`. Failure or NSFW sets `previewStatus: "failed"` and refunds `FRAME_COST` once.

## UI

New components live in `src/presentation/components/app/styles/`, one component per file, `'use client'` when the file uses hooks. Visuals follow the Directors cards, header, and detail layout. Labels go through the existing i18n dictionaries, the same way Directors does.

### Left rail

`app-shell.tsx` gains a Styles item between Directors and Characters, linking to `/app/styles`.

### List `/app/styles`

Header, then a system grid, then a mine grid. System cards show the system preview, name, description, a read-only label, and「用作範本」. That opens a name/description modal and navigates to `/app/styles/[id]`. Mine cards show the user preview or, when absent, the template preview; the subtitle is the template name; the date is `updatedAt`. Deleted styles are omitted.

### Detail `/app/styles/[id]`

System: read-only fields and the system preview.「用作範本」is available. No chat, no generate, no delete.

Custom: back link to the list, unsaved-changes confirm. Preview image on top and a Generate button labeled with 4 credits. The button is disabled while dirty or while `previewStatus` is `generating`. Left column: name, description, the visual fields, the five lettering fields, Save, Discard, Delete. Right column: chat. Chat requires a subscription to send; it replaces the draft fields it changed and marks the form dirty. Save and Discard behave like Directors. Delete confirms, soft-deletes, and returns to the list.

### Pickers

The new-video style picker and the character style picker render two groups, system then mine, with stills. A custom row's subtitle is the template name. Character filtering stays an exact `styleId` match, so a character drawn in a custom style appears only for a video using that same id.

## Error handling

- Create, save, chat, preview, and delete on a missing, deleted, or not-owned style return a not-found error. The detail page calls `notFound()`.
- Save rejects over-long fields and a `canvasColor` that is not `#rrggbb`.
- Chat without a subscription, over the rate limit, over the message cap, or with zero applied edits returns an error and leaves the draft unchanged.
- Preview with a dirty form is refused in the client. The server always renders the saved document. Preview while one is in flight is refused on the server.
- Delete during `previewStatus: "generating"` is allowed. A job that then succeeds still writes the preview onto the soft-deleted document and does not refund. A job that fails still refunds once.
- If credits cannot be spent, preview does not start. If the job fails to enqueue, credits are refunded and `previewStatus` is `idle`.
- Generation of a video or character whose `styleId` does not resolve throws before submitting image work.

## Testing

- Fork copies the template fields. Updating the system document afterward does not change the copy.
- `loadRenderableStyle` returns doodle for a missing id, the system style for `pixel`, the user document for its owner's ObjectId (including soft-deleted), and throws for another user's id or an unknown string.
- Frame prompt text for a video whose `styleId` is a user style contains that style's `look` and `letteringLine1`, and does not substitute doodle lettering.
- Preview consume/refund: enqueue failure refunds; a completed job does not refund twice.
- Picker serialization splits system and mine and hides `deletedAt` rows.
- Page flows to check in the browser: list, fork, edit, save, discard, chat draft, generate preview, and the new-video picker showing the new style.
