# Characters: reusable, versioned character blueprints

Date: 2026-09-17  
Status: draft, pending user review

## Goal

Replace the read-only 風格 (skills catalog) page with a **character library**. A user creates a character from a name, a style, a text description, and an optional reference image; the app generates a **character blueprint sheet** (turnaround + walk cycle + expression grid, like a model sheet) with GPT Image 1.5. Every generation or prompt edit produces a **new version**; the user picks one version as **default**. When creating a reel, the user adds one or more characters and the director plans the storyboard around them; storyboard frames use the blueprints as reference images.

## Decisions already made

- Image generation goes through **Higgsfield** `openai/gpt-image-1.5` (already wired: webhook, poller, Blob persist, refunds). No direct OpenAI SDK.
- Each version generation (create, edit, retry) costs **1 credit** and needs an active subscription. Failed generations refund.
- **Style is a new concept, separate from Skill.** For now a code-level catalog with one entry (`doodle`, 白板塗鴉手繪). Skill stays as the director skill in the reel form. Splitting Skill/Style further and multi-style videos are later.
- The reel form's「角色參考圖」upload step is **replaced** by a multi-select character picker. Reference image upload moves into character creation.
- Generation jobs reuse `generationJobs` with a new `kind: "character"` (Approach A).
- Videos **snapshot** the selected characters' default version at creation; later edits to a character do not affect existing videos.
- When a video has a cast, the pipeline **skips the character still job** and feeds blueprints straight into frame generation.

## Out of scope

- Deleting characters or versions.
- Skill/Style split; multi-style selection for videos.
- Cutting a blueprint into separate pose/expression assets.
- Sharing characters between users.
- Editing the blueprint by masking/inpainting; edits are prompt-only.

## Data model

### `characters` (new collection)

One document per character; versions embedded (bounded, tens at most).

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Character id in the URL |
| `userId` | ObjectId | App user |
| `clerkUserId` | string | Auth; every read/write filters on it |
| `name` | string | Required, trimmed, max 40 chars |
| `styleId` | `StyleId` | From `src/lib/styles.ts` |
| `defaultVersionId` | ObjectId? | Unset until the first version completes |
| `versions` | `CharacterVersion[]` | Append-only, oldest first |
| `createdAt` / `updatedAt` | Date | `updatedAt` bumps on any version change |

`CharacterVersion`:

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Version id; also used in the Blob path |
| `parentVersionId` | ObjectId? | Set when created via「從此版本編輯」 |
| `prompt` | string | Full effective description for this version |
| `editInstruction` | string? | The user's edit text, when derived |
| `referenceImageUrl` | string? | Uploaded reference (v1) or parent blueprint (edits) |
| `blueprintUrl` | string? | Blob URL once completed |
| `status` | `queued \| in_progress \| completed \| failed` | |
| `error` | string? | |
| `creditsCharged` | boolean | Flipped false on refund |
| `createdAt` | Date | |

Resolved default: `defaultVersionId` if set and completed; else newest completed version; else none.

### `styles` (code catalog, `src/lib/styles.ts`)

```ts
type StyleId = "doodle";
type Style = { id: StyleId; name: string; nameZh: string; promptFragment: string };
```

Not stored in Mongo. Shaped so a later video multi-style feature can import the same module.

### `generationJobs`

| Change | Notes |
|---|---|
| `kind` | add `"character"` |
| `projectId` | becomes optional (unset for character jobs) |
| `characterId` | ObjectId? — set for character jobs |
| `versionId` | ObjectId? — set for character jobs |
| `clipIndex` | `-1` for character jobs |

### `videos` (Project)

| Field | Type | Notes |
|---|---|---|
| `cast` | `CastMember[]?` | Snapshot at creation |

`CastMember = { characterId, versionId, name, blueprintUrl, prompt }`.

`characterImageUrl` stays for legacy videos; the form no longer writes it.

Blob paths: blueprints at `explainer/characters/{characterId}/{versionId}`; user uploads keep `explainer/characters/{timestamp}-{filename}`.

## Generation flow

### Blueprint prompt (`src/lib/characters/blueprint-prompt.ts`, pure)

Fixed character-sheet layout, 16:9 (maps to 3:2 on GPT Image):

- Left: full-body front, back, left, right standing turnaround; below, a 4-pose walk cycle.
- Right: 3×4 expression grid (neutral, smile, frown, laugh, angry, surprised, curious, worried, sad, focused, shy, sleepy).
- Solid white background, no text or labels, no drop shadows, consistent scale.
- Style fragment from `styles.ts` (doodle: bold irregular black marker outlines, flat marker fills, hand-drawn feel).
- Then the user's description.
- If a reference image is supplied: "Preserve the appearance of the character in the reference image."
- Edit mode adds: "Use the reference sheet as the base. Apply only the change below; keep everything else identical." followed by the edit instruction.

### Actions (`src/lib/actions/characters.ts`)

| Action | Behaviour |
|---|---|
| `createCharacterAction(name, styleId, prompt, referenceImageUrl?)` | Charge 1 credit → insert character with v1 `queued` → `submitImage` → insert job. Returns character id. |
| `editCharacterVersionAction(characterId, fromVersionId, editInstruction)` | Charge 1 → append version with `parentVersionId`, `prompt = parent.prompt + "\n變更：" + instruction`, `referenceImageUrl = parent.blueprintUrl` → submit → job. |
| `retryCharacterVersionAction(characterId, versionId)` | Only for `failed`. Charge 1 → reset to `queued` → delete old job → submit. |
| `setDefaultVersionAction(characterId, versionId)` | Only for `completed`. |
| `renameCharacterAction(characterId, name)` | |
| `refreshCharacterJobsAction(characterId)` | Poll pending jobs via `statusUrl`, then `applyJobStatus`. |
| `listCharactersAction()` / `getCharacterAction(id)` | Serialized `PublicCharacter`. |

