# Directors: browse system director skills, fork and AI-edit your own

Date: 2026-10-02  
Status: draft, pending user review

## Goal

Add a **Director** section to the app. It lists the 9 seeded system director skills (read-only) and lets a user create their own director by forking a system one as a template. A custom director has a detail page: the left side shows its content (name, description, template, `SKILL.md`, references); the right side is an AI chatroom that proposes edits, which the user saves to MongoDB. The create-video form's video-type chips become a dropdown that includes the user's own directors.

## Decisions already made

- Custom directors live in the existing **`skills` collection** (Approach A), with an owner field. Every pipeline step already loads the skill by `project.skillId`, so Phase A / Phase B / generation stay unchanged.
- A custom director remembers its template via `baseSlug`. All slug-driven behaviour (talking-head, bookend, dialogue Q&A cast count, listicle scene text, narration bans, skill guide rows, i18n label fallbacks) uses the **behaviour slug** = `baseSlug ?? slug`.
- AI may edit **`systemPrompt` (SKILL.md) and every reference file**. Name and description are edited by hand in the left panel, not by AI.
- AI edits land in a **client-side draft**; nothing is written until the user presses **Save**. **Discard** reverts to the saved version.
- **Chat history is persisted** on the director document.
- AI chat is **free** but requires an **active subscription**; messages are length-capped.
- System directors open a **read-only** detail page (no chatroom) with a「以此為模板建立」button.
- Custom directors can be deleted. Existing videos keep their `skillId`; a deleted director only blocks new runs that need the skill (see Error handling).

## Out of scope

- Editing or hiding system directors.
- Sharing directors between users / a public gallery.
- Version history of a director (only the latest saved content + chat log).
- Adding or deleting reference files (AI and user edit existing files only).
- Snapshotting the director prompt into each video. Editing a director affects videos whose later phases have not run yet; accepted.
- Image references in skill directories (e.g. `style-frames/*.png`) — not seeded today, not copied.

## Data model

### `skills` (existing collection, new optional fields)

| Field | Type | Notes |
|---|---|---|
| `ownerClerkUserId` | string? | Unset = system director. Set = custom, owned by this user. |
| `baseSlug` | string? | Slug of the system template it was forked from. Only on custom. |
| `chat` | `DirectorChatMessage[]?` | Persisted AI chat log, oldest first. Only on custom. |

Custom directors use `slug = "custom-<_id hex>"`, `isActive: true`, `sortOrder` copied from the template, `inputSchema` / `higgsfieldDefaults` copied from the template.

`DirectorChatMessage`:

| Field | Type | Notes |
|---|---|---|
| `role` | `"user" \| "assistant"` | |
| `content` | string | User text, or the assistant's change summary |
| `changedPaths` | string[]? | Assistant only: `"SKILL.md"` and/or reference paths it changed |
| `createdAt` | Date | |

Chat is capped at the last 100 messages on write.

### Behaviour slug

`behaviorSlug(skill) = skill.baseSlug ?? skill.slug` in `src/service/director/behavior-slug.ts`.

- Video creation stores `video.skillId = skill._id` and `video.skillSlug = behaviorSlug(skill)`. Every downstream reader of `video.skillSlug` therefore keeps working unchanged.
- `run-phase-a.ts` / `run-phase-b.ts` replace `input.skill.slug` with `behaviorSlug(input.skill)`.

### Listing queries

All existing "list all active skills" queries (e.g. `projects/[id]/page.tsx`) must not leak other users' directors. A single helper `listSelectableSkills(clerkUserId)` returns system skills (`ownerClerkUserId` missing) plus the user's own, sorted system first by `sortOrder`, then custom by `updatedAt` desc. `findSelectableSkill(clerkUserId, slug)` resolves one by slug under the same rule.

## Server actions (`src/presentation/actions/directors.ts`)

All require `requireAppUser()`; every custom read/write filters on `ownerClerkUserId: user.clerkUserId`. Mongo access is `db.collection<Skill>("skills")` via the existing DAO.

