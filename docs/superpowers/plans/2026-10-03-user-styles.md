# User Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user fork a system style, edit it with a form and an AI chat, generate a 4-credit preview, and select that style on a new video or character.

**Architecture:** Custom styles are documents in a new `userStyles` collection. The nine system styles stay in `styles` and in the process-wide overlay. `loadRenderableStyle` resolves a `styleId` string to prompt fields. Frame and blueprint prompts take those fields explicitly so a user style never falls through to doodle. Preview images are `generationJobs` of kind `stylePreview`.

**Tech Stack:** Next.js 16 App Router, React 19, MongoDB driver 7, `node:test` via `npx tsx --test`, existing Higgsfield image queue, Gemini via `directorModel()`.

**Spec:** `docs/superpowers/specs/2026-10-03-user-styles-design.md`

## Global Constraints

- Custom styles live in `userStyles`. Do not write user rows into `styles`. The overlay from `hydrateStyles` stays the nine system styles only.
- Fork copies `name`, `description`, `canvas`, `canvasColor`, `look`, `palette`, `typography`, `motion`, `negatives`, and the five lettering fields. Later system edits do not change the copy.
- Name ≤ 60 characters. Description ≤ 300. Each prompt field and each lettering field ≤ 2,000. `canvasColor` is `#rrggbb`.
- AI may edit only `canvas`, `canvasColor`, `look`, `palette`, `typography`, `motion`, `negatives`, `letteringLayout`, `letteringLine1`, `letteringLine2`, `beatTitleLayout`, `reelLayout`. Name and description are hand-edited.
- Chat edits the client draft only. Save writes the draft. Chat requires an active subscription, message ≤ 2,000 characters, 20 user messages per hour, last 20 messages sent to the model, last 100 stored.
- Preview spends `FRAME_COST` (4) on the saved document, refunds once on failure, and refuses a second generate while one younger than 15 minutes is in flight.
- Missing `styleId` resolves to doodle. An unknown id or another user's id throws. It does not resolve to doodle.
- Soft-deleted styles stay resolvable for videos and characters that already point at them. Pickers omit them.
- New UI components are one component per file. Hook components start with `'use client'`. Server calls are server actions, not REST. Labels go through the i18n dictionaries.
- Reply and new UI copy for this product stay consistent with existing Directors wording (English in `en.ts`, Traditional Chinese in `zh-Hant.ts`).

---

### Task 1: User-style document and field copy

**Files:**
- Create: `src/model/user-style.ts`
- Create: `src/dao/user-styles.ts`
- Modify: `src/dao/index.ts`
- Create: `src/service/style/user-style-fields.ts`
- Test: `src/service/style/user-style-fields.test.ts`

**Interfaces:**
- Consumes: `Style`, `StyleId`, `STYLE_IDS`, `LETTERING_KEYS` from `@/service/style`.
- Produces:
  - `UserStyleDoc`, `StyleChatMessage`, `PreviewStatus`
  - `USER_STYLE_PROMPT_KEYS`, `USER_STYLE_VISUAL_KEYS`
  - `copyUserStyleFields(style: Style): UserStyleFields`
  - `type UserStyleFields` = the nine prompt fields plus five lettering strings
  - `parseUserStyleMeta(name: string, description: string): { ok: true; name: string; description: string } | { ok: false; error: string }`
  - `parseUserStyleFields(raw: unknown): { ok: true; fields: UserStyleFields } | { ok: false; error: string }`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { testStyle } from "@/service/style/test-styles";
import { copyUserStyleFields, parseUserStyleFields, parseUserStyleMeta } from "@/service/style/user-style-fields";

test("copyUserStyleFields snapshots the template, including lettering", () => {
  const copied = copyUserStyleFields(testStyle("pixel", {
    look: "chunky pixels",
    letteringLine1: "Line 1 is chunky pixel all-caps.",
  }));
  assert.equal(copied.look, "chunky pixels");
  assert.equal(copied.letteringLine1, "Line 1 is chunky pixel all-caps.");
  copied.look = "changed later";
  assert.equal(testStyle("pixel", { look: "chunky pixels" }).look, "chunky pixels");
});

test("parseUserStyleMeta rejects an empty name and a 61-character name", () => {
  assert.equal(parseUserStyleMeta("  ", "desc").ok, false);
  assert.equal(parseUserStyleMeta("n".repeat(61), "desc").ok, false);
  assert.equal(parseUserStyleMeta("Mine", "d".repeat(301)).ok, false);
  const ok = parseUserStyleMeta("  Mine  ", "desc");
  assert.equal(ok.ok && ok.name, "Mine");
});