If `submitImage` throws, the version is marked `failed` and the credit refunded immediately; no orphan job.

Submission parameters: `aspectRatio: "16:9"`, `quality: "medium"`, `resolution: "1k"`, `referenceImageUrls: [version.referenceImageUrl]`.

### Job sync (`pipeline.ts`)

`applyJobStatus` checks `job.kind === "character"` first and calls `syncCharacterVersion(job, status, outputUrl)`:

- `completed`: `persistMedia` → set `blueprintUrl`, `status`; if the character has no `defaultVersionId`, set it to this version.
- `failed` / `nsfw` (and not previously failed): `refundCredits(1)`, set `status: "failed"`, `creditsCharged: false`, `error`.
- Existing `syncProjectFromJobs` runs only when `job.projectId` is set.

`refreshProjectJobs` is untouched; character polling uses its own action.

## Routes and UI

### Removed

- `src/app/app/skills/page.tsx`, `skill-card.tsx`.
- `AppShell` nav「風格」→「角色」linking to `/app/characters`.

### `/app/characters` — library

- Grid of `character-card.tsx`: default blueprint (`aspect-video`), name, style chip, version count, status badge when generating/failed.
- Header button「新增角色」→ `create-character-modal.tsx`: name, style radio, description textarea, optional reference upload (reuses `uploadCharacterImageAction`, 56px preview + 移除), credit note「扣 1 credit（剩餘 N）」. On success `router.push('/app/characters/[id]')`.
- Empty state with the same button.
- Not subscribed / no credits: modal shows the action error; same redirect-to-billing cue as the reel form.

### `/app/characters/[id]` — workspace

Uses the wide canvas (`WIDE_ROUTE` gains this route).

- Header: ← 回到角色, inline-rename name, style chip.
- Left `version-list.tsx`: thumbnails newest first; each shows `v{n}`, status, 預設 badge, 「由 v{m} 編輯」 note. `?version=` selects; default selected initially.
- Right `version-detail.tsx`: large preview (skeleton + spinner while pending), prompt and edit instruction, actions:
  - 設為預設 (completed, not already default)
  - 從此版本編輯 → textarea + 「產生新版本・1 credit」
  - 重試 (failed)
- Polls every 4s while any version is `queued`/`in_progress` (mirrors `use-project-poll`).

### Reel form Step 06 →「角色」

`character-picker.tsx`: multi-select chip grid (checkbox semantics), thumbnail + name, lists only characters with a completed default version, cap **4**. Empty state links to `/app/characters`. Form submits `characterIds` (repeated FormData key).

## Video integration

### `createVideoAction`

Reads `characterIds[]`, validates ownership and a completed default version for each, snapshots `cast[]`. Stops reading `characterImageUrl`. Error when a character has no usable blueprint:「角色 {name} 尚未有可用藍圖」.

### Phase A (`run-phase-a.ts`)

Replace the single `characterNote` with a cast block when `cast.length > 0`:

```
Cast (use these exact names; they are the only recurring characters):
- {name}: {prompt}
Write characterLock as a compact summary of the cast above.
Reference cast members by name in explainerScene.
```

No cast → existing default-everyman sentence.

### Frames (`pipeline.ts`, `frame-prompts.ts`)

- Cast present: skip the `still` job; `startFrameGeneration` calls `submitFrameJobs` directly. Each frame `referenceImageUrls = cast.map(c => c.blueprintUrl)`. Frame prompt adds「Cast reference sheets are attached; each character must match its sheet exactly」 plus the name list.
- No cast: unchanged still → frames flow.
- `syncProjectFromJobs`: the "still completed → submit frames" branch is bypassed when cast is present (frames were already submitted).
- Clip video `fallbackRef = cast[0]?.blueprintUrl || characterStillUrl || characterImageUrl`.

### Phase B

`Character reference image:` line becomes the cast list (name + blueprint URL) or `none`.

Cast adds no credit cost.

## Error handling

- Credit / subscription errors surface as `{ ok: false, error }` in the modal or detail pane.
- Submission failure → immediate `failed` + refund.
- Webhook/poll failure → refund once (guarded by previous status), mark `failed`.
- Invalid id or foreign character → `notFound()`.
- `setDefaultVersionAction` on a non-completed version → error.
- Higgsfield may reject too many `image_references`; UI caps at 4, and `submitOneFrame` failures follow the existing per-frame refund path.

## Testing

`node --test` via `tsx`, alongside `folder.test.ts`:

- `blueprint-prompt.test.ts`: contains turnaround / walk cycle / expression grid lines, style fragment, user description; edit mode includes the "apply only the change" sentence and the instruction; reference sentence only when a reference is given.
- `character-versions.test.ts`: `resolveDefaultVersion` (explicit default → it; unset → newest completed; none → null), `canSetDefault`, `versionNumber`.
- `cast-prompt.test.ts`: Phase A cast block and frame cast paragraph formatting; empty cast falls back to the original sentences.
- `tsc --noEmit`, `eslint`.
- Manual QA after login: create → edit → set default; create reel with two characters → storyboard mentions them → frame jobs carry both blueprint refs; reel without characters still runs the still job.

## Success criteria

- 風格 page is gone; 角色 page lists characters in a grid and creates them via modal.
- A character can have many versions; edits branch from any version; exactly one default at a time.
- Each generation costs 1 credit and refunds on failure.
- A reel can include 0–4 characters; storyboards name them and frames reference their blueprints.
- Existing videos and videos with no cast behave as before.
