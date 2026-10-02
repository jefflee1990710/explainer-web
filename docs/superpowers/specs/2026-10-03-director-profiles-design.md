# Director profiles: show the idea of a director, hide its prompt

Date: 2026-10-03  
Status: approved in chat, pending spec review  
Builds on: `2026-10-02-directors-design.md`

## Goal

Users can see **what a director does** but never its raw skill prompt. Every director shows a structured **profile** (8 fields shaped like a Phase A proposal). Custom directors stop holding a copy of the template prompt; the user edits the profile plus free-form **extra instructions**, and the server combines them with the hidden template prompt at run time.

## Decisions

- Protection is **full**: no `SKILL.md` or reference content reaches the browser for any director (system or custom), and the AI editor never sees it either.
- System profiles are **hand-written** per skill, stored in the repo and seeded to MongoDB.
- System profiles are **bilingual** (`en` + `zh-Hant`). The client picks `zh-Hant` for `zh-Hant` / `zh-Hans`, `en` for every other locale.
- Custom profile is **single-language**: forking copies the template profile in the user's current UI language.
- Custom directors **inherit the live template prompt** via `baseSlug`. Template prompt updates reach existing custom directors.
- **No migration**: MongoDB has 0 custom directors today. No legacy-format handling.

## Out of scope

- Changing system director prompts or the Phase A / B schemas.
- Editing name/description through AI (stays manual, as today).
- Translating custom profiles.

## Data model

### `DirectorProfile` (`src/model/skill.ts`)

Eight strings, each ≤ 600 chars:

| Key | zh-Hant label | en label |
|---|---|---|
| `bestFor` | 適合題材 | Best for |
| `structure` | 片長與段數 | Length & clips |
| `hook` | 開場鉤子 | Opening hook |
| `arc` | 敘事結構 | Story structure |
| `narrator` | 旁白／角色 | Narrator & cast |
| `visual` | 視覺世界與配色 | Visual world & palette |
| `audio` | 配樂與音效 | Music & sound |
| `rules` | 規則重點 | Key rules |

`PROFILE_KEYS` is the ordered key list, exported from one module and used by UI, validation, chat schema and run-time prompt.

### `skills` collection changes

| Field | On | Type | Notes |
|---|---|---|---|
| `profile` | system | `{ en: DirectorProfile; "zh-Hant": DirectorProfile }` | Seeded from `skills/<dir>/profile.json`. |
| `customProfile` | custom | `DirectorProfile` | Copied from template at fork, then user-edited. |
| `extraInstructions` | custom | string ≤ 4,000 | Empty at fork. |

Custom directors are created with `systemPrompt: ""` and `references: []`. They never store prompt text.

### Seed

`skills/<dir>/profile.json` per system skill: `{ "en": {…8 keys}, "zh-Hant": {…8 keys} }`. `scripts/seed-skills.ts` reads it (required; missing or malformed file fails the seed) and `$set`s `profile`. `readMarkdownTree` stays `.md`-only so `profile.json` never becomes a reference.

## Run time

`resolveRunSkill(skill)` in `src/service/director/run-skill.ts` replaces `asRunSkill` in the three loaders (`jobs.ts`, `higgsfield/pipeline.ts` `loadSkill`, `generation/task-senders.ts`):

- System skill → same as today (`asRunSkill`).
- Custom skill → loads the system template by `slug = baseSlug` (no `isActive` filter, consistent with loading by `skillId`). Missing template → throws "找不到風格" (existing failure path). Returns the template with:
  - `_id`, `title`, `inputSchema`, `higgsfieldDefaults` from the custom doc,
  - `slug = baseSlug` (behaviour slug, as today),
  - `systemPrompt = template.systemPrompt + customDirectorBlock(customProfile, extraInstructions)`,
  - `references = template.references`.

`customDirectorBlock` (pure, tested) appends a section:

```
# Custom director adjustments
The user customised this director. Follow these on top of the guidance above; where they conflict, these win — except hard limits the platform enforces (clip counts, cast size, durations, output schema).

## Best for
…
(each non-empty profile field, in PROFILE_KEYS order, en labels)

## Extra instructions
…
```

Empty fields and empty extra instructions are omitted. Because it is appended to `systemPrompt`, both Phase A and Phase B see it via the existing `skillPromptForPhaseA/B`.

## Serialization

