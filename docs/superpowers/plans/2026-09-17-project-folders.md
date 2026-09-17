# Project Folders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a project into a named folder that can hold many videos, with a dashboard folder grid and a split workspace (video list + existing reel form/stepper).

**Architecture:** Two Mongo collections: `projects` (folders: name + owner) and `videos` (today’s job document plus `projectId`). Higgsfield jobs keep `projectId` as the **video** `_id`. A one-shot migration wraps each legacy video in a folder named from its storyboard title.

**Tech Stack:** Next.js 16 App Router, MongoDB, Server Actions, Framer Motion, existing director/Higgsfield pipeline.

**Spec:** `docs/superpowers/specs/2026-09-17-project-folders-design.md`

## Global Constraints

- Reply UI copy in Traditional Chinese; keep code identifiers in English.
- New page-only UI components live in the same directory as the page; generic ones go in `src/components/`.
- Components with `useEffect` / client state start with `'use client'`.
- `db.collection('name')` always uses a type parameter.
- Prefer server actions over new REST routes.
- Follow existing visual language (rounded cards, StatusBadge, stepper, lime/accent).
- Do not commit unless the user asked.
- Billing credit packs / remaining-credit progress are **out of scope**.
- Do not rename `generationJobs.projectId`.

## File map

| File | Responsibility |
|---|---|
| `src/types/folder.ts` | Folder document type |
| `src/types/project.ts` | Today’s video document; add `projectId` |
| `src/lib/folder.ts` | Pure helpers: legacy detect, folder name, status roll-up |
| `src/lib/folder.test.ts` | Node tests for those helpers |
| `src/lib/collections.ts` | `videosCollection()`; `projectsCollection()` typed as Folder |
| `src/lib/serialize.ts` | `PublicFolder` + `PublicVideo` (keep `PublicProject` alias = video during transition, then replace) |
| `scripts/migrate-project-folders.ts` | Idempotent wrap migration |
| `src/lib/director/jobs.ts` | Read/write `videosCollection` |
| `src/lib/higgsfield/pipeline.ts` | Read/write `videosCollection` |
| `src/lib/actions/projects.ts` | Folder CRUD + video create/get/revise/retry via videos |
| `src/lib/actions/generation.ts` | Load videos, not projects |
| `src/app/app/page.tsx` | Folder grid |
| `src/app/app/project-grid.tsx` | Folder cards + filters |
| `src/app/app/project-card.tsx` | Folder card (count, cover, roll-up badge) |
| `src/app/app/create-folder-modal.tsx` | Name-only modal |
| `src/app/app/projects/new/page.tsx` | Redirect `/app` |
| `src/app/app/projects/[id]/page.tsx` | Split workspace server page |
| `src/app/app/projects/[id]/project-workspace.tsx` | Client split pane |
| `src/app/app/projects/[id]/video-list.tsx` | Left list |
| `src/app/app/projects/[id]/skill-picker.tsx` | Style picker for create form |
| `src/app/app/projects/new/new-project-form.tsx` | Accept `projectId` + optional skills; `createVideoAction` |
| `src/app/app/skills/skill-card.tsx` | Catalog only, link to `/app` |

---

### Task 1: Folder helpers + tests

**Files:**
- Create: `src/lib/folder.ts`
- Create: `src/lib/folder.test.ts`
- Modify: `src/lib/project-status.ts` (export `STATUS_META` already public; helpers import it)

**Interfaces:**
- Consumes: `ProjectStatus`, `STATUS_META` from `@/lib/project-status`
- Produces:
  - `looksLikeLegacyVideo(doc: { name?: string; skillSlug?: string }): boolean`
  - `folderNameFromVideo(video: { phaseA?: { localizedTitle?: string; englishTitle?: string } }): string`
  - `folderRollupStatus(statuses: ProjectStatus[]): ProjectStatus`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/folder.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  folderNameFromVideo,
  folderRollupStatus,
  looksLikeLegacyVideo,
} from "./folder";