test("parseUserStyleFields rejects a bad canvas color and an over-long look", () => {
  const base = copyUserStyleFields(testStyle("doodle"));
  assert.equal(parseUserStyleFields({ ...base, canvasColor: "white" }).ok, false);
  assert.equal(parseUserStyleFields({ ...base, look: "x".repeat(2001) }).ok, false);
  const ok = parseUserStyleFields({ ...base, canvasColor: "#112233" });
  assert.equal(ok.ok && ok.fields.canvasColor, "#112233");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/style/user-style-fields.test.ts`
Expected: FAIL with `Cannot find module '@/service/style/user-style-fields'`

- [ ] **Step 3: Write minimal implementation**

`src/model/user-style.ts` defines `StyleChatMessage` (`role`, `content`, `changedPaths?`, `createdAt`), `PreviewStatus = "idle" | "generating" | "failed"`, and `UserStyleDoc` with every field in the spec plus `previewCreditsCharged?: boolean` and `previewStartedAt?: Date`. `previewCreditsCharged` is the one-time refund claim. `previewStartedAt` is the age of the in-flight preview.

`src/dao/user-styles.ts`:

```ts
import type { Collection } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { UserStyleDoc } from "@/model/user-style";

export async function userStylesCollection(): Promise<Collection<UserStyleDoc>> {
  const db = await getDb();
  return db.collection<UserStyleDoc>("userStyles");
}
```

Export it from `src/dao/index.ts`.

`src/service/style/user-style-fields.ts`:

- `USER_STYLE_PROMPT_KEYS` = the nine prompt keys on `Style` except `id` (`name`, `description`, `canvas`, `canvasColor`, `look`, `palette`, `typography`, `motion`, `negatives`).
- `USER_STYLE_LETTERING_KEYS` = `LETTERING_KEYS`.
- `USER_STYLE_VISUAL_KEYS` = prompt keys except `name` and `description`, plus the five lettering keys.
- `copyUserStyleFields` copies those keys into a new object. Missing lettering becomes `""`.
- `parseUserStyleMeta` trims name and description and enforces 1–60 and 0–300.
- `parseUserStyleFields` requires every prompt key to be a string within 2,000 characters, `canvasColor` to match `/^#[0-9a-fA-F]{6}$/`, and each lettering key to be a string within 2,000 characters (missing lettering becomes `""`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/style/user-style-fields.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/user-style.ts src/dao/user-styles.ts src/dao/index.ts src/service/style/user-style-fields.ts src/service/style/user-style-fields.test.ts
git commit -m "$(cat <<'EOF'
Add the user-style document and field snapshot.

Custom styles need their own collection so a fork keeps the template fields after the system style changes.
EOF
)"
```

---

### Task 2: Resolve a style id without falling back to doodle

**Files:**
- Create: `src/service/style/renderable-style.ts`
- Test: `src/service/style/renderable-style.test.ts`
- Modify: `src/service/style/prompts.ts` (parameter type only)

**Interfaces:**
- Consumes: `Style`, `UserStyleDoc`, `copyUserStyleFields`, `resolvedStyle`, `isStyleId`, `ObjectId`.
- Produces:
  - `RenderableStyle` = `{ id: string } & UserStyleFields`
  - `renderableFromSystem(style: Style): RenderableStyle`
  - `renderableFromUserStyle(doc: UserStyleDoc): RenderableStyle`
  - `loadRenderableStyle(input: { styleId?: string; ownerClerkUserId: string; findUserStyle?: (id: string, owner: string) => Promise<UserStyleDoc | null> }): Promise<RenderableStyle>`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { installTestStyles, testStyle, uninstallTestStyles } from "@/service/style/test-styles";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import type { UserStyleDoc } from "@/model/user-style";

const owner = "user_1";

function userDoc(id: ObjectId, look: string, deletedAt?: Date): UserStyleDoc {
  const fields = { ...testStyle("doodle"), look, letteringLine1: "Line 1 is torn paper." };
  return {
    _id: id,
    ownerClerkUserId: owner,
    baseStyleId: "doodle",
    ...fields,
    letteringLayout: fields.letteringLayout ?? "",
    letteringLine1: fields.letteringLine1 ?? "",
    letteringLine2: fields.letteringLine2 ?? "",
    beatTitleLayout: fields.beatTitleLayout ?? "",
    reelLayout: fields.reelLayout ?? "",
    previewStatus: "idle",
    ...(deletedAt ? { deletedAt } : {}),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("missing styleId is doodle; a system id is that style; a user id uses the doc even if deleted", async () => {
  installTestStyles();
  const id = new ObjectId();
  const findUserStyle = async (styleId: string, clerkUserId: string) => {
    if (styleId === id.toHexString() && clerkUserId === owner) return userDoc(id, "torn paper", new Date());
    return null;
  };
  const missing = await loadRenderableStyle({ ownerClerkUserId: owner, findUserStyle });
  assert.equal(missing.id, "doodle");
  const pixel = await loadRenderableStyle({ styleId: "pixel", ownerClerkUserId: owner, findUserStyle });
  assert.match(pixel.look, /pixel/);
  const custom = await loadRenderableStyle({ styleId: id.toHexString(), ownerClerkUserId: owner, findUserStyle });
  assert.equal(custom.look, "torn paper");
  assert.equal(custom.letteringLine1, "Line 1 is torn paper.");
  await assert.rejects(
    () => loadRenderableStyle({ styleId: new ObjectId().toHexString(), ownerClerkUserId: "other", findUserStyle }),
    /style/i,
  );
  await assert.rejects(
    () => loadRenderableStyle({ styleId: "not-a-style", ownerClerkUserId: owner, findUserStyle }),
    /style/i,
  );
  uninstallTestStyles();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/style/renderable-style.test.ts`
Expected: FAIL with `Cannot find module '@/service/style/renderable-style'`

- [ ] **Step 3: Write minimal implementation**

`loadRenderableStyle`:

- No `styleId` or `""` → `renderableFromSystem(resolvedStyle(undefined))` (doodle). Call `hydrateStyles` only when the overlay throws; in tests `installTestStyles` already filled it, so catch is unnecessary if `resolvedStyle` works. Do not call Mongo for system ids.
- `isStyleId(styleId)` → `renderableFromSystem(resolvedStyle(styleId))`.
- `ObjectId.isValid(styleId)` → `findUserStyle`. The default finder queries `userStylesCollection` with `{ _id: new ObjectId(styleId), ownerClerkUserId }` and does **not** filter `deletedAt`. Missing doc throws `new Error(`Style "${styleId}" is missing`)`.
- Any other string throws the same error.

Change `styleLinesForFrame`, `styleLetteringLine`, `styleBlockForDirector`, and `styleLinesForBlueprint` to accept `Pick<Style, "name" | "canvas" | "look" | "palette" | "typography" | "motion" | "negatives">` so a `RenderableStyle` can be passed without a `StyleId`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/style/renderable-style.test.ts src/service/style/lettering.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/style/renderable-style.ts src/service/style/renderable-style.test.ts src/service/style/prompts.ts
git commit -m "$(cat <<'EOF'
Resolve user style ids without substituting doodle.

A video or character that points at a custom style must use that document, including after a soft delete.
EOF
)"
```

---

### Task 3: Fork, save, and soft-delete

**Files:**
- Create: `src/service/style/user-style-actions.ts`
- Create: `src/presentation/actions/styles.ts`
- Test: `src/service/style/user-style-actions.test.ts`

**Interfaces:**
- Consumes: `copyUserStyleFields`, `parseUserStyleMeta`, `parseUserStyleFields`, `userStylesCollection`, `stylesCollection`, `styleFromDoc`, `requireAppUser`.
- Produces:
  - `buildUserStyleInsert(...) : UserStyleDoc`
  - `createUserStyleAction({ baseStyleId, name, description })`
  - `saveUserStyleAction({ id, name, description, fields })`
  - `deleteUserStyleAction({ id })`
  - Result unions `{ ok: true; id: string } | { ok: false; error: string }` and `{ ok: true } | { ok: false; error: string }`

- [ ] **Step 1: Write the failing test**

Test the insert builder, not Mongo.

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { testStyle } from "@/service/style/test-styles";
import { buildUserStyleInsert } from "@/service/style/user-style-actions";

test("buildUserStyleInsert copies the template fields onto an owned document", () => {
  const template = testStyle("chalkboard", { look: "white chalk", letteringLine1: "white chalk line" });
  const doc = buildUserStyleInsert({
    ownerClerkUserId: "user_1",
    baseStyleId: "chalkboard",
    name: "My chalk",
    description: "dusty",
    template,
    now: new Date("2026-10-03T00:00:00Z"),
  });
  assert.equal(doc.ownerClerkUserId, "user_1");
  assert.equal(doc.baseStyleId, "chalkboard");
  assert.equal(doc.look, "white chalk");
  assert.equal(doc.letteringLine1, "white chalk line");
  assert.equal(doc.previewStatus, "idle");
  assert.equal(doc.deletedAt, undefined);
  assert.ok(doc._id instanceof ObjectId);
  template.look = "mutated";
  assert.equal(doc.look, "white chalk");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/style/user-style-actions.test.ts`
