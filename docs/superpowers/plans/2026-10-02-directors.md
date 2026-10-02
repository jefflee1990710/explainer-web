# Directors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Director section (list 9 read-only system directors, fork one into a user-owned director, AI-edit it in a chatroom, save to Mongo) and switch the create-video form's video type to a dropdown that includes the user's directors.

**Architecture:** Custom directors are extra documents in the existing `skills` collection with `ownerClerkUserId` + `baseSlug`. A behaviour slug (`baseSlug ?? slug`) keeps all slug-driven director rules working. Server actions (no REST) handle create / save / delete / chat; chat uses `directorModel()` (Gemini) with structured output; AI edits are a client draft until Save.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, MongoDB driver 7, AI SDK v7 (`generateText` + `Output.object`), zod 4, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-02-directors-design.md`

## Global Constraints

- Mongo access must be typed: `db.collection<OptionalId<Skill>>("skills")` via `skillsCollection()`.
- Server calls are server actions in `src/presentation/actions/*` delegating to `src/service/*`; no new API routes.
- One UI component per file under `src/presentation/components/app/directors/`; `"use client"` on any component using hooks.
- Every custom-director read/write filters `ownerClerkUserId: user.clerkUserId`.
- System directors (`ownerClerkUserId` missing) are never written by these actions.
- Limits: title ≤ 60, description ≤ 300, chat message ≤ 2,000, each file ≤ 60,000 chars, chat log kept to last 100, model context = last 20 messages.
- AI chat requires an active subscription; free.
- Short, clear code comments matching surrounding density.
- Server error strings are zh-Hant and mapped in `translate-app-error.ts`.

---

### Task 1: Model fields + behaviour slug at run time

**Files:**
- Modify: `src/model/skill.ts`
- Create: `src/service/director/behavior-slug.ts`, `src/service/director/behavior-slug.test.ts`
- Modify: `src/service/director/jobs.ts` (skill load ~L37), `src/service/higgsfield/pipeline.ts` (`loadSkill` ~L80), `src/service/generation/task-senders.ts` (~L56)

**Interfaces:**
- Produces: `behaviorSlug(skill: Pick<Skill,"slug"|"baseSlug">): string`, `asRunSkill(skill: Skill): Skill` (returns `{ ...skill, slug: behaviorSlug(skill) }`), `isCustomSkill(skill): boolean`, `customSkillSlug(id: ObjectId): string`, type `DirectorChatMessage`.

- [ ] Add to `Skill`: `ownerClerkUserId?: string; baseSlug?: string; chat?: DirectorChatMessage[];` and zod optional fields. `DirectorChatMessage = { role: "user"|"assistant"; content: string; changedPaths?: string[]; createdAt: Date }`.
- [ ] Write failing test:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { asRunSkill, behaviorSlug, customSkillSlug, isCustomSkill } from "@/service/director/behavior-slug";

test("system skill keeps its slug", () => {
  assert.equal(behaviorSlug({ slug: "listicle-director" }), "listicle-director");
});
test("custom skill uses its template slug", () => {
  assert.equal(behaviorSlug({ slug: "custom-abc", baseSlug: "talking-head-director" }), "talking-head-director");
});
test("custom slug and owner detection", () => {
  const id = new ObjectId("65f000000000000000000001");
  assert.equal(customSkillSlug(id), "custom-65f000000000000000000001");
  assert.equal(isCustomSkill({ ownerClerkUserId: "u1" }), true);
  assert.equal(isCustomSkill({}), false);
});
test("asRunSkill swaps slug only", () => {
  const skill = { slug: "custom-x", baseSlug: "ending-director", systemPrompt: "p" } as never;
  const run = asRunSkill(skill) as { slug: string; systemPrompt: string };
  assert.equal(run.slug, "ending-director");
  assert.equal(run.systemPrompt, "p");
});
```

- [ ] Run `npx tsx --test src/service/director/behavior-slug.test.ts` → FAIL (module missing).
- [ ] Implement `behavior-slug.ts` (four tiny functions above).
- [ ] Run test → PASS.
- [ ] In the three loaders wrap the loaded skill: `const skill = asRunSkill(found)` so Phase A / Phase B / pipeline rules see the template slug.
- [ ] `npx tsc --noEmit` → clean. Commit `Add custom skill fields and behaviour slug.`

### Task 2: Selectable skills + video creation resolves skill first

**Files:**
- Create: `src/service/director/selectable-skills.ts`, `src/service/director/selectable-skills.test.ts`
- Modify: `src/presentation/serialize.ts` (`PublicSkill`, `toPublicSkill`, `PublicVideo.skillId`, `toPublicVideo`)
- Modify: `src/app/app/projects/[id]/page.tsx` (use `listSelectableSkills`)
- Modify: `src/service/project/actions.ts` (`readVideoBrief` signature, `createVideoAction`, update/restart action ~L395)

**Interfaces:**
- Produces: `selectableSkillFilter(clerkUserId: string)` → `{ isActive: true, $or: [{ ownerClerkUserId: { $exists: false } }, { ownerClerkUserId: clerkUserId }] }`; `listSelectableSkills(clerkUserId): Promise<Skill[]>` (system by `sortOrder`, then custom by `updatedAt` desc); `findSelectableSkill(clerkUserId, slug): Promise<Skill | null>`.
- `PublicSkill` gains `behaviorSlug: string; isCustom: boolean; updatedAt: string`. `PublicVideo` gains `skillId: string`.

- [ ] Failing test for `selectableSkillFilter` shape (deepEqual on the object above) and for a pure `sortSelectableSkills(skills)` ordering (system 2,1 then custom newer first).
- [ ] Run → FAIL; implement; run → PASS.
- [ ] `readVideoBrief(formData, clerkUserId, ruleSlug)` — use `ruleSlug` for every `isTalkingHeadSkill / skillBansNarration / isBookendSkill` check; still return `skillSlug` from the form.
- [ ] In `createVideoAction` and the update action: read `skillSlug` from formData, `const skill = await findSelectableSkill(user.clerkUserId, slug)`; if none → `"找不到風格"`; `const ruleSlug = behaviorSlug(skill)`; then `readVideoBrief(formData, user.clerkUserId, ruleSlug)`; `briefSkillError({ skillSlug: ruleSlug, ... })`; store `skillId: skill._id, skillSlug: ruleSlug`; `applySkillSceneText(ruleSlug, ...)`.
- [ ] Project page: `listSelectableSkills(user.clerkUserId)`.
- [ ] `npx tsc --noEmit`, run existing tests `npx tsx --test src/service/project/restart.test.ts src/presentation/components/app/projects/*.test.ts src/presentation/components/app/projects/new/*.test.ts` → PASS. Commit `Scope selectable skills to system plus owner.`

### Task 3: Pure draft-edit helper

**Files:**
- Create: `src/service/director/director-edits.ts`, `src/service/director/director-edits.test.ts`

**Interfaces:**
- Produces: `type DirectorDraft = { systemPrompt: string; references: SkillReference[] }`, `type DirectorEdit = { path: string; content: string }`, `SKILL_PATH = "SKILL.md"`, `draftPaths(draft): string[]`, `applyDirectorEdits(draft, edits): { ok: true; draft: DirectorDraft; changedPaths: string[] } | { ok: false; error: string }`, `changedDraftPaths(saved, draft): string[]`.

- [ ] Failing tests: replaces SKILL.md; replaces one reference and leaves others identical; unknown path → `{ ok:false, error:"AI 修改了不存在的檔案" }`; file over 60,000 chars → `{ ok:false, error:"檔案內容過長" }`; identical content not listed in `changedPaths`; `changedDraftPaths` lists only differing paths.
- [ ] Run → FAIL; implement; run → PASS. Commit `Add director draft edit helper.`

### Task 4: Director service + server actions

**Files:**
- Create: `src/service/director/director-actions.ts`, `src/service/director/director-chat-prompt.ts`
- Create: `src/presentation/actions/directors.ts`
- Modify: `src/presentation/serialize.ts` (add `PublicDirector`, `toPublicDirector`)
- Modify: `src/util/i18n/translate-app-error.ts` (new error strings)

**Interfaces:**
- `PublicDirector = PublicSkill & { baseSlug?: string; systemPrompt: string; references: SkillReference[]; chat: { role; content; changedPaths?: string[]; createdAt: string }[] }`.
- Actions (all return `{ ok: true, ... } | { ok: false; error: string }`):
  - `createDirectorAction({ templateSlug, title, description })` → `{ ok: true; id: string }`
  - `saveDirectorAction({ id, title, description, systemPrompt, references })` → `{ ok: true; director: PublicDirector }`
  - `deleteDirectorAction(id)` → `{ ok: true }`
  - `sendDirectorChatAction({ id, message, draft })` → `{ ok: true; summary: string; edits: DirectorEdit[]; changedPaths: string[]; chat: PublicDirector["chat"] }`
- Service helper `loadDirectorForUser(clerkUserId, id): Promise<Skill | null>` (system or owned) used by the detail page.

- [ ] `createDirector`: template = `findOne({ slug: templateSlug, ownerClerkUserId: { $exists: false }, isActive: true })`; new `_id`; `slug: customSkillSlug(_id)`, `baseSlug: template.slug`, `titleZh: title`, copy prompt/references/inputSchema/higgsfieldDefaults/sortOrder, `chat: []`. Errors: `"請輸入 Director 名稱"`, `"找不到模板"`.
- [ ] `saveDirector`: owned filter; reference path set must equal stored set (`"不可新增或刪除檔案"`); size limits; `$set` + `updatedAt`; `revalidatePath("/app/directors")` + detail path.
- [ ] `deleteDirector`: `deleteOne({ _id, ownerClerkUserId })`.
- [ ] `sendDirectorChat`: owned; `getActiveSubscription` + `isSubscriptionActive` else `"需要訂閱才能使用 AI 修改"`; message trim 1..2000 else `"訊息過長"`; validate draft paths match stored; call:

```ts
const { output } = await generateText({
  model: directorModel(),
  output: Output.object({ schema: directorChatSchema }),
  system: directorChatSystemPrompt(),
  prompt: directorChatUserPrompt({ draft, history: (skill.chat || []).slice(-20), message }),
});
```

  where `directorChatSchema = z.object({ summary: z.string(), edits: z.array(z.object({ path: z.string(), content: z.string() })) })`. Apply via `applyDirectorEdits`; on failure return error and do not write chat. On success `$push: { chat: { $each: [userMsg, assistantMsg], $slice: -100 } }`.
- [ ] `director-chat-prompt.ts`: system text per spec (editing a video director skill; `*prompt-contract.md` → Phase B, others Phase A, `examples.md` never sent to director; change only what was asked; keep markdown structure; return full content for each changed file only; summary in user's language). User prompt lists each file as `### FILE: <path>` fenced blocks, then history, then the request.
- [ ] Map new error strings in `translate-app-error.ts` to `errors.director*` keys (added in Task 5).
- [ ] `npx tsc --noEmit` → clean. Commit `Add director server actions and AI chat.`

### Task 5: i18n + left rail

**Files:**
- Create: `src/util/i18n/messages/workspace/directors.en.ts`, `directors.zh-Hant.ts`
- Modify: `src/util/i18n/messages/types.ts`, `en.ts`, `zh-Hant.ts` (+ `nav.directors` in `zh-Hans.ts` optional; others fall back), `workspace/errors.en.ts`, `errors.zh-Hant.ts`
- Modify: `src/presentation/components/app-shell.tsx`, `src/presentation/studio/studio-shell.tsx`

- [ ] `directorsEn` keys: `title, subtitle, systemSection, mineSection, mineEmpty, useTemplate, readOnly, templateLabel, nameLabel, namePlaceholder, descriptionLabel, descriptionPlaceholder, createTitle, createIntro, createSubmit, filesTitle, modified, save, saved, discard, delete, deleteTitle, deleteBody, chatTitle, chatPlaceholder, chatSend, chatEmpty, chatLocked, chatLockedCta, chatChanged, unsavedWarning, updated` with zh-Hant equivalents (`Director` / `系統 Director` / `我的 Director` / `以此為模板建立` …).
- [ ] `nav.directors`: en `"Director"`, zh-Hant `"Director"`, zh-Hans `"Director"`.
- [ ] Rail item after projects: `{ href: "/app/directors", label: t("nav.directors"), icon: "directors" }`; add `"directors"` to `StudioNavItem["icon"]` and a clapperboard SVG in `RailIcon`. Fix `items.splice(3, …)` index → `4` so affiliate stays before billing.
- [ ] `npx tsc --noEmit`. Commit `Add Director nav and messages.`

### Task 6: List page

**Files:**
- Create: `src/app/app/directors/page.tsx`
- Create: `src/presentation/components/app/directors/directors-header.tsx`, `director-card.tsx`, `director-grid.tsx`, `create-director-modal.tsx`

- [ ] Page (server): `requireAppUser`, `listSelectableSkills`, map `toPublicSkill`, split by `isCustom`; render header, system grid, mine grid.
- [ ] `DirectorCard` (client, mirrors `CharacterCard` styling `studio-card`): localized name via `localizedVideoType(t, behaviorSlug, title)` for system, `title` for custom; subtitle (other language for system / template name for custom); description `line-clamp-2`; link to `/app/directors/{id}`; system cards show `useTemplate` button opening `CreateDirectorModal`.
- [ ] `CreateDirectorModal` (client, same shell as `CreateCharacterModal`): name (max 60), description (max 300), Esc closes; submit → `createDirectorAction` → `router.push(/app/directors/{id})`.
- [ ] `DirectorGrid`: grid `sm:grid-cols-2 lg:grid-cols-3`; empty state for mine.
- [ ] Commit `Add Director list page.`

### Task 7: Detail page

**Files:**
- Create: `src/app/app/directors/[id]/page.tsx`
- Create: `src/presentation/components/app/directors/[id]/director-workspace.tsx`, `director-info-panel.tsx`, `director-file-section.tsx`, `director-chat-panel.tsx`, `director-chat-message.tsx`, `delete-director-dialog.tsx`, `use-unsaved-warning.ts`

- [ ] Page: validate ObjectId, `loadDirectorForUser`, 404 otherwise; pass `toPublicDirector`, `subscribed`.
- [ ] `DirectorWorkspace` (client): holds `saved` and `draft` (`title, description, systemPrompt, references`); `dirty = changedDraftPaths(saved, draft).length > 0 || title/description differ`; layout `grid lg:grid-cols-[minmax(0,1fr)_400px]`; system → info panel only + use-template button (reuses `CreateDirectorModal`).
- [ ] `DirectorInfoPanel`: title/description inputs (custom) or text (system), template badge, `DirectorFileSection` for SKILL.md then each reference (collapsible `<details>`, textarea when editable, 「已修改」badge), footer Save / Discard / Delete.
- [ ] `DirectorChatPanel`: list `chat`, textarea (max 2000) + send; on success merge `edits` into draft (`applyDirectorEdits` client-side result from server), update chat; locked state if not subscribed with link to `/app/billing`; error bubble on failure.
- [ ] `useUnsavedWarning(dirty)`: `beforeunload` listener.
- [ ] Commit `Add Director detail page with AI chat.`

### Task 8: Create-video dropdown

**Files:**
- Modify: `src/presentation/components/app/projects/[id]/skill-picker.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx`

- [ ] `SkillPicker` → `<select>` with `<optgroup label={t("directors.systemSection")}>` and (if any) `<optgroup label={t("directors.mineSection")}>`; styled like existing inputs (`min-h-[44px] rounded-full border border-accent-ink/15 bg-paper px-4 text-sm`); `SkillGuideRows slug={selected.behaviorSlug}`; selected system name + other-language subtitle shown under the dropdown.
- [ ] Form: initial selection `skills.find((s) => s.id === initialVideo?.skillId)?.slug ?? initialVideo?.skillSlug ?? …`; same in `resetBriefFromProject`; `const ruleSlug = skills.find((s) => s.slug === skillSlug)?.behaviorSlug ?? skillSlug;` and replace every rule call (`isBookendSkill`, `isTalkingHeadSkill`, `requiredCastCount`, `skillForcesSceneText`, `skillBansNarration`) on `skillSlug` with `ruleSlug`; `briefUnchanged` compares `project.skillId === selectedSkill?.id`; `selectedSkill` for title uses `project?.skillId` first.
- [ ] `npx tsc --noEmit`, `npm run lint`, all tests `npx tsx --test $(rg --files -g '*.test.ts' src)`. Commit `Switch video type to director dropdown.`

### Task 9: Browser verification

- [ ] `npm run dev`; open `/app/directors`: 9 system cards, empty mine section.
- [ ] Open a system card → read-only, no chat.
- [ ] Fork Talking-head → detail page; send "Add a rule: always end with a call to action" → SKILL.md shows 已修改; Save; reload shows content + chat history.
- [ ] Folder → new video: dropdown has both groups; choosing the custom director shows the talking-head script field.