test("legacy video has skillSlug and no name", () => {
  assert.equal(looksLikeLegacyVideo({ skillSlug: "cartoon-explainer-video-director" }), true);
  assert.equal(looksLikeLegacyVideo({ name: "Campaign", skillSlug: "x" }), false);
  assert.equal(looksLikeLegacyVideo({ name: "Campaign" }), false);
});

test("folder name prefers localized title and caps at 80 chars", () => {
  assert.equal(
    folderNameFromVideo({ phaseA: { localizedTitle: "複利", englishTitle: "Compound" } }),
    "複利",
  );
  assert.equal(folderNameFromVideo({}), "未命名專案");
  assert.equal(folderNameFromVideo({ phaseA: { localizedTitle: "x".repeat(90) } }).length, 80);
});

test("rollup prefers failed, then busy, then action, then all ready, else draft", () => {
  assert.equal(folderRollupStatus([]), "draft");
  assert.equal(folderRollupStatus(["ready", "failed"]), "failed");
  assert.equal(folderRollupStatus(["ready", "generating"]), "generating");
  assert.equal(folderRollupStatus(["ready", "awaiting_approval"]), "awaiting_approval");
  assert.equal(folderRollupStatus(["ready", "ready"]), "ready");
});
```

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npx tsx --test src/lib/folder.test.ts`  
Expected: FAIL `Cannot find module './folder'`

- [ ] **Step 3: Implement helpers**

Create `src/lib/folder.ts`:

```ts
import { STATUS_META, type StatusFilter } from "@/lib/project-status";
import type { ProjectStatus } from "@/types/project";

const NAME_MAX = 80;

export function looksLikeLegacyVideo(doc: { name?: string; skillSlug?: string }) {
  return !doc.name && Boolean(doc.skillSlug);
}

export function folderNameFromVideo(video: {
  phaseA?: { localizedTitle?: string; englishTitle?: string };
}) {
  const raw =
    video.phaseA?.localizedTitle || video.phaseA?.englishTitle || "未命名專案";
  return raw.trim().slice(0, NAME_MAX) || "未命名專案";
}

export function sanitizeFolderName(input: string) {
  const name = input.trim().slice(0, NAME_MAX);
  return name || "";
}

export function folderRollupStatus(statuses: ProjectStatus[]): ProjectStatus {
  if (statuses.length === 0) return "draft";
  if (statuses.some((status) => status === "failed")) return "failed";
  const busy = statuses.find((status) => STATUS_META[status].busy);
  if (busy) return busy;
  const action = statuses.find((status) => STATUS_META[status].tone === "action");
  if (action) return action;
  if (statuses.every((status) => status === "ready")) return "ready";
  return statuses[0];
}

export function folderMatchesFilter(status: ProjectStatus, filter: StatusFilter) {
  const { matchesFilter } = require("@/lib/project-status") as typeof import("@/lib/project-status");
  return matchesFilter(status, filter);
}
```

Do **not** use `require`. Import `matchesFilter` at the top and re-export a thin wrapper or call it directly from the grid later. In this task, omit `folderMatchesFilter` — grid can call `matchesFilter(folderRollupStatus(statuses), filter)`.

- [ ] **Step 4: Re-run tests**

Run: `npx tsx --test src/lib/folder.test.ts`  
Expected: PASS all 3 tests

- [ ] **Step 5: Commit only if the user asked**

```bash
git add src/lib/folder.ts src/lib/folder.test.ts
git commit -m "Add folder naming and status roll-up helpers"
```

---

### Task 2: Types, collections, serialize

**Files:**
- Create: `src/types/folder.ts`
- Modify: `src/types/project.ts` (add `projectId: ObjectId` to `Project`)
- Modify: `src/lib/collections.ts`
- Modify: `src/lib/serialize.ts`

**Interfaces:**
- Consumes: helpers from Task 1 (not required here)
- Produces:
  - `Folder` type
  - `videosCollection(): Promise<Collection<OptionalId<Project>>>`
  - `projectsCollection(): Promise<Collection<OptionalId<Folder>>>`
  - `PublicFolder`, `PublicVideo` (rename today’s `PublicProject` → `PublicVideo`, keep `export type PublicProject = PublicVideo` temporarily)
  - `toPublicFolder(folder, videos: PublicVideo[]): PublicFolder`
  - `toPublicVideo(video: Project): PublicVideo`