Expected: FAIL with `Cannot find module '@/service/style/user-style-actions'`

- [ ] **Step 3: Write minimal implementation**

`buildUserStyleInsert` returns a `UserStyleDoc` using `copyUserStyleFields(template)` plus owner, base id, trimmed meta, `previewStatus: "idle"`, `chat: []`, `createdAt`, `updatedAt`.

`createUserStyleAction`: `requireAppUser`, `parseUserStyleMeta`, `isStyleId(baseStyleId)`, load the system doc with `styleFromDoc`. Missing template returns `{ ok: false, error: "找不到模板" }`. `insertOne(buildUserStyleInsert(...))`. Return `{ ok: true, id }`.

`saveUserStyleAction`: ObjectId, `findOne({ _id, ownerClerkUserId, deletedAt: { $exists: false } })`. Missing → `{ ok: false, error: "找不到 Style" }`. `parseUserStyleMeta` + `parseUserStyleFields`. `$set` the fields and `updatedAt`.

`deleteUserStyleAction`: same ownership filter, `$set: { deletedAt: now, updatedAt: now }`.

`src/presentation/actions/styles.ts` is `"use server"` and re-exports the three actions the way `src/presentation/actions/directors.ts` re-exports director actions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/style/user-style-actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/style/user-style-actions.ts src/service/style/user-style-actions.test.ts src/presentation/actions/styles.ts
git commit -m "$(cat <<'EOF'
Fork a system style into an owned user style.