`PublicDirector` drops `systemPrompt` and `references`. It becomes:

```ts
PublicSkill & {
  baseSlug?: string;
  profile?: { en: DirectorProfile; "zh-Hant": DirectorProfile }; // system only
  customProfile?: DirectorProfile;                                  // custom only
  extraInstructions?: string;                                       // custom only
  chat: …;                                                          // unchanged
}
```

`toPublicDirector` must never spread the raw skill. A test asserts the serialized object has no `systemPrompt` / `references` keys and contains no template prompt text.

## Server actions (`src/service/director/director-actions.ts`)

- `createDirectorAction({ templateSlug, title, description, locale })` — copies `template.profile[profileLocale(locale)]` into `customProfile`; `extraInstructions: ""`; `systemPrompt: ""`; `references: []`. `profileLocale(locale)` = `"zh-Hant"` for `zh-Hant`/`zh-Hans`, else `"en"` (pure, tested). Template without `profile` → "找不到模板".
- `saveDirectorAction({ id, title, description, customProfile, extraInstructions })` — validates the 8 keys exist and lengths (field ≤ 600, extra ≤ 4,000); unknown keys dropped.
- `deleteDirectorAction` — unchanged.
- `sendDirectorChatAction({ id, message, draft })` — `draft` is `{ customProfile, extraInstructions }`. Model schema: `{ summary: string, edits: { field: ProfileKey | "extraInstructions", content: string }[] }`. Model input: the current draft fields, last 20 chat messages, user message. **No template prompt.** Validation, rate limit, subscription gate, summary normalization and chat persistence unchanged; `changedPaths` now holds field keys.

### Draft helper

`src/service/director/director-edits.ts` is rewritten around fields: `DirectorDraft = { customProfile, extraInstructions }`, `DRAFT_FIELDS = [...PROFILE_KEYS, "extraInstructions"]`, `applyDirectorEdits(draft, edits)` (unknown field / over-length rejected atomically, no-op edits dropped), `changedDraftFields(saved, draft)`.

### Editor model prompt

Explains it edits a director **profile** (8 fields + extra instructions) that steers a hidden template; change only what the user asks; keep other fields as-is; return full content per changed field; summary in the user's language. It is told it has no access to the underlying prompt and must not invent or claim to reveal one.

## UI

- `director-info-panel.tsx`: replace the Files section with a **Profile** section: 8 labelled cards in `PROFILE_KEYS` order (new `director-profile-field.tsx`). System: read-only text, language chosen from UI locale. Custom: textarea per field with「已修改」badge, then an「額外指示」textarea with helper text. Remove `director-file-section.tsx`.
- `director-workspace.tsx`: draft type switches to the field draft; save/discard/in-flight-save logic unchanged.
- `director-chat-message.tsx`: changed list shows localized field labels instead of file paths.
- `create-director-modal.tsx`: passes current `locale` to `createDirectorAction`.
- List cards unchanged.
- i18n: `directors.profileTitle`, `directors.profile.<key>` labels, `directors.extraInstructions`, `directors.extraInstructionsHint`, `directors.chatChangedFields`; remove `filesTitle`. en + zh-Hant.

## Error handling

- Template missing at run time → existing "找不到風格" failure.
- Template missing `profile` at fork → "找不到模板".
- Over-length field on save or from AI → "欄位內容過長" (`directorFileTooLong` renamed to `directorFieldTooLong`).
- AI edits an unknown field → "AI 修改了不存在的欄位" (`directorUnknownFile` renamed to `directorUnknownField`).
- AI changes nothing → "AI 沒有修改任何欄位" (`directorChatNoEdits` copy updated).
- `directorFilesLocked` / "不可新增或刪除檔案" removed (no file set any more).

## Testing

- Unit: `customDirectorBlock` (order, empty omission, extra instructions), `resolveRunSkill` custom/system branches (template loader injected), `profileLocale`, rewritten `director-edits` tests, `toPublicDirector` leaks no prompt, profile.json shape test over all 9 skill dirs (8 keys × 2 languages, non-empty, ≤ 600).
- Existing suite passes; `tsc --noEmit`, `npm run lint`.
- Browser: system detail shows 8 profile fields and no prompt text (check page source for a distinctive SKILL.md line); fork → profile copied in UI language; AI edits a field → Modified → Save → reload persists; dropdown still lists custom director.