- [ ] **Step 1: Add `src/types/folder.ts`**

```ts
import type { ObjectId } from "mongodb";

export type Folder = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};
```

- [ ] **Step 2: Add `projectId` on `Project` in `src/types/project.ts`**

After `clerkUserId: string;` add:

```ts
  // Parent folder. Required for new videos; set by migration for legacy rows.
  projectId: ObjectId;
```

- [ ] **Step 3: Collections**

In `src/lib/collections.ts` import `Folder`. Change `projectsCollection` to `Collection<OptionalId<Folder>>`. Add:

```ts
export async function videosCollection(): Promise<
  Collection<OptionalId<Project>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Project>>("videos");
}
```

- [ ] **Step 4: Serialize**

Replace `PublicProject` fields usage:

```ts
export type PublicVideo = {
  id: string;
  projectId: string;
  skillSlug: string;
  source: string;
  aspectRatio: Project["aspectRatio"];
  durationPreset: Project["durationPreset"];
  language: NonNullable<Project["language"]>;
  characterImageUrl?: string;
  characterStillUrl?: string;
  status: Project["status"];
  phaseA?: Project["phaseA"];
  frames: NonNullable<Project["frames"]>;
  framesCreditCost: number;
  clips: Project["clips"];
  creditCost: number;
  error?: string;
  createdAt: string;
};

export type PublicProject = PublicVideo; // remove after call sites updated

export type PublicFolder = {
  id: string;
  name: string;
  status: Project["status"];
  videoCount: number;
  previewUrl: string | null;
  createdAt: string;
  videos: PublicVideo[];
};

export function toPublicVideo(video: Project): PublicVideo {
  return {
    id: video._id.toHexString(),
    projectId: video.projectId.toHexString(),
    skillSlug: video.skillSlug,
    source: video.source,
    aspectRatio: video.aspectRatio,
    durationPreset: video.durationPreset,
    language: video.language || "en",
    characterImageUrl: video.characterImageUrl,
    characterStillUrl: video.characterStillUrl,
    status: video.status,
    phaseA: video.phaseA,
    frames: video.frames || [],
    framesCreditCost: video.framesCreditCost || 0,
    clips: video.clips,
    creditCost: video.creditCost,
    error: video.error,
    createdAt: video.createdAt.toISOString(),
  };
}

export function toPublicFolder(folder: Folder, videos: Project[]): PublicFolder {
  const publicVideos = videos
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(toPublicVideo);
  const statuses = videos.map((video) => video.status);
  const cover =
    publicVideos.find((video) => previewFromVideo(video)) || publicVideos[0];
  return {
    id: folder._id.toHexString(),
    name: folder.name,
    status: folderRollupStatus(statuses),
    videoCount: videos.length,
    previewUrl: cover ? previewFromVideo(cover) : null,
    createdAt: folder.createdAt.toISOString(),
    videos: publicVideos,
  };
}

function previewFromVideo(video: PublicVideo) {
  const frames = video.frames.filter((frame) => frame.status === "completed");
  const first =
    frames.find((frame) => frame.clipNumber === 1 && frame.position === "start") ||
    frames[0];
  return (
    first?.blobUrl ||
    first?.outputUrl ||
    video.characterStillUrl ||
    video.characterImageUrl ||
    null
  );
}
```