Save and delete stay on that copy so the nine system documents are never edited from the app.
EOF
)"
```

---

### Task 4: AI chat edits the visual draft only

**Files:**
- Create: `src/service/style/user-style-edits.ts`
- Create: `src/service/style/user-style-chat-prompt.ts`
- Modify: `src/service/style/user-style-actions.ts`
- Test: `src/service/style/user-style-edits.test.ts`
- Test: `src/service/style/user-style-chat-prompt.test.ts`

**Interfaces:**
- Consumes: `USER_STYLE_VISUAL_KEYS`, `RenderableStyle` fields, `chatRateLimited`, `directorModel`, `isSubscriptionActive`.
- Produces:
  - `applyUserStyleEdits(fields, edits): { ok: true; fields; changedFields } | { ok: false; error }`
  - `userStyleChatSystemPrompt(): string`
  - `userStyleChatUserPrompt({ fields, history, message }): string`
  - `sendUserStyleChatAction({ id, message, draft })`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { testStyle } from "@/service/style/test-styles";
import { copyUserStyleFields } from "@/service/style/user-style-fields";
import { applyUserStyleEdits } from "@/service/style/user-style-edits";

test("applyUserStyleEdits drops unknown fields and invalid colors, and reports real changes", () => {
  const fields = copyUserStyleFields(testStyle("doodle", { look: "marker", canvasColor: "#ffffff" }));
  const applied = applyUserStyleEdits(fields, [
    { field: "name", content: "hijack" },
    { field: "look", content: "torn paper" },
    { field: "canvasColor", content: "nope" },
    { field: "letteringLine1", content: "Line 1 is torn paper." },
  ]);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.deepEqual(applied.changedFields, ["look", "letteringLine1"]);
  assert.equal(applied.fields.look, "torn paper");
  assert.equal(applied.fields.canvasColor, "#ffffff");
  assert.equal("name" in applied.fields, true);
});

test("applyUserStyleEdits fails when nothing changes", () => {
  const fields = copyUserStyleFields(testStyle("doodle", { look: "marker" }));
  const applied = applyUserStyleEdits(fields, [{ field: "look", content: "marker" }]);
  assert.equal(applied.ok, false);
});
```

`user-style-chat-prompt.test.ts` asserts the system prompt lists the visual keys and says not to edit name or description, and the user prompt includes the current `look` and the latest user message.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/service/style/user-style-edits.test.ts src/service/style/user-style-chat-prompt.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

`applyUserStyleEdits` copies `fields`. For each edit, ignore a field that is not in `USER_STYLE_VISUAL_KEYS`. Ignore `canvasColor` that fails `/^#[0-9a-fA-F]{6}$/`. Ignore content longer than 2,000. Apply the rest. `changedFields` is the visual keys whose value differs. If that list is empty, return `{ ok: false, error: "AI 沒有修改任何欄位" }`.

Chat prompt system text: the model edits a visual style for an explainer still. It may replace only the visual keys. It must not rename the style. Return `{ summary, edits: { field, content }[] }`. Summary is one short sentence in the user's language.

`sendUserStyleChatAction` mirrors `sendDirectorChatAction`: owned non-deleted doc, subscription check, message trim and 2,000 cap, `chatRateLimited`, `generateText` + `Output.object` with `directorModel()`, `applyUserStyleEdits`. On zero changes, return the error and do not `$push` chat. On success, `$push` user + assistant messages with `$slice: -100`, and return `{ ok: true, summary, fields, changedFields }`. Do not `$set` the visual fields.

Re-export `sendUserStyleChatAction` from `src/presentation/actions/styles.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/style/user-style-edits.test.ts src/service/style/user-style-chat-prompt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/style/user-style-edits.ts src/service/style/user-style-edits.test.ts src/service/style/user-style-chat-prompt.ts src/service/style/user-style-chat-prompt.test.ts src/service/style/user-style-actions.ts src/presentation/actions/styles.ts
git commit -m "$(cat <<'EOF'
Let style chat edit the visual draft without saving it.

Name and description stay hand-edited, and a no-op reply does not append to the chat log.
EOF
)"
```