- `createDirectorFromTemplate({ templateSlug, title, description })` — template must be a system skill. Copies `systemPrompt`, `references`, `inputSchema`, `higgsfieldDefaults`; `titleZh = title`. Returns the new id. Title required, ≤ 60 chars; description ≤ 300.
- `saveDirector({ id, title, description, systemPrompt, references })` — custom only. References must match the existing path set (no add/remove). Each file ≤ 60k chars.
- `deleteDirector({ id })` — custom only.
- `sendDirectorChat({ id, message, draft })` — custom only, active subscription required, message ≤ 2,000 chars. Sends the current **draft** (not the saved version) plus the last 20 chat messages to `directorModel()` (Gemini) via `generateObject` with schema `{ summary: string, edits: { path: string, content: string }[] }` (full replacement content per changed file). Validates every `path` exists in the draft. Appends the user message and assistant summary (+ `changedPaths`) to `chat` and returns `{ summary, edits }`. Draft content is not saved.

System prompt for the editor model: explains it is editing a video director skill (markdown), that `*prompt-contract.md` files feed Phase B and others feed Phase A, to change only what the user asks, keep markdown structure, and reply with a short summary in the user's language.

## UI

All new components live in `src/presentation/components/app/directors/` (one component per file, `'use client'` when using hooks), following the Characters page visuals (cards, header, modal).

### Left rail

`app-shell.tsx`: add `{ href: "/app/directors", label: t("nav.directors"), icon: "directors" }` directly after「影片」. Add the icon to `studio-shell.tsx`. i18n keys in all message files (en / zh-Hant written; others fall back via existing merge).

### List page `/app/directors`

- Header: title + short explainer.
- Section「系統 Director」: 9 cards (localized name, other-language subtitle, description, 「以此為模板建立」button). Card click → read-only detail page.
- Section「我的 Director」: user's cards (name, template name, updated time). Empty state points at the system section.
- `create-director-modal.tsx`: template preselected, name + description inputs → `createDirectorFromTemplate` → navigate to detail page.

### Detail page `/app/directors/[id]`

Server page loads the skill; 404 if it is neither a system skill nor owned by the user.

- **Left panel** (`director-info-panel.tsx`): name + description (editable inputs for custom, text for system), template badge, then collapsible file sections — `SKILL.md` first, then each reference by path. Custom: each file is an editable textarea; files whose draft differs from saved show a「已修改」badge. Footer: **Save** / **Discard** (disabled when no changes), **Delete** (custom, with confirm dialog).
- **Right panel** (`director-chat-panel.tsx`, custom only): message list (persisted history), input box, send button. On reply, edits are merged into the draft and the assistant bubble lists the changed files. Unsubscribed users see a locked state linking to billing.
- System: left panel read-only plus「以此為模板建立」; no right panel.
- Leaving with unsaved draft triggers `beforeunload` warning.

Pure helper `applyDirectorEdits(draft, edits)` in `src/service/director/director-edits.ts` (unit-tested).

### Create-video form

Replace the chip grid in `skill-picker.tsx` with a native-styled `<select>` dropdown with two `<optgroup>`s:「系統」and「我的 Director」. Value stays the skill `slug` (system slug or `custom-…`). `SkillGuideRows` below the dropdown uses the selected skill's behaviour slug, so `PublicSkill` gains `baseSlug?` and `isCustom`. The project page uses `listSelectableSkills`.

Server-side `createVideo` / bookend creation: resolve the skill with `findSelectableSkill` **before** brief validation, then validate the brief with `behaviorSlug(skill)` (talking-head script, narration language, logo, cast count). MCP `create_video` keeps accepting `skillSlug` and therefore custom slugs too.

## Error handling

- AI returns invalid JSON / unknown path / empty edits → chat shows an error bubble; draft untouched; nothing appended to history for failed calls.
- Save on a director that was deleted elsewhere → "找不到 Director".
- Video whose custom director was deleted: later phase jobs already load by `skillId`; when the skill is missing they fail with the existing "skill not found" path. Delete confirm dialog warns about this.
- Selecting another user's slug in the form or MCP → "找不到風格" (existing error).

## Testing

- Unit: `behaviorSlug`, `applyDirectorEdits` (replace, unknown path rejection, untouched files preserved), `listSelectableSkills` filter shape.
- Existing tests keep passing (`skill-guide.test.ts`, `brief-defaults.test.ts`, director tests).
- `npm run lint` and `tsc --noEmit`.
- Browser: open Director → fork Talking-head → ask AI to change a rule → Save → reload shows change + chat history → create a video with the custom director from the dropdown and confirm the talking-head script field appears.