Move `previewImage` logic here so the grid does not import a client card helper. Export `previewFromVideo` as `videoPreviewUrl`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`  
Expected: errors at every `projectsCollection()` call site still typed as video. That is the next task. If Task 2 is committed alone, it will not typecheck the app — **do Task 3 in the same sitting** if tsc is the gate. Prefer finishing Task 3 before considering Task 2 done.

---

### Task 3: Point pipeline + actions at `videos`

**Files:**
- Modify: `src/lib/director/jobs.ts` (all `projectsCollection` → `videosCollection`)
- Modify: `src/lib/higgsfield/pipeline.ts` (same)
- Modify: `src/lib/actions/generation.ts` (same; return `toPublicVideo`)
- Modify: `src/lib/actions/projects.ts` (split folder vs video actions)

**Interfaces:**
- Consumes: `videosCollection`, `toPublicVideo`
- Produces:
  - `createFolderAction(name: string): Promise<{ ok: true; folder: { id: string; name: string } } | { ok: false; error: string }>`
  - `renameFolderAction(folderId: string, name: string): Promise<{ ok: true } | { ok: false; error: string }>`
  - `createVideoAction(formData: FormData): Promise<{ ok: true; project: PublicVideo } | { ok: false; error: string }>`  
    Form fields: existing plus required `projectId`
  - `getVideoAction(videoId: string)` — rename from `getProjectAction` but **keep export alias** `getProjectAction = getVideoAction` until the poll hook is updated
  - `reviseProjectAction` / `retryProjectAction` load from `videosCollection`, ownership via video then parent folder’s `clerkUserId` (video still has `clerkUserId`)

- [ ] **Step 1: Mechanical replace in jobs + pipeline + generation**

Replace `projectsCollection` with `videosCollection` and `toPublicProject` with `toPublicVideo`. Keep returning `{ ok: true, project: video }` so existing client destructuring still works.

- [ ] **Step 2: Rewrite `createProjectAction` into two functions in `src/lib/actions/projects.ts`**

`createFolderAction`:

```ts
export async function createFolderAction(name: string) {
  const user = await requireAppUser();
  const trimmed = sanitizeFolderName(name);
  if (!trimmed) return { ok: false as const, error: "請輸入專案名稱" };
  const folders = await projectsCollection();
  const now = new Date();
  const insert = await folders.insertOne({
    userId: user._id,
    clerkUserId: user.clerkUserId,
    name: trimmed,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/app");
  return { ok: true as const, folder: { id: insert.insertedId.toHexString(), name: trimmed } };
}
```

`createVideoAction`: copy today’s `createProjectAction`, but:

```ts
const projectId = String(formData.get("projectId") || "");
if (!ObjectId.isValid(projectId)) return { ok: false, error: "專案不存在" };
const folders = await projectsCollection();
const folder = await folders.findOne({
  _id: new ObjectId(projectId),
  clerkUserId: user.clerkUserId,
});
if (!folder) return { ok: false, error: "專案不存在" };
const videos = await videosCollection();
const insert = await videos.insertOne({
  projectId: folder._id,
  userId: user._id,
  clerkUserId: user.clerkUserId,
  // ...same video fields as today
});
after(() => runPhaseAJob(insert.insertedId));
await folders.updateOne({ _id: folder._id }, { $set: { updatedAt: new Date() } });
```

Keep `export const createProjectAction = createVideoAction` until the form is updated in Task 6.

`reviseProjectAction` / `retryProjectAction` / `getProjectAction`: `videosCollection().findOne({ _id, clerkUserId })`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`  
Expected: remaining errors only in `src/app/app/page.tsx` and `src/app/app/projects/[id]/page.tsx` (still treating folders as videos). Fix those in Tasks 4–5. Temporary: those pages will not compile until then — implement Task 4 immediately after.

---

### Task 4: Migration script

**Files:**
- Create: `scripts/migrate-project-folders.ts`
- Modify: `package.json` scripts `"migrate:folders": "tsx scripts/migrate-project-folders.ts"`

**Interfaces:**
- Consumes: `looksLikeLegacyVideo`, `folderNameFromVideo`, `getDb`
- Produces: CLI that prints `{ wrapped: number, skipped: number }`

- [ ] **Step 1: Write the script**

Follow `scripts/seed-skills.ts` env loading. Logic:

```ts
const db = await getDb();
const projects = db.collection("projects");
const videos = db.collection("videos");
const legacy = await projects.find({ skillSlug: { $exists: true }, name: { $exists: false } }).toArray();
let wrapped = 0;
let skipped = 0;
for (const doc of legacy) {
  const exists = await videos.findOne({ _id: doc._id });
  if (exists) {
    skipped += 1;
    continue;
  }
  const now = new Date();
  const folder = await projects.insertOne({
    userId: doc.userId,
    clerkUserId: doc.clerkUserId,
    name: folderNameFromVideo(doc),
    createdAt: doc.createdAt || now,
    updatedAt: now,
  });
  const { _id, ...rest } = doc;
  await videos.insertOne({
    _id,
    ...rest,
    projectId: folder.insertedId,
  });
  await projects.deleteOne({ _id: doc._id });
  wrapped += 1;
}
console.log({ wrapped, skipped });
```

Use typed collections from `@/lib/collections` if `getDb` is exported; otherwise duplicate the env bootstrap from seed-skills.

- [ ] **Step 2: Dry-run on local Mongo**

Run: `npx tsx scripts/migrate-project-folders.ts`  
Expected: `{ wrapped: N, skipped: 0 }` first run; second run `{ wrapped: 0, skipped: 0 }` (legacy query empty). If first run wrapped > 0, second run still 0.

- [ ] **Step 3: Add npm script**

`"migrate:folders": "tsx scripts/migrate-project-folders.ts"`

---

### Task 5: Dashboard folder grid + create modal

**Files:**
- Modify: `src/app/app/page.tsx`
- Modify: `src/app/app/project-grid.tsx`
- Modify: `src/app/app/project-card.tsx`
- Create: `src/app/app/create-folder-modal.tsx`
- Modify: `src/app/app/project-filters.tsx` (counts from folder roll-up status)

**Interfaces:**
- Consumes: `createFolderAction`, `PublicFolder`, `matchesFilter`
- Produces: `/app` lists folders; modal creates folder and `router.push(/app/projects/${id})`

- [ ] **Step 1: Load folders + videos on the server**

`src/app/app/page.tsx`:

```ts
const folders = await projectsCollection();
const videos = await videosCollection();
const folderDocs = await folders
  .find({ clerkUserId: user.clerkUserId, name: { $exists: true } })
  .sort({ updatedAt: -1 })
  .limit(120)
  .toArray();
const videoDocs = await videos
  .find({ clerkUserId: user.clerkUserId })
  .toArray();
const videosByFolder = new Map<string, typeof videoDocs>();
for (const video of videoDocs) {
  const key = video.projectId.toHexString();
  const list = videosByFolder.get(key) || [];
  list.push(video);
  videosByFolder.set(key, list);
}
const publicFolders = folderDocs.map((folder) =>
  toPublicFolder(folder, videosByFolder.get(folder._id.toHexString()) || []),
);
```

Pass `publicFolders` to `ProjectGrid`. Header button opens the modal (client wrapper) instead of linking to `/app/skills`.

- [ ] **Step 2: Rewrite `ProjectCard` for folders**

- Title: `folder.name`
- Image: `folder.previewUrl` or placeholder
- Badge: `StatusBadge` with `folder.status`
- Meta: `{folder.videoCount} 支影片`
- Link: `/app/projects/${folder.id}`
- No retry button, no compact stepper

- [ ] **Step 3: Filters / search**

`matchesFilter(folder.status, filter)`. Search haystack: `folder.name` plus each `video.phaseA` title and `video.source`.

- [ ] **Step 4: `create-folder-modal.tsx`**

Client dialog: `role="dialog"`, name input, submit calls `createFolderAction`, on success `router.push(`/app/projects/${result.folder.id}`)`. Escape / overlay click closes. `min-h-[44px]` controls.

- [ ] **Step 5: Redirect old new-video route**

`src/app/app/projects/new/page.tsx` → `redirect("/app")`.

- [ ] **Step 6: Typecheck + lint**

`npx tsc --noEmit` and eslint the touched app files.

---

### Task 6: Folder workspace (list + form)

**Files:**
- Modify: `src/app/app/projects/[id]/page.tsx`
- Create: `src/app/app/projects/[id]/project-workspace.tsx`
- Create: `src/app/app/projects/[id]/video-list.tsx`
- Create: `src/app/app/projects/[id]/skill-picker.tsx`
- Modify: `src/app/app/projects/new/new-project-form.tsx`
- Modify: `src/app/app/projects/new/use-project-poll.ts` (still polls `getProjectAction` / `getVideoAction` by video id)
- Delete or stop using: `src/app/app/projects/[id]/project-header.tsx` storyboard-only header (workspace has its own header). Keep generation/frames components.

**Interfaces:**
- Consumes: `createVideoAction(formData)` with `projectId`; `PublicFolder`; `PublicVideo`
- Produces: `/app/projects/[folderId]?video=` split view

- [ ] **Step 1: Server page loads folder + videos**

```ts
const folder = await folders.findOne({ _id: new ObjectId(id), clerkUserId: user.clerkUserId });
if (!folder) notFound();
const videoDocs = await videos.find({ projectId: folder._id }).sort({ createdAt: -1 }).toArray();
const publicFolder = toPublicFolder(folder, videoDocs);
const skills = (await skillsCol.find({ isActive: true }).toArray()).map(toPublicSkill);
return (
  <ProjectWorkspace
    folder={publicFolder}
    skills={skills}
    credits={user.credits}
    subscribed={subscribed}
  />
);
```

`searchParams.video` is read on the client via `useSearchParams` inside `ProjectWorkspace`.

- [ ] **Step 2: `video-list.tsx`**

Props: `{ videos: PublicVideo[]; selectedId: string | null; onSelect(id: string): void; onCreate(): void }`.  
Row: 72×40 thumb (`videoPreviewUrl`), title, `StatusBadge`. Selected row `bg-accent-ink/5`. 「新增影片」at top.

- [ ] **Step 3: `project-workspace.tsx`**

- Header: back link `/app`, folder name, `videoCount`.
- Left: `VideoList`. `onCreate` → `router.replace(? )` without video.
- Right: if `selectedId`, find video and render `NewProjectForm` in **locked** mode with `initialVideo={video}` (existing poll/stepper). If none selected, render `NewProjectForm` with `projectId={folder.id}` and `skills`.
- After `createVideoAction` succeeds, `router.replace(`?video=${result.project.id}`)`.

- [ ] **Step 4: Extend `NewProjectForm`**

New props:

```ts
{
  projectId: string;
  skills: PublicSkill[];
  initialVideo?: PublicVideo | null;
  credits: number;
  subscribed: boolean;
}
```

Remove dependency on a single `skill` from the new-project page. Add `SkillPicker` (buttons showing `titleZh`) bound to `skillSlug` state. Hidden input `projectId`. Submit `createVideoAction` not `createProjectAction`. If `initialVideo` is set, skip the form and start at the current status branch (same `AnimatePresence` switch already in the file). Include `ProjectStepper` already there.

- [ ] **Step 5: `use-project-poll.ts`**

Keep polling `getProjectAction(video.id)` (alias). When the selected video updates, also `router.refresh()` so the left list roll-up updates.

- [ ] **Step 6: Skills catalog**

`skill-card.tsx`: primary link `/app`, label「到專案裡使用」.

- [ ] **Step 7: Typecheck, lint, browser**

`npx tsc --noEmit`. Manual: create folder → empty list + form → submit storyboard → appears on the left → second video → two rows. Open migrated folder: old video listed, preview + status correct.

---

## Spec coverage (self-review)

| Spec item | Task |
|---|---|
| Folder vs video collections | 2 |
| Migration wrap + preserve `_id` | 4 |
| Jobs keep `projectId` = video id | 3 |
| `/app` folder grid + modal | 5 |
| `/app/projects/[id]` split pane + `?video=` | 6 |
| Create form includes skill picker | 6 |
| `/app/projects/new` redirect | 5 |
| Skills page catalog only | 6 |
| Roll-up status / search | 1 + 5 |
| No retry on folder card | 5 |
| Blob paths unchanged (video id) | 3 (no path change) |
| Billing out of scope | — |

No placeholders left. `PublicProject = PublicVideo` alias is removed in Task 6 once forms import `PublicVideo`.

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-09-17-project-folders.md`.