---

### Task 5: Preview prompt and stylePreview jobs

**Files:**
- Create: `src/service/style/user-style-preview.ts`
- Test: `src/service/style/user-style-preview.test.ts`
- Modify: `src/model/generation-job.ts`
- Modify: `src/service/generation/task-senders.ts`
- Modify: `src/service/generation/task-store.ts` (index on `userStyleId`)
- Modify: `src/service/higgsfield/pipeline.ts` (branch before the video persist path)
- Modify: `src/service/style/user-style-actions.ts`
- Modify: `src/service/generation/task-list.ts` (label only)

**Interfaces:**
- Consumes: `RenderableStyle`, `styleLinesForFrame`, `styleLetteringLine`, `resolveStyleLettering`, `FRAME_COST`, `insertPendingJob`, `consumeCredits`, `refundCredits`.
- Produces:
  - `stylePreviewPrompt(style: RenderableStyle): string`
  - `stylePreviewInFlight(doc, now): boolean`
  - `generateUserStylePreviewAction({ id })`
  - `syncStylePreviewJob(job, status, outputUrl)`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderableFromSystem } from "@/service/style/renderable-style";
import { testStyle } from "@/service/style/test-styles";
import { stylePreviewPrompt, stylePreviewInFlight } from "@/service/style/user-style-preview";
import type { UserStyleDoc } from "@/model/user-style";

test("stylePreviewPrompt uses the saved look and the shared IDEA scene", () => {
  const prompt = stylePreviewPrompt(renderableFromSystem(testStyle("paper-cutout", {
    look: "torn kraft",
    letteringLine1: "Line 1 is torn paper.",
  })));
  assert.match(prompt, /torn kraft/);
  assert.match(prompt, /Line 1 is torn paper/);
  assert.match(prompt, /IDEA/);
  assert.match(prompt, /16:9/);
});

test("stylePreviewInFlight is true only for a generating preview younger than 15 minutes", () => {
  const now = new Date("2026-10-03T01:00:00Z");
  const base = { previewStatus: "generating" as const, previewStartedAt: new Date("2026-10-03T00:50:00Z") };
  assert.equal(stylePreviewInFlight(base, now), true);
  assert.equal(stylePreviewInFlight({ ...base, previewStartedAt: new Date("2026-10-03T00:40:00Z") }, now), false);
  assert.equal(stylePreviewInFlight({ previewStatus: "idle" }, now), false);
});
```

The `UserStyleDoc` import can be removed if the helper takes `{ previewStatus: PreviewStatus; previewStartedAt?: Date }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/style/user-style-preview.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

`stylePreviewPrompt` joins `styleLinesForFrame(style)`, the scene string from `scripts/seed-style-previews.ts` (`STYLE_PREVIEW_SCENE` — move that constant into `src/service/style/preview-scene.ts` and import it from the seed script), `styleLetteringLine(style)`, the resolved lettering lines that are non-empty, `"The label must read exactly IDEA."`, and `"Aspect ratio 16:9."`.

`stylePreviewInFlight` returns true when `previewStatus === "generating"` and `previewStartedAt` is less than `15 * 60 * 1000` ms before `now`.

`generateUserStylePreviewAction`: owned, not deleted. If `stylePreviewInFlight`, return `{ ok: false, error: "預覽生成中" }`. `assertCanSpendCredits(user, FRAME_COST)` then `consumeCredits`. `$set` `{ previewStatus: "generating", previewStartedAt: now, previewCreditsCharged: true }`. `insertPendingJob({ kind: "stylePreview", userStyleId, clipIndex: 0, model: IMAGE_ROUTE_BY_SCENE_TEXT.en.model })`. On insert throw, refund `FRAME_COST`, set `previewStatus: "idle"`, `previewCreditsCharged: false`.

Add `"stylePreview"` to `GenerationKind` and the zod enum. Add optional `userStyleId?: ObjectId` on `GenerationJob`. Add index `{ userStyleId: 1, createdAt: -1 }` next to the character index in `ensureGenerationJobIndexes`.

`sendJob`: if `job.kind === "stylePreview"`, load the user style by `_id` only (deleted rows included), `loadRenderableStyle` is unnecessary because the doc is already the style, call `submitImage` with `stylePreviewPrompt`, aspect `16:9`, quality `medium`, resolution `1k`, and return `toSent`. Missing doc throws `PermanentJobError`.

In `pipeline.ts`, before the `job.kind === "character"` branch, handle `stylePreview`: on `completed` with a URL, `persistMedia` into a `style-previews/` folder, `$set` `previewUrl`, `previewFullUrl`, `previewHash` (sha256 of the prompt), `previewStatus: "idle"`. On `failed` or `nsfw`, claim `previewCreditsCharged: true` with `updateOne`, set `previewStatus: "failed"`, `previewCreditsCharged: false`, then `refundCredits(owner, FRAME_COST)`. If the claim matches 0 documents, do not refund. A success after soft-delete still writes the URLs and does not refund.

`task-list.ts`: kind `stylePreview` label 「風格預覽」 / `tasksPage.detail.stylePreview`. Add that i18n key beside the character blueprint key in `en.ts` and `zh-Hant.ts`.

Re-export `generateUserStylePreviewAction` from `src/presentation/actions/styles.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/style/user-style-preview.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/style/user-style-preview.ts src/service/style/user-style-preview.test.ts src/service/style/preview-scene.ts src/service/style/user-style-actions.ts src/presentation/actions/styles.ts src/model/generation-job.ts src/service/generation/task-senders.ts src/service/generation/task-store.ts src/service/generation/task-list.ts src/service/higgsfield/pipeline.ts scripts/seed-style-previews.ts src/util/i18n/messages/en.ts src/util/i18n/messages/zh-Hant.ts
git commit -m "$(cat <<'EOF'
Queue a four-credit preview for a saved user style.

Failure refunds once, and a preview that finishes after delete still stores the image.
EOF
)"
```

---

### Task 6: Frame and blueprint prompts read the resolved style

**Files:**
- Modify: `src/service/higgsfield/frame-prompts.ts`
- Modify: `src/service/higgsfield/pipeline.ts`
- Modify: `src/service/generation/task-senders.ts`
- Modify: `src/service/character/blueprint-prompt.ts`
- Modify: `src/service/character/generate.ts`
- Modify: `src/model/project.ts` (`styleId?: string`)
- Modify: `src/model/character.ts` (`styleId: string`)
- Test: `src/service/higgsfield/frame-prompts.test.ts`
- Test: `src/service/character/blueprint-prompt.test.ts`

**Interfaces:**
- Consumes: `loadRenderableStyle`, `RenderableStyle`.
- Produces: `buildFramePrompt(..., options: FramePromptOptions & { style?: RenderableStyle })`. `buildBlueprintPrompt` takes `style: RenderableStyle` instead of resolving `styleId` itself.

- [ ] **Step 1: Write the failing test**

Add to `frame-prompts.test.ts`:

```ts
test("a preloaded user style supplies look and lettering", () => {
  const custom = renderableFromSystem(testStyle("paper-cutout", {
    look: "torn kraft edges",
    letteringLayout: "Layout: cut-paper VO at 40% height.",
    letteringLine1: "Line 1 is torn dark-ink paper.",
  }));
  custom.id = new ObjectId().toHexString();
  const video = project();
  video.styleId = custom.id;
  video.skillSlug = "cartoon-explainer-video-director";
  const prompt = buildFramePrompt(video, 1, "start", { style: custom });
  assert.match(prompt, /torn kraft edges/);
  assert.match(prompt, /torn dark-ink paper/);
  assert.match(prompt, /40% height/);
});
```

`project()` currently types `styleId` as `StyleId`. After `Project.styleId` is `string`, assigning the hex is valid.

Add a blueprint test that `buildBlueprintPrompt({ style: custom, description: "a hero" })` contains `torn kraft edges` and does not call `resolvedStyle` for that id.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/higgsfield/frame-prompts.test.ts`
Expected: FAIL because `options.style` is ignored or the type rejects it

- [ ] **Step 3: Write minimal implementation**

`FramePromptOptions.style?: RenderableStyle`. `buildFramePrompt` uses `options.style ?? systemStyle(project)`, where `systemStyle` calls `resolvedStyle` only when `!project.styleId || isStyleId(project.styleId)`. Otherwise it throws `Style "${id}" must be loaded`.

`sendStill`, `sendFrame`, and `sendVideo` in `pipeline.ts` and `task-senders.ts` `await loadRenderableStyle({ styleId: project.styleId, ownerClerkUserId: project.clerkUserId })` once and pass `{ style }` into `buildFramePrompt` / `runPhaseBForClip`. `runPhaseBForClip` already takes `style: Style`; widen that parameter to the same prompt-field pick as `styleBlockForDirector`.

`buildBlueprintPrompt` stops calling `resolvedStyle`. `sendCharacterVersion` loads the style with `character.clerkUserId` and `character.styleId` and passes `style`.

Widen `Project.styleId` and `Character.styleId` to `string`. Update `PublicVideo.styleId` and `PublicCharacter.styleId` to `string`. `resolveStyleId` remains for callers that only know system ids. Grep `styleId: StyleId` and fix assignments that pass a user id through a `StyleId` parameter by using `string`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/service/higgsfield/frame-prompts.test.ts src/service/style/renderable-style.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/higgsfield/frame-prompts.ts src/service/higgsfield/frame-prompts.test.ts src/service/higgsfield/pipeline.ts src/service/generation/task-senders.ts src/service/character/blueprint-prompt.ts src/service/character/generate.ts src/model/project.ts src/model/character.ts src/presentation/serialize.ts
git commit -m "$(cat <<'EOF'
Render frames and blueprints from the resolved user style.

An unknown style id fails the job instead of quietly drawing doodle.
EOF
)"
```

---

### Task 7: List system and mine styles in the pickers

**Files:**
- Modify: `src/presentation/serialize.ts` (`PublicStyle`)
- Modify: `src/service/style/list.ts`
- Create: `src/service/style/list-selectable.ts`
- Test: `src/service/style/list-selectable.test.ts`
- Modify: `src/presentation/components/style-picker.tsx`
- Modify: `src/util/style-i18n.ts`

**Interfaces:**
- Consumes: `PublicStyle`, `UserStyleDoc`, `listPublicStyles`.
- Produces:
  - `PublicStyle` gains `isCustom: boolean`, `baseStyleId?: StyleId`, `templateName?: string`
  - `selectableUserStyleFilter(clerkUserId)`
  - `toPublicUserStyle(doc, templatePreviewUrl, templateName): PublicStyle`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { selectableUserStyleFilter, toPublicUserStyle } from "@/service/style/list-selectable";
import type { UserStyleDoc } from "@/model/user-style";

test("picker query hides deleted styles and other owners", () => {
  assert.deepEqual(selectableUserStyleFilter("user_1"), {
    ownerClerkUserId: "user_1",
    deletedAt: { $exists: false },
  });
});

test("a user style without a preview inherits the template still", () => {
  const doc = {
    _id: new ObjectId(),
    ownerClerkUserId: "user_1",
    baseStyleId: "pixel",
    name: "Mine",
    description: "pixels",
    canvasColor: "#111111",
    previewStatus: "idle",
  } as UserStyleDoc;
  const pub = toPublicUserStyle(doc, "https://template", "Pixel");
  assert.equal(pub.isCustom, true);
  assert.equal(pub.previewUrl, "https://template");
  assert.equal(pub.templateName, "Pixel");
  assert.equal(pub.id, doc._id.toHexString());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/style/list-selectable.test.ts`
Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

`listPublicStyles` sets `isCustom: false` on each system row.

`listSelectableStyles(clerkUserId)` returns `{ system: PublicStyle[]; mine: PublicStyle[] }`. `mine` uses `selectableUserStyleFilter`, sorts `updatedAt` desc, and fills a missing `previewUrl` from the system doc's `previewUrl`. `templateName` is the system style `name`.

`PublicStyle.id` becomes `string`. `localizedStyleName` keeps taking a system id; the picker uses `style.isCustom ? style.name : localizedStyleName(style.id as StyleId)`.

`StylePicker` renders two groups when any style has `isCustom`, using the same group labels as the skill picker (`directors.systemSection` / `directors.mineSection`) until Task 8 adds `styles.systemSection`. Pass the combined list from the new-video form and the character form via `listSelectableStyles`. Replace their current `listPublicStyles()` call. `onChange` already receives the id string.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/style/list-selectable.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/style/list-selectable.ts src/service/style/list-selectable.test.ts src/service/style/list.ts src/presentation/serialize.ts src/presentation/components/style-picker.tsx src/util/style-i18n.ts src/service/project/load-folder-studio.ts src/presentation/components/app/projects/new/new-project-form.tsx
git commit -m "$(cat <<'EOF'
Show system styles and the user's styles in the pickers.

A custom card uses the template still until that style has its own preview.
EOF
)"
```

Grep other `listPublicStyles` call sites (character create, MCP) and include those files in this commit if they must show mine styles. MCP can keep listing system styles only.

---

### Task 8: Styles pages

**Files:**
- Create: `src/app/app/styles/page.tsx`
- Create: `src/app/app/styles/[id]/page.tsx`
- Create: `src/presentation/components/app/styles/styles-header.tsx`
- Create: `src/presentation/components/app/styles/style-grid.tsx`
- Create: `src/presentation/components/app/styles/style-card.tsx`
- Create: `src/presentation/components/app/styles/create-style-modal.tsx`
- Create: `src/presentation/components/app/styles/[id]/style-workspace.tsx`
- Create: `src/presentation/components/app/styles/[id]/style-info-panel.tsx`
- Create: `src/presentation/components/app/styles/[id]/style-chat-panel.tsx`
- Create: `src/presentation/components/app/styles/[id]/style-preview-button.tsx`
- Create: `src/presentation/components/app/styles/[id]/delete-style-dialog.tsx`
- Create: `src/util/i18n/messages/workspace/styles.en.ts`
- Create: `src/util/i18n/messages/workspace/styles.zh-Hant.ts`
- Modify: `src/presentation/components/app-shell.tsx`
- Modify: `src/presentation/studio/studio-shell.tsx`
- Modify: `src/util/i18n/messages/types.ts`
- Modify: `src/util/i18n/messages/en.ts`
- Modify: `src/util/i18n/messages/zh-Hant.ts`

**Interfaces:**
- Consumes: the actions from Task 3–5, `listSelectableStyles`, `loadRenderableStyle` is not used on the page. Page loader: `loadStyleForUser(clerkUserId, id)` returns a system `PublicStyle` detail or the owned user doc.
- Produces: routes `/app/styles` and `/app/styles/[id]`.

- [ ] **Step 1: Add the nav item and message keys**

`Messages.nav` gains `styles: string`. Set `en` to `"Style"` and `zh-Hant` to `"風格"`. Add the key to every other locale file that is assigned `Messages` and fails `yarn build`.

`StudioNavItem["icon"]` gains `"styles"`. `RailIcon` draws four rounded squares (a swatch). `AppShell` inserts `{ href: "/app/styles", label: t("nav.styles"), icon: "styles" }` between directors and characters.

`styles.en.ts` exports `StylesMessages` with: `systemSection`, `mineSection`, `readOnly`, `useTemplate`, `templateBadge`, `nameLabel`, `descriptionLabel`, `save`, `discard`, `delete`, `backToList`, `unsavedWarning`, `saved`, `generatePreview`, `previewGenerating`, `previewFailed`, field labels for canvas, canvasColor, look, palette, typography, motion, negatives, and the five lettering keys. `styles.zh-Hant.ts` provides the Traditional Chinese strings. Wire both into `en.ts` and `zh-Hant.ts` the way `directorsEn` is wired, and add `styles: StylesMessages` on `Messages`.

- [ ] **Step 2: List page**

`src/app/app/styles/page.tsx` calls `requireAppUser` and `listSelectableStyles`. It renders `StylesHeader`, then `StyleGrid section="system"`, then `StyleGrid section="mine"`.

`style-card.tsx` links to `/app/styles/${style.id}`. System cards show `styles.readOnly` and `CreateStyleButton`. Mine cards show `styles.templateBadge` and `updatedAt`.

`create-style-modal.tsx` is `'use client'`. It copies `create-director-modal.tsx`: name, description, calls `createUserStyleAction({ baseStyleId: style.id, name, description })`, then `router.push(`/app/styles/${result.id}`)`.

- [ ] **Step 3: Detail page**

`src/app/app/styles/[id]/page.tsx` loads a system style by `isStyleId(id)` or an owned non-deleted user style. Otherwise `notFound()`. Pass `subscribed` from `isSubscriptionActive`.

`style-workspace.tsx` is `'use client'`. Layout matches `director-workspace.tsx`: back link, preview on top, two columns when `style.isCustom`.

`style-info-panel.tsx` holds the draft state for every field from `parseUserStyleFields`. System mode renders the values as text and the template button. Custom mode renders inputs, Save (`saveUserStyleAction`), Discard (reset draft), Delete. `dirty` is a field-wise compare against the saved props.

`style-preview-button.tsx` shows `t("styles.generatePreview", { credits: 4 })`. It is disabled when `dirty` or `previewStatus === "generating"`. Click calls `generateUserStylePreviewAction({ id })` and then `router.refresh()`. While generating, the page polls with the same interval pattern as `use-character-poll` until `previewStatus !== "generating"`.

`style-chat-panel.tsx` copies the director chat panel. Send calls `sendUserStyleChatAction({ id, message, draft })`. On success, replace the visual fields on the draft and leave `dirty` true. Do not call save.

`delete-style-dialog.tsx` calls `deleteUserStyleAction` and `router.push("/app/styles")`.

- [ ] **Step 4: Verify in the browser**

Start the app. Open `/app/styles`. Confirm the nine system cards and an empty mine section. Fork doodle. Confirm the detail form is filled with doodle's look, the chat column is present, and Generate is disabled until Save. Save, then Generate, and confirm the button shows a generating state. Open a new video and confirm the style picker lists the new style under mine.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/styles src/presentation/components/app/styles src/presentation/components/app-shell.tsx src/presentation/studio/studio-shell.tsx src/util/i18n
git commit -m "$(cat <<'EOF'
Add the Styles library beside Directors.

Users can fork a system style, edit the draft, and generate a preview from the saved fields.
EOF
)"
```

---

## Self-review

Spec coverage:

- `userStyles` collection, copy-on-fork, soft delete: Tasks 1 and 3.
- `loadRenderableStyle` rules: Task 2.
- Chat limits, visual-only edits, draft not saved: Task 4.
- 4-credit preview, in-flight lock, refund once, success after delete: Task 5.
- Frame and blueprint use the user style and do not fall back to doodle: Task 6.
- Pickers split system and mine and inherit the template still: Task 7.
- Pages, nav, read-only system detail, dirty preview guard: Task 8.
- Browser pass listed in Task 8 Step 4.

No requirement left without a task. `previewCreditsCharged` and `previewStartedAt` are the refund claim and the 15-minute clock; they are not extra product behavior.
