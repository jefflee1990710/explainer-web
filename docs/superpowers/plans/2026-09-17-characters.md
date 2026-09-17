# Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 風格 catalog page with a character library where users generate versioned character blueprint sheets (GPT Image 1.5 via Higgsfield) and attach up to four characters to a reel so the director and frame generation lock onto them.

**Architecture:** One `characters` collection with embedded versions and a `defaultVersionId`. Blueprint generation reuses `generationJobs` with `kind: "character"`; `applyJobStatus` branches to a character sync that persists the sheet to Blob, sets the first completed version as default, and refunds on failure. Videos snapshot selected characters into `cast[]`; Phase A/B prompts get a cast block and frame generation skips the still job and uses blueprints as reference images.

**Tech Stack:** Next.js 16 App Router, MongoDB, Server Actions, `@higgsfield/client` (`openai/gpt-image-1.5`), `@vercel/blob`, Framer Motion, `node:test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-09-17-characters-design.md`

## Global Constraints

- UI copy in Traditional Chinese; identifiers in English.
- Page-only UI components live next to the page; generic ones in `src/components/`.
- Components using hooks start with `"use client"`.
- `db.collection<Type>("name")` always typed.
- Server actions, not REST routes.
- Follow the existing visual language (rounded `[1.5rem]`/`[1.75rem]` cards, offset shadows, `bg-accent` primary buttons, `min-h-[44px]` targets, `Spinner`).
- Every version generation costs **1 credit**, requires an active subscription, refunds on failure.
- Cast cap is **4** characters per video.
- Blob path for blueprints: `explainer/characters/{characterId}/{versionId}`.
- Do not delete characters or versions; do not touch Skill/Style split or multi-style videos.
- Commit at the end of each task; do not push.

## File map

| File | Responsibility |
|---|---|
| `src/lib/styles.ts` | Style catalog (`doodle`), prompt fragments |
| `src/types/character.ts` | `Character`, `CharacterVersion`, `CastMember` |
| `src/lib/collections.ts` | `charactersCollection()` |
| `src/lib/characters/blueprint-prompt.ts` (+test) | Pure prompt builder for the sheet |
| `src/lib/characters/versions.ts` (+test) | Pure default/version helpers |
| `src/lib/characters/cast-prompt.ts` (+test) | Pure cast text for Phase A/B and frames |
| `src/lib/characters/generate.ts` | Submit one version to Higgsfield + insert job |
| `src/lib/characters/sync.ts` | Apply job status to an embedded version |
| `src/lib/serialize.ts` | `PublicCharacter`, `toPublicCharacter`, `PublicVideo.cast` |
| `src/types/generation-job.ts` | `kind: "character"`, optional `projectId`, `characterId`, `versionId` |
| `src/lib/higgsfield/pipeline.ts` | Branch `applyJobStatus`; cast-aware frames |
| `src/lib/higgsfield/frame-prompts.ts` | Cast paragraph |
| `src/lib/director/run-phase-a.ts`, `run-phase-b.ts`, `jobs.ts` | Cast block |
| `src/lib/actions/characters.ts` | Character server actions |
| `src/lib/actions/projects.ts` | `characterIds[]` → `cast[]` |
| `src/types/project.ts` | `Project.cast` |
| `src/components/app-shell.tsx` | Nav 角色; wide route |
| `src/app/app/characters/page.tsx` | Library grid |
| `src/app/app/characters/character-card.tsx` | Card |
| `src/app/app/characters/character-grid.tsx` | Grid + empty state |
| `src/app/app/characters/create-character-modal.tsx` | Create dialog |
| `src/app/app/characters/[id]/page.tsx` | Workspace server page |
| `src/app/app/characters/[id]/character-workspace.tsx` | Split pane, `?version=`, poll |
| `src/app/app/characters/[id]/version-list.tsx` | Left list |
| `src/app/app/characters/[id]/version-detail.tsx` | Preview + actions |
| `src/app/app/characters/[id]/use-character-poll.ts` | Poll hook |
| `src/app/app/projects/[id]/character-picker.tsx` | Multi-select for the reel form |
| `src/app/app/projects/new/new-project-form.tsx` | Step 06 → picker |
| `src/app/app/projects/[id]/page.tsx`, `project-workspace.tsx` | Pass characters |
| Delete `src/app/app/skills/page.tsx`, `skill-card.tsx` | |

---

### Task 1: Styles, character types, pure helpers

**Files:**
- Create: `src/lib/styles.ts`
- Create: `src/types/character.ts`
- Create: `src/lib/characters/blueprint-prompt.ts`
- Create: `src/lib/characters/blueprint-prompt.test.ts`
- Create: `src/lib/characters/versions.ts`
- Create: `src/lib/characters/versions.test.ts`
- Modify: `src/lib/collections.ts`

**Interfaces:**
- Produces:
  - `type StyleId = "doodle"`, `STYLES: Record<StyleId, Style>`, `STYLE_IDS: StyleId[]`, `isStyleId(v?: string): v is StyleId`
  - `type CharacterVersionStatus`, `type CharacterVersion`, `type Character`, `type CastMember`
  - `buildBlueprintPrompt(input: { styleId: StyleId; description: string; hasReference: boolean; editInstruction?: string }): string`
  - `resolveDefaultVersion(character: Pick<Character, "defaultVersionId" | "versions">): CharacterVersion | null`
  - `canSetDefault(version: CharacterVersion): boolean`
  - `versionNumber(character: Pick<Character, "versions">, versionId: ObjectId): number` (1-based, by array index)
  - `charactersCollection(): Promise<Collection<OptionalId<Character>>>`

- [ ] **Step 1: Write the failing tests**

`src/lib/characters/blueprint-prompt.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBlueprintPrompt } from "./blueprint-prompt";

test("blueprint prompt lays out turnaround, walk cycle, and expression grid", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "一個穿藍色格子睡衣的小男孩，頭上有三根呆毛",
    hasReference: false,
  });
  assert.match(prompt, /front, back, left, and right/i);
  assert.match(prompt, /walk cycle/i);
  assert.match(prompt, /3 by 4 grid of head-and-shoulders expressions/i);
  assert.match(prompt, /solid white background/i);
  assert.match(prompt, /bold irregular black marker outlines/i);
  assert.match(prompt, /小男孩/);
  assert.doesNotMatch(prompt, /reference image/i);
});

test("blueprint prompt asks to preserve the reference when one is attached", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "x",
    hasReference: true,
  });
  assert.match(prompt, /Preserve the appearance of the character in the reference image/);
});

test("edit mode keeps the sheet identical except for the change", () => {
  const prompt = buildBlueprintPrompt({
    styleId: "doodle",
    description: "x",
    hasReference: true,
    editInstruction: "把睡衣換成紅色",
  });
  assert.match(prompt, /Apply only the change below; keep everything else identical/);
  assert.match(prompt, /把睡衣換成紅色/);
});
```

`src/lib/characters/versions.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { canSetDefault, resolveDefaultVersion, versionNumber } from "./versions";
import type { CharacterVersion } from "@/types/character";

function version(over: Partial<CharacterVersion>): CharacterVersion {
  return {
    id: new ObjectId(),
    prompt: "p",
    status: "completed",
    creditsCharged: true,
    createdAt: new Date(),
    ...over,
  };
}

test("explicit completed default wins", () => {
  const a = version({ createdAt: new Date(1) });
  const b = version({ createdAt: new Date(2) });
  assert.equal(resolveDefaultVersion({ defaultVersionId: a.id, versions: [a, b] }), a);
});

test("without a default the newest completed version is used", () => {
  const a = version({ createdAt: new Date(1) });
  const b = version({ createdAt: new Date(2) });
  const c = version({ createdAt: new Date(3), status: "queued" });
  assert.equal(resolveDefaultVersion({ versions: [a, b, c] }), b);
});

test("no completed version resolves to null", () => {
  assert.equal(
    resolveDefaultVersion({ versions: [version({ status: "failed" })] }),
    null,
  );
});

test("only completed versions can become default", () => {
  assert.equal(canSetDefault(version({ status: "completed" })), true);
  assert.equal(canSetDefault(version({ status: "queued" })), false);
});

test("version number is 1-based array position", () => {
  const a = version({});
  const b = version({});
  assert.equal(versionNumber({ versions: [a, b] }, b.id), 2);
  assert.equal(versionNumber({ versions: [a, b] }, new ObjectId()), 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/lib/characters/blueprint-prompt.test.ts src/lib/characters/versions.test.ts`
Expected: FAIL — `Cannot find module './blueprint-prompt'` / `'./versions'`.

- [ ] **Step 3: Create the style catalog and types**

`src/lib/styles.ts`:

```ts
// Visual styles for character blueprints. Separate from director Skills;
// the same catalog will drive video style selection later.
export type StyleId = "doodle";

export type Style = {
  id: StyleId;
  name: string;
  nameZh: string;
  promptFragment: string;
};

export const STYLE_IDS: StyleId[] = ["doodle"];

export const STYLES: Record<StyleId, Style> = {
  doodle: {
    id: "doodle",
    name: "Whiteboard doodle",
    nameZh: "白板塗鴉手繪",
    promptFragment:
      "Whiteboard doodle cartoon: bold irregular black marker outlines, flat marker fills, hand-drawn feel, no photorealism, no gradients, no chalkboard.",
  },
};

export function isStyleId(value: string | undefined): value is StyleId {
  return Boolean(value && STYLE_IDS.includes(value as StyleId));
}
```

`src/types/character.ts`:

```ts
import type { ObjectId } from "mongodb";
import type { StyleId } from "@/lib/styles";

export type CharacterVersionStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed";

// One generated blueprint sheet. Versions are append-only.
export type CharacterVersion = {
  id: ObjectId;
  // Set when this version was made via「從此版本編輯」.
  parentVersionId?: ObjectId;
  // Full effective description used for this generation.
  prompt: string;
  editInstruction?: string;
  // Uploaded reference (v1) or the parent blueprint (edits).
  referenceImageUrl?: string;
  // Blob URL once the sheet is persisted.
  blueprintUrl?: string;
  status: CharacterVersionStatus;
  error?: string;
  creditsCharged: boolean;
  createdAt: Date;
};

// Reusable character owned by one user.
export type Character = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  name: string;
  styleId: StyleId;
  defaultVersionId?: ObjectId;
  versions: CharacterVersion[];
  createdAt: Date;
  updatedAt: Date;
};

// Snapshot of a character's default version stored on a video at creation.
export type CastMember = {
  characterId: ObjectId;
  versionId: ObjectId;
  name: string;
  blueprintUrl: string;
  prompt: string;
};
```

- [ ] **Step 4: Implement the pure helpers**

`src/lib/characters/blueprint-prompt.ts`:

```ts
import { STYLES, type StyleId } from "@/lib/styles";

// Fixed character-sheet layout so every version is comparable side by side.
const SHEET_LAYOUT = [
  "Character model sheet on a single 16:9 canvas, solid white background, no text, no labels, no drop shadows, consistent scale across all drawings.",
  "Left two thirds: top row is a full-body turnaround of the same character standing in front, back, left, and right views; bottom row is a 4-pose walk cycle of the same character moving left to right.",
  "Right third: a 3 by 4 grid of head-and-shoulders expressions in this order: neutral, smile, frown, laugh, angry, surprised, curious, worried, sad, focused, shy, sleepy.",
];

export function buildBlueprintPrompt(input: {
  styleId: StyleId;
  description: string;
  hasReference: boolean;
  editInstruction?: string;
}) {
  const lines = [
    ...SHEET_LAYOUT,
    STYLES[input.styleId].promptFragment,
    `Character: ${input.description.trim()}`,
  ];
  if (input.editInstruction) {
    lines.push(
      "Use the reference sheet as the base. Apply only the change below; keep everything else identical, including layout, pose order, and expression order.",
      `Change: ${input.editInstruction.trim()}`,
    );
  } else if (input.hasReference) {
    lines.push("Preserve the appearance of the character in the reference image.");
  }
  return lines.join("\n");
}
```

`src/lib/characters/versions.ts`:

```ts
import type { ObjectId } from "mongodb";
import type { Character, CharacterVersion } from "@/types/character";

export function canSetDefault(version: CharacterVersion) {
  return version.status === "completed";
}

// Explicit default if it is completed; otherwise the newest completed version.
export function resolveDefaultVersion(
  character: Pick<Character, "defaultVersionId" | "versions">,
): CharacterVersion | null {
  if (character.defaultVersionId) {
    const explicit = character.versions.find(
      (version) =>
        version.id.equals(character.defaultVersionId!) && version.status === "completed",
    );
    if (explicit) return explicit;
  }
  const completed = character.versions
    .filter((version) => version.status === "completed")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return completed[0] || null;
}

// 1-based position in the append-only versions array; 0 when missing.
export function versionNumber(
  character: Pick<Character, "versions">,
  versionId: ObjectId,
) {
  const index = character.versions.findIndex((version) => version.id.equals(versionId));
  return index === -1 ? 0 : index + 1;
}
```

- [ ] **Step 5: Add the collection**

In `src/lib/collections.ts` add the import `import type { Character } from "@/types/character";` and:

```ts
export async function charactersCollection(): Promise<
  Collection<OptionalId<Character>>
> {
  const db = await getDb();
  return db.collection<OptionalId<Character>>("characters");
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npx tsx --test src/lib/characters/blueprint-prompt.test.ts src/lib/characters/versions.test.ts && npx tsc --noEmit`
Expected: 8 tests pass, tsc exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/styles.ts src/types/character.ts src/lib/characters src/lib/collections.ts
git commit -m "Add character types, style catalog, and blueprint prompt helpers."
```

---

### Task 2: Character generation jobs and sync

**Files:**
- Modify: `src/types/generation-job.ts`
- Create: `src/lib/characters/generate.ts`
- Create: `src/lib/characters/sync.ts`
- Modify: `src/lib/higgsfield/pipeline.ts` (`applyJobStatus`, `syncProjectFromJobs` guard)
- Modify: `src/lib/serialize.ts` (`PublicCharacter`)

**Interfaces:**
- Consumes: `submitImage` (`@/lib/higgsfield/generate`), `persistMedia`, `refundCredits`, `charactersCollection`, `generationJobsCollection`, `resolveDefaultVersion`, `versionNumber`, `STYLES`.
- Produces:
  - `GenerationJob.kind` includes `"character"`; `projectId?: ObjectId`; `characterId?: ObjectId`; `versionId?: ObjectId`
  - `BLUEPRINT_MODEL = "openai/gpt-image-1.5"`
  - `submitCharacterVersion(character: Character, version: CharacterVersion): Promise<void>` — submits and inserts the job; throws on provider failure.
  - `syncCharacterJob(job: GenerationJob, status: GenerationStatus, outputUrl?: string): Promise<void>`
  - `type PublicCharacterVersion`, `type PublicCharacter`, `toPublicCharacter(character: Character): PublicCharacter`

- [ ] **Step 1: Extend the job type**

`src/types/generation-job.ts`:

```ts
import type { ObjectId } from "mongodb";
import type { FramePosition } from "@/types/project";

export type GenerationKind = "still" | "frame" | "video" | "character";
export type GenerationStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw";

// One Higgsfield request tied to a video clip / frame / still, or a character version.
export type GenerationJob = {
  _id: ObjectId;
  // Video id for still/frame/video jobs; unset for character jobs.
  projectId?: ObjectId;
  clipIndex: number;
  kind: GenerationKind;
  // Only for kind === "frame".
  framePosition?: FramePosition;
  // Only for kind === "character".
  characterId?: ObjectId;
  versionId?: ObjectId;
  model: string;
  requestId: string;
  statusUrl?: string;
  status: GenerationStatus;
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

- [ ] **Step 2: Typecheck to see what breaks**

Run: `npx tsc --noEmit`
Expected: errors in `src/lib/higgsfield/pipeline.ts` where `job.projectId` is used as non-optional (`applyJobStatus` persist path and `syncProjectFromJobs(job.projectId)`), and the refund lookup `projects.findOne({ _id: job.projectId })`.

- [ ] **Step 3: Write the submit helper**

`src/lib/characters/generate.ts`:

```ts
import { generationJobsCollection } from "@/lib/collections";
import { submitImage } from "@/lib/higgsfield/generate";
import { buildBlueprintPrompt } from "@/lib/characters/blueprint-prompt";
import type { Character, CharacterVersion } from "@/types/character";
import type { GenerationStatus } from "@/types/generation-job";

export const BLUEPRINT_MODEL = "openai/gpt-image-1.5";

// Submit one version's sheet to Higgsfield and record the job. Throws if the
// provider rejects the request; the caller marks the version failed + refunds.
export async function submitCharacterVersion(
  character: Character,
  version: CharacterVersion,
) {
  const submitted = await submitImage({
    model: BLUEPRINT_MODEL,
    prompt: buildBlueprintPrompt({
      styleId: character.styleId,
      description: version.prompt,
      hasReference: Boolean(version.referenceImageUrl),
      editInstruction: version.editInstruction,
    }),
    aspectRatio: "16:9",
    quality: "medium",
    resolution: "1k",
    referenceImageUrls: [version.referenceImageUrl],
  });

  const jobs = await generationJobsCollection();
  await jobs.insertOne({
    characterId: character._id,
    versionId: version.id,
    clipIndex: -1,
    kind: "character",
    model: BLUEPRINT_MODEL,
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: (submitted.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
```

- [ ] **Step 4: Write the sync helper**

`src/lib/characters/sync.ts`:

```ts
import { refundCredits } from "@/lib/billing/credits";
import { charactersCollection } from "@/lib/collections";
import { persistMedia } from "@/lib/higgsfield/persist";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";

// Mirror a character job's status onto the embedded version. Called from
// applyJobStatus after the job document itself has been updated.
export async function syncCharacterJob(
  job: GenerationJob,
  status: GenerationStatus,
  outputUrl?: string,
) {
  if (!job.characterId || !job.versionId) return;
  const characters = await charactersCollection();
  const character = await characters.findOne({
    _id: job.characterId,
    "versions.id": job.versionId,
  });
  if (!character) return;
  const version = character.versions.find((item) => item.id.equals(job.versionId!));
  if (!version) return;

  const now = new Date();
  const filter = { _id: job.characterId, "versions.id": job.versionId };

  if (status === "completed" && outputUrl) {
    const blueprintUrl = await persistMedia(
      outputUrl,
      `explainer/characters/${job.characterId.toHexString()}/${job.versionId.toHexString()}`,
    );
    await characters.updateOne(filter, {
      $set: {
        "versions.$.status": "completed",
        "versions.$.blueprintUrl": blueprintUrl,
        "versions.$.error": undefined,
        updatedAt: now,
        // First finished sheet becomes the default automatically.
        ...(character.defaultVersionId ? {} : { defaultVersionId: job.versionId }),
      },
    });
    return;
  }

  if (status === "failed" || status === "nsfw") {
    const alreadyFailed = version.status === "failed";
    await characters.updateOne(filter, {
      $set: {
        "versions.$.status": "failed",
        "versions.$.error": status === "nsfw" ? "內容被判定不適當" : "藍圖產生失敗",
        "versions.$.creditsCharged": false,
        updatedAt: now,
      },
    });
    if (!alreadyFailed && version.creditsCharged) {
      await refundCredits(character.clerkUserId, 1);
    }
    return;
  }

  if (status === "in_progress" || status === "queued") {
    await characters.updateOne(filter, {
      $set: { "versions.$.status": status, updatedAt: now },
    });
  }
}
```

- [ ] **Step 5: Branch `applyJobStatus` and guard the video sync**

In `src/lib/higgsfield/pipeline.ts`:

Add import: `import { syncCharacterJob } from "@/lib/characters/sync";`

Replace the body of `applyJobStatus` from `const status = input.status as GenerationStatus;` (the line right after the `if (!job) return;` guard) through the end of the function with:

```ts
  const status = input.status as GenerationStatus;
  const nowFailed = status === "failed" || status === "nsfw";
  const wasFailed = job.status === "failed" || job.status === "nsfw";

  // Character sheets persist and refund in their own sync; no video to touch.
  if (job.kind === "character") {
    await jobs.updateOne(
      { _id: job._id },
      {
        $set: {
          status,
          outputUrl: input.outputUrl,
          error: nowFailed ? status : undefined,
          updatedAt: new Date(),
        },
      },
    );
    await syncCharacterJob(job, status, input.outputUrl);
    return;
  }

  if (!job.projectId) return;
  const projectId = job.projectId;

  let blobUrl = job.blobUrl;
  if (input.outputUrl && (status === "completed" || status === "nsfw")) {
    const folder =
      job.kind === "still" ? "stills" : job.kind === "frame" ? "frames" : "clips";
    blobUrl = await persistMedia(
      input.outputUrl,
      `explainer/${projectId.toHexString()}/${folder}/${job.requestId}`,
    );
  }

  await jobs.updateOne(
    { _id: job._id },
    {
      $set: {
        status,
        outputUrl: input.outputUrl,
        blobUrl,
        error: nowFailed ? status : undefined,
        updatedAt: new Date(),
      },
    },
  );

  // Each frame is 1 credit; hand it back the moment that frame fails.
  if (job.kind === "frame" && nowFailed && !wasFailed) {
    const projects = await videosCollection();
    const project = await projects.findOne({ _id: projectId });
    if (project) await refundCredits(project.clerkUserId, 1);
  }

  await syncProjectFromJobs(projectId);
```

- [ ] **Step 6: Add `PublicCharacter` to serialize**

In `src/lib/serialize.ts` add imports:

```ts
import { resolveDefaultVersion, versionNumber } from "@/lib/characters/versions";
import { STYLES, type StyleId } from "@/lib/styles";
import type { Character, CharacterVersionStatus } from "@/types/character";
```

Append:

```ts
export type PublicCharacterVersion = {
  id: string;
  number: number;
  parentVersionId?: string;
  parentNumber?: number;
  prompt: string;
  editInstruction?: string;
  referenceImageUrl?: string;
  blueprintUrl?: string;
  status: CharacterVersionStatus;
  error?: string;
  createdAt: string;
};

export type PublicCharacter = {
  id: string;
  name: string;
  styleId: StyleId;
  styleName: string;
  defaultVersionId: string | null;
  // Default sheet, or null when nothing has completed yet.
  previewUrl: string | null;
  // Newest first.
  versions: PublicCharacterVersion[];
  pending: boolean;
  failed: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toPublicCharacter(character: Character): PublicCharacter {
  const resolved = resolveDefaultVersion(character);
  const versions = character.versions
    .map((version) => ({
      id: version.id.toHexString(),
      number: versionNumber(character, version.id),
      parentVersionId: version.parentVersionId?.toHexString(),
      parentNumber: version.parentVersionId
        ? versionNumber(character, version.parentVersionId) || undefined
        : undefined,
      prompt: version.prompt,
      editInstruction: version.editInstruction,
      referenceImageUrl: version.referenceImageUrl,
      blueprintUrl: version.blueprintUrl,
      status: version.status,
      error: version.error,
      createdAt: version.createdAt.toISOString(),
    }))
    .sort((a, b) => b.number - a.number);
  const newest = character.versions[character.versions.length - 1];
  return {
    id: character._id.toHexString(),
    name: character.name,
    styleId: character.styleId,
    styleName: STYLES[character.styleId].nameZh,
    defaultVersionId: resolved ? resolved.id.toHexString() : null,
    previewUrl: resolved?.blueprintUrl || null,
    versions,
    pending: character.versions.some(
      (version) => version.status === "queued" || version.status === "in_progress",
    ),
    failed: newest?.status === "failed",
    createdAt: character.createdAt.toISOString(),
    updatedAt: character.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 7: Typecheck and run all tests**

Run: `npx tsc --noEmit && npx tsx --test src/lib/characters/*.test.ts src/lib/folder.test.ts src/lib/billing/credit-balance.test.ts`
Expected: tsc exit 0; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/types/generation-job.ts src/lib/characters/generate.ts src/lib/characters/sync.ts src/lib/higgsfield/pipeline.ts src/lib/serialize.ts
git commit -m "Route character blueprint jobs through the Higgsfield job sync."
```

---

### Task 3: Character server actions

**Files:**
- Create: `src/lib/actions/characters.ts`

**Interfaces:**
- Consumes: `requireAppUser`, `assertCanSpendCredits`, `consumeCredits`, `refundCredits`, `charactersCollection`, `generationJobsCollection`, `submitCharacterVersion`, `applyJobStatus`, `fetchHiggsfieldStatus`, `mediaUrlFromResponse`, `toPublicCharacter`, `canSetDefault`, `isStyleId`.
- Produces (all `"use server"`):
  - `type CharacterResult = { ok: true; character: PublicCharacter } | { ok: false; error: string }`
  - `createCharacterAction(formData: FormData): Promise<CharacterResult>` — fields `name`, `styleId`, `prompt`, optional `referenceImageUrl`
  - `editCharacterVersionAction(characterId: string, fromVersionId: string, editInstruction: string): Promise<CharacterResult>`
  - `retryCharacterVersionAction(characterId: string, versionId: string): Promise<CharacterResult>`
  - `setDefaultVersionAction(characterId: string, versionId: string): Promise<CharacterResult>`
  - `renameCharacterAction(characterId: string, name: string): Promise<CharacterResult>`
  - `refreshCharacterAction(characterId: string): Promise<CharacterResult>` — polls pending jobs then returns the character
  - `getCharacterAction(characterId: string): Promise<CharacterResult>`

- [ ] **Step 1: Write the actions**

`src/lib/actions/characters.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/lib/billing/credits";
import { submitCharacterVersion } from "@/lib/characters/generate";
import { canSetDefault } from "@/lib/characters/versions";
import { charactersCollection, generationJobsCollection } from "@/lib/collections";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
} from "@/lib/higgsfield/generate";
import { applyJobStatus } from "@/lib/higgsfield/pipeline";
import { toPublicCharacter, type PublicCharacter } from "@/lib/serialize";
import { isStyleId } from "@/lib/styles";
import type { Character, CharacterVersion } from "@/types/character";

const NAME_MAX = 40;
const PROMPT_MAX = 1200;

export type CharacterResult =
  | { ok: true; character: PublicCharacter }
  | { ok: false; error: string };

function revalidateCharacter(characterId: string) {
  revalidatePath("/app/characters");
  revalidatePath(`/app/characters/${characterId}`);
  revalidatePath("/app/billing");
}

function fail(error: unknown, fallback: string): CharacterResult {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

async function ownedCharacter(characterId: string, clerkUserId: string) {
  if (!ObjectId.isValid(characterId)) return null;
  const characters = await charactersCollection();
  return (await characters.findOne({
    _id: new ObjectId(characterId),
    clerkUserId,
  })) as Character | null;
}

async function reload(characterId: ObjectId): Promise<CharacterResult> {
  const characters = await charactersCollection();
  const character = (await characters.findOne({ _id: characterId })) as Character | null;
  if (!character) return { ok: false, error: "角色不存在" };
  return { ok: true, character: toPublicCharacter(character) };
}

// Submit a queued version; on provider failure mark it failed and refund.
async function submitOrFail(character: Character, version: CharacterVersion) {
  try {
    await submitCharacterVersion(character, version);
  } catch (error) {
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id, "versions.id": version.id },
      {
        $set: {
          "versions.$.status": "failed",
          "versions.$.error": error instanceof Error ? error.message : "藍圖送出失敗",
          "versions.$.creditsCharged": false,
          updatedAt: new Date(),
        },
      },
    );
    await refundCredits(character.clerkUserId, 1);
  }
}

// Create a character and its first version (1 credit).
export async function createCharacterAction(
  formData: FormData,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const name = String(formData.get("name") || "").trim().slice(0, NAME_MAX);
    const styleId = String(formData.get("styleId") || "");
    const prompt = String(formData.get("prompt") || "").trim().slice(0, PROMPT_MAX);
    const referenceImageUrl =
      String(formData.get("referenceImageUrl") || "").trim() || undefined;

    if (!name) return { ok: false, error: "請輸入角色名稱" };
    if (!isStyleId(styleId)) return { ok: false, error: "請選擇風格" };
    if (!prompt) return { ok: false, error: "請描述這個角色" };

    await assertCanSpendCredits(user, 1);
    await consumeCredits(user.clerkUserId, 1);

    const now = new Date();
    const version: CharacterVersion = {
      id: new ObjectId(),
      prompt,
      referenceImageUrl,
      status: "queued",
      creditsCharged: true,
      createdAt: now,
    };
    const characters = await charactersCollection();
    const insert = await characters.insertOne({
      userId: user._id,
      clerkUserId: user.clerkUserId,
      name,
      styleId,
      versions: [version],
      createdAt: now,
      updatedAt: now,
    });
    const character = (await characters.findOne({ _id: insert.insertedId })) as Character;

    await submitOrFail(character, version);
    revalidateCharacter(character._id.toHexString());
    return reload(character._id);
  } catch (error) {
    return fail(error, "建立角色失敗");
  }
}

// Branch a new version off an existing one with a text edit (1 credit).
export async function editCharacterVersionAction(
  characterId: string,
  fromVersionId: string,
  editInstruction: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const instruction = editInstruction.trim().slice(0, PROMPT_MAX);
    if (!instruction) return { ok: false, error: "請輸入要修改的地方" };
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    if (!ObjectId.isValid(fromVersionId)) return { ok: false, error: "版本不存在" };
    const parent = character.versions.find((item) =>
      item.id.equals(new ObjectId(fromVersionId)),
    );
    if (!parent) return { ok: false, error: "版本不存在" };
    if (parent.status !== "completed" || !parent.blueprintUrl) {
      return { ok: false, error: "只能從已完成的版本編輯" };
    }

    await assertCanSpendCredits(user, 1);
    await consumeCredits(user.clerkUserId, 1);

    const now = new Date();
    const version: CharacterVersion = {
      id: new ObjectId(),
      parentVersionId: parent.id,
      prompt: `${parent.prompt}\n變更：${instruction}`,
      editInstruction: instruction,
      referenceImageUrl: parent.blueprintUrl,
      status: "queued",
      creditsCharged: true,
      createdAt: now,
    };
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      { $push: { versions: version }, $set: { updatedAt: now } },
    );

    await submitOrFail(character, version);
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "產生新版本失敗");
  }
}

// Re-run a failed version in place (1 credit).
export async function retryCharacterVersionAction(
  characterId: string,
  versionId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    if (!ObjectId.isValid(versionId)) return { ok: false, error: "版本不存在" };
    const version = character.versions.find((item) =>
      item.id.equals(new ObjectId(versionId)),
    );
    if (!version) return { ok: false, error: "版本不存在" };
    if (version.status !== "failed") return { ok: false, error: "只有失敗的版本可以重試" };

    await assertCanSpendCredits(user, 1);
    await consumeCredits(user.clerkUserId, 1);

    const characters = await charactersCollection();
    const jobs = await generationJobsCollection();
    await jobs.deleteMany({ characterId: character._id, versionId: version.id });
    await characters.updateOne(
      { _id: character._id, "versions.id": version.id },
      {
        $set: {
          "versions.$.status": "queued",
          "versions.$.error": undefined,
          "versions.$.creditsCharged": true,
          updatedAt: new Date(),
        },
      },
    );

    await submitOrFail(character, { ...version, status: "queued", creditsCharged: true });
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "重試失敗");
  }
}

export async function setDefaultVersionAction(
  characterId: string,
  versionId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    if (!ObjectId.isValid(versionId)) return { ok: false, error: "版本不存在" };
    const version = character.versions.find((item) =>
      item.id.equals(new ObjectId(versionId)),
    );
    if (!version) return { ok: false, error: "版本不存在" };
    if (!canSetDefault(version)) return { ok: false, error: "只有完成的版本可以設為預設" };

    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      { $set: { defaultVersionId: version.id, updatedAt: new Date() } },
    );
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "設定預設失敗");
  }
}

export async function renameCharacterAction(
  characterId: string,
  name: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const trimmed = name.trim().slice(0, NAME_MAX);
    if (!trimmed) return { ok: false, error: "請輸入角色名稱" };
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    const characters = await charactersCollection();
    await characters.updateOne(
      { _id: character._id },
      { $set: { name: trimmed, updatedAt: new Date() } },
    );
    revalidateCharacter(characterId);
    return reload(character._id);
  } catch (error) {
    return fail(error, "重新命名失敗");
  }
}

// Poll target while a version is generating: advance pending jobs, return fresh state.
export async function refreshCharacterAction(
  characterId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };

    const jobs = await generationJobsCollection();
    const pending = await jobs
      .find({
        characterId: character._id,
        status: { $in: ["queued", "in_progress"] },
      })
      .toArray();
    for (const job of pending) {
      if (!job.statusUrl) continue;
      try {
        const status = await fetchHiggsfieldStatus(job.statusUrl);
        await applyJobStatus({
          requestId: job.requestId,
          status: status.status,
          outputUrl: mediaUrlFromResponse(status),
        });
      } catch {
        // Transient status failure; the next poll retries.
      }
    }
    return reload(character._id);
  } catch (error) {
    return fail(error, "更新進度失敗");
  }
}

export async function getCharacterAction(
  characterId: string,
): Promise<CharacterResult> {
  try {
    const user = await requireAppUser();
    const character = await ownedCharacter(characterId, user.clerkUserId);
    if (!character) return { ok: false, error: "角色不存在" };
    return { ok: true, character: toPublicCharacter(character) };
  } catch (error) {
    return fail(error, "讀取角色失敗");
  }
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0, no lint output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/characters.ts
git commit -m "Add character create, edit, retry, default, and refresh actions."
```

---

### Task 4: Character library page, create modal, nav

**Files:**
- Create: `src/app/app/characters/page.tsx`
- Create: `src/app/app/characters/character-card.tsx`
- Create: `src/app/app/characters/character-grid.tsx`
- Create: `src/app/app/characters/create-character-modal.tsx`
- Modify: `src/components/app-shell.tsx`
- Delete: `src/app/app/skills/page.tsx`, `src/app/app/skills/skill-card.tsx`

**Interfaces:**
- Consumes: `charactersCollection`, `toPublicCharacter`, `PublicCharacter`, `createCharacterAction`, `uploadCharacterImageAction`, `STYLES`, `STYLE_IDS`, `getActiveSubscription`, `isSubscriptionActive`.
- Produces: `CreateCharacterButton({ credits, subscribed, className?, children? })`, `CharacterGrid({ characters, credits, subscribed })`, `CharacterCard({ character })`.

- [ ] **Step 1: Remove the skills page and repoint the nav**

```bash
git rm src/app/app/skills/page.tsx src/app/app/skills/skill-card.tsx
```

In `src/components/app-shell.tsx` replace the 風格 link:

```tsx
              <Link href="/app/characters" className="hover:text-foreground">
                角色
              </Link>
```

and widen the wide-route regex so both workspaces get the wide canvas:

```ts
// Folder and character workspaces are split panes; they get a wider canvas
// than the single-column dashboard, library, and billing pages.
const WIDE_ROUTE = /^\/app\/(projects|characters)\/[^/]+$/;
```

- [ ] **Step 2: Create modal**

`src/app/app/characters/create-character-modal.tsx`:

```tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCharacterAction } from "@/lib/actions/characters";
import { uploadCharacterImageAction } from "@/lib/actions/upload";
import { STYLE_IDS, STYLES, type StyleId } from "@/lib/styles";
import { Spinner } from "@/components/spinner";

const NAME_MAX = 40;
const DEFAULT_BUTTON_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5";

// Header / empty-state trigger for the create-character dialog.
export function CreateCharacterButton({
  credits,
  subscribed,
  className = DEFAULT_BUTTON_CLASS,
  children = "新增角色",
}: {
  credits: number;
  subscribed: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open ? (
        <CreateCharacterModal
          credits={credits}
          subscribed={subscribed}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

// Name + style + description + optional reference; success opens the workspace.
export function CreateCharacterModal({
  credits,
  subscribed,
  onClose,
}: {
  credits: number;
  subscribed: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [styleId, setStyleId] = useState<StyleId>("doodle");
  const [prompt, setPrompt] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onUpload(file: File) {
    setUploading(true);
    setError("");
    const data = new FormData();
    data.set("file", file);
    const result = await uploadCharacterImageAction(data);
    setUploading(false);
    if (result.ok) setReferenceImageUrl(result.url);
    else setError(result.error);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const data = new FormData();
    data.set("name", name);
    data.set("styleId", styleId);
    data.set("prompt", prompt);
    if (referenceImageUrl) data.set("referenceImageUrl", referenceImageUrl);
    const result = await createCharacterAction(data);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      if (result.error.includes("訂閱") || result.error.includes("credits 不足")) {
        router.push("/app/billing");
      }
      return;
    }
    router.push(`/app/characters/${result.character.id}`);
  }

  const canSubmit =
    name.trim().length > 0 && prompt.trim().length > 0 && !submitting && !uploading;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          新增角色
        </h2>
        <p className="mt-2 text-sm text-muted">
          我們會產生一張角色藍圖（轉身圖、走路循環、表情格）。
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">角色名稱</span>
            <input
              ref={inputRef}
              type="text"
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              placeholder="例如：小明"
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          <fieldset disabled={submitting}>
            <legend className="mb-1.5 text-sm font-semibold">風格</legend>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              {STYLE_IDS.map((id) => {
                const style = STYLES[id];
                const active = id === styleId;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStyleId(id)}
                    className={`flex min-h-[52px] cursor-pointer flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-colors ${
                      active
                        ? "border-accent-ink bg-accent-ink text-paper"
                        : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
                    }`}
                  >
                    <span className="text-sm font-semibold">{style.nameZh}</span>
                    <span className={`mt-0.5 text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                      {style.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">角色描述</span>
            <textarea
              required
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={submitting}
              placeholder="例如：七歲小男孩，圓臉，頭頂三根呆毛，穿藍色格子睡衣與黑色布鞋。"
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-semibold">參考圖（選填）</span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5">
                {uploading ? <Spinner /> : null}
                {uploading ? "上傳中…" : referenceImageUrl ? "更換圖片" : "選擇圖片"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={submitting || uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUpload(file);
                  }}
                />
              </label>
              {referenceImageUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referenceImageUrl}
                    alt="參考圖預覽"
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-xl border border-accent-ink/10 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setReferenceImageUrl("")}
                    className="min-h-[44px] cursor-pointer text-sm text-muted underline-offset-4 hover:underline"
                  >
                    移除
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {subscribed ? `扣 1 credit（剩餘 ${credits}）` : "需要有效訂閱才能產生藍圖"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Spinner className="h-4 w-4" /> : null}
                產生藍圖
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Card and grid**

`src/app/app/characters/character-card.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Spinner } from "@/components/spinner";
import type { PublicCharacter } from "@/lib/serialize";

const ease = [0.22, 1, 0.36, 1] as const;

// Library card: default blueprint, name, style, version count, generation state.
export function CharacterCard({ character }: { character: PublicCharacter }) {
  const href = `/app/characters/${character.id}`;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      whileHover={{ y: -3 }}
      className={`group flex flex-col overflow-hidden rounded-[1.25rem] border bg-paper/85 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)] transition-shadow hover:shadow-[6px_6px_0_0_rgba(198,242,75,0.55)] ${
        character.failed ? "border-accent/40" : "border-accent-ink/10"
      }`}
    >
      <Link href={href} className="relative block aspect-video overflow-hidden bg-white">
        {character.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.previewUrl}
            alt={`${character.name} 藍圖`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="studio-grid grid h-full w-full place-items-center">
            <span className="h-9 w-16 rounded-md border-2 border-dashed border-accent-ink/25" />
          </div>
        )}
        {character.pending ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/15 px-2.5 py-1 text-xs font-semibold text-[#1f4fb8]">
            <Spinner className="h-3 w-3" />
            生成中
          </span>
        ) : character.failed ? (
          <span className="absolute left-3 top-3 rounded-full border border-accent/30 bg-accent/12 px-2.5 py-1 text-xs font-semibold text-accent">
            失敗
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={href} className="min-w-0">
          <h3 className="font-display line-clamp-1 text-base font-bold">{character.name}</h3>
        </Link>
        <p className="mt-auto text-xs text-muted">
          {character.styleName} · {character.versions.length} 個版本
        </p>
      </div>
    </motion.article>
  );
}
```

`src/app/app/characters/character-grid.tsx`:

```tsx
"use client";

import { MotionConfig, motion } from "framer-motion";
import type { PublicCharacter } from "@/lib/serialize";
import { CharacterCard } from "./character-card";
import { CreateCharacterButton } from "./create-character-modal";

export function CharacterGrid({
  characters,
  credits,
  subscribed,
}: {
  characters: PublicCharacter[];
  credits: number;
  subscribed: boolean;
}) {
  if (characters.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-10 text-center">
        <p className="font-display text-lg font-bold">還沒有角色</p>
        <p className="mt-2 text-sm text-muted">
          先建立一個角色藍圖，之後每支影片都能重複使用同一個角色。
        </p>
        <CreateCharacterButton
          credits={credits}
          subscribed={subscribed}
          className="mt-5 inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5"
        />
      </div>
    );
  }
  return (
    <MotionConfig reducedMotion="user">
      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
      </motion.div>
    </MotionConfig>
  );
}
```

- [ ] **Step 4: Library page**

`src/app/app/characters/page.tsx`:

```tsx
import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { charactersCollection } from "@/lib/collections";
import { toPublicCharacter } from "@/lib/serialize";
import type { Character } from "@/types/character";
import { CharacterGrid } from "./character-grid";
import { CreateCharacterButton } from "./create-character-modal";

export default async function CharactersPage() {
  const user = await requireAppUser();
  const sub = await getActiveSubscription(user.clerkUserId);
  const subscribed = isSubscriptionActive(sub);
  const characters = await charactersCollection();
  const docs = (await characters
    .find({ clerkUserId: user.clerkUserId })
    .sort({ updatedAt: -1 })
    .limit(120)
    .toArray()) as Character[];

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">角色</h1>
          <p className="mt-2 text-sm text-muted">
            建立可重複使用的角色藍圖。每個版本扣 1 credit，可從任一版本再編輯。
          </p>
        </div>
        <CreateCharacterButton credits={user.credits} subscribed={subscribed} />
      </div>
      <div className="mt-8">
        <CharacterGrid
          characters={docs.map(toPublicCharacter)}
          credits={user.credits}
          subscribed={subscribed}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck, lint, and confirm the old route is gone**

Run: `npx tsc --noEmit && npm run lint && rg -n "app/skills|SkillCard" src || echo "no skills page refs"`
Expected: exit 0; the `rg` prints only `no skills page refs` (the `SkillPicker` in the reel form does not match these patterns and stays).

- [ ] **Step 6: Commit**

```bash
git add -A src/app/app/characters src/app/app/skills src/components/app-shell.tsx
git commit -m "Replace the skills catalog with a character library and create dialog."
```

---

### Task 5: Character workspace (versions, edit, default, poll)

**Files:**
- Create: `src/app/app/characters/[id]/page.tsx`
- Create: `src/app/app/characters/[id]/character-workspace.tsx`
- Create: `src/app/app/characters/[id]/version-list.tsx`
- Create: `src/app/app/characters/[id]/version-detail.tsx`
- Create: `src/app/app/characters/[id]/use-character-poll.ts`

**Interfaces:**
- Consumes: `PublicCharacter`, `PublicCharacterVersion`, actions from Task 3, `Spinner`.
- Produces: `CharacterWorkspace({ character, credits, subscribed })`.

- [ ] **Step 1: Poll hook**

`src/app/app/characters/[id]/use-character-poll.ts`:

```ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshCharacterAction } from "@/lib/actions/characters";
import type { PublicCharacter } from "@/lib/serialize";

// Poll while any version is generating; stops once everything settles.
export function useCharacterPoll(
  character: PublicCharacter,
  onUpdate: (next: PublicCharacter) => void,
  onError?: (message: string) => void,
) {
  const router = useRouter();
  const { id, pending } = character;

  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void (async () => {
        const result = await refreshCharacterAction(id);
        if (cancelled) return;
        if (result.ok) {
          onUpdate(result.character);
          if (!result.character.pending) router.refresh();
        } else {
          onError?.(result.error);
        }
      })();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, pending, onUpdate, onError, router]);
}
```

- [ ] **Step 2: Version list**

`src/app/app/characters/[id]/version-list.tsx`:

```tsx
"use client";

import { Spinner } from "@/components/spinner";
import type { PublicCharacter, PublicCharacterVersion } from "@/lib/serialize";

const STATUS_LABEL: Record<PublicCharacterVersion["status"], string> = {
  queued: "排隊中",
  in_progress: "生成中",
  completed: "完成",
  failed: "失敗",
};

// Left pane: every version newest first; the default is badged.
export function VersionList({
  character,
  selectedId,
  onSelect,
}: {
  character: PublicCharacter;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-3 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)]">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        版本
      </p>
      <ul className="space-y-1">
        {character.versions.map((version) => {
          const selected = version.id === selectedId;
          const isDefault = version.id === character.defaultVersionId;
          const busy = version.status === "queued" || version.status === "in_progress";
          return (
            <li key={version.id}>
              <button
                type="button"
                onClick={() => onSelect(version.id)}
                aria-current={selected ? "true" : undefined}
                className={`flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                  selected ? "bg-accent-ink/5" : "hover:bg-accent-ink/5"
                }`}
              >
                {version.blueprintUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={version.blueprintUrl}
                    alt=""
                    width={72}
                    height={40}
                    className="h-10 w-[72px] shrink-0 rounded-md border border-accent-ink/10 bg-white object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid h-10 w-[72px] shrink-0 place-items-center rounded-md border border-dashed border-accent-ink/20 bg-accent-ink/5"
                  >
                    {busy ? <Spinner className="h-4 w-4" /> : <span className="h-4 w-7 rounded-sm border border-accent-ink/25" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    v{version.number}
                    {isDefault ? (
                      <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold">
                        預設
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`block text-xs ${
                      version.status === "failed" ? "text-accent" : "text-muted"
                    }`}
                  >
                    {STATUS_LABEL[version.status]}
                    {version.parentNumber ? ` · 由 v${version.parentNumber} 編輯` : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Version detail**

`src/app/app/characters/[id]/version-detail.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Spinner } from "@/components/spinner";
import type { PublicCharacter, PublicCharacterVersion } from "@/lib/serialize";

// Right pane: big preview + set-default / edit / retry actions.
export function VersionDetail({
  character,
  version,
  credits,
  subscribed,
  pending,
  error,
  onSetDefault,
  onEdit,
  onRetry,
}: {
  character: PublicCharacter;
  version: PublicCharacterVersion;
  credits: number;
  subscribed: boolean;
  pending: string;
  error: string;
  onSetDefault: () => void;
  onEdit: (instruction: string) => void;
  onRetry: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState("");
  const isDefault = version.id === character.defaultVersionId;
  const busy = version.status === "queued" || version.status === "in_progress";
  const canPay = subscribed && credits >= 1;

  function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim()) return;
    onEdit(instruction.trim());
    setInstruction("");
    setEditing(false);
  }

  return (
    <section className="rounded-[1.75rem] border border-accent-ink/10 bg-paper/85 p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          v{version.number}
          {isDefault ? <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-xs font-bold">預設</span> : null}
        </h2>
        <p className="text-xs text-muted">
          {new Date(version.createdAt).toLocaleString("zh-Hant")}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-accent-ink/10 bg-white">
        {version.blueprintUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={version.blueprintUrl} alt={`${character.name} v${version.number} 藍圖`} className="aspect-video w-full object-contain" />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-accent-ink/5 text-sm text-muted">
            {busy ? (
              <span className="inline-flex items-center gap-2"><Spinner /> 藍圖生成中，約需一分鐘</span>
            ) : (
              <span className="text-accent">{version.error || "這個版本沒有成功"}</span>
            )}
          </div>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {version.editInstruction ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">這次的變更</dt>
            <dd className="mt-1">{version.editInstruction}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">角色描述</dt>
          <dd className="mt-1 whitespace-pre-wrap text-muted">{version.prompt}</dd>
        </div>
      </dl>

      {error ? <p role="alert" className="mt-4 text-sm font-medium text-accent">{error}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-accent-ink/10 pt-5">
        {version.status === "completed" && !isDefault ? (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={pending !== ""}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {pending === "default" ? <Spinner className="h-4 w-4" /> : null}
            設為預設
          </button>
        ) : null}
        {version.status === "completed" ? (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            disabled={pending !== ""}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            從此版本編輯
          </button>
        ) : null}
        {version.status === "failed" ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={pending !== "" || !canPay}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-4 text-sm font-semibold text-lime transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {pending === "retry" ? <Spinner className="h-4 w-4" /> : null}
            重試・1 credit
          </button>
        ) : null}
        <p className="text-xs text-muted">
          {subscribed ? `剩餘 ${credits} credits` : "需要有效訂閱才能產生新版本"}
        </p>
      </div>

      {editing ? (
        <form onSubmit={submitEdit} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">要改什麼？</span>
            <textarea
              rows={3}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="例如：把睡衣換成紅色，加一頂棒球帽。"
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!instruction.trim() || pending !== "" || !canPay}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "edit" ? <Spinner className="h-4 w-4" /> : null}
              產生新版本・1 credit
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-[44px] cursor-pointer rounded-full px-3 text-sm font-semibold text-muted hover:text-foreground"
            >
              取消
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Workspace**

`src/app/app/characters/[id]/character-workspace.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  editCharacterVersionAction,
  renameCharacterAction,
  retryCharacterVersionAction,
  setDefaultVersionAction,
  type CharacterResult,
} from "@/lib/actions/characters";
import type { PublicCharacter } from "@/lib/serialize";
import { useCharacterPoll } from "./use-character-poll";
import { VersionDetail } from "./version-detail";
import { VersionList } from "./version-list";

// Split character workspace: version list left, selected version right.
export function CharacterWorkspace({
  character: initial,
  credits,
  subscribed,
}: {
  character: PublicCharacter;
  credits: number;
  subscribed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [character, setCharacter] = useState(initial);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState(initial.name);

  const onPoll = useCallback((next: PublicCharacter) => setCharacter(next), []);
  const onPollError = useCallback((message: string) => setError(message), []);
  useCharacterPoll(character, onPoll, onPollError);

  const versionParam = searchParams.get("version");
  const selected =
    character.versions.find((version) => version.id === versionParam) ||
    character.versions.find((version) => version.id === character.defaultVersionId) ||
    character.versions[0];

  function select(id: string) {
    router.replace(`${pathname}?version=${id}`);
  }

  async function run(key: string, action: () => Promise<CharacterResult>) {
    setPending(key);
    setError("");
    const result = await action();
    setPending("");
    if (!result.ok) {
      setError(result.error);
      if (result.error.includes("訂閱") || result.error.includes("credits 不足")) {
        router.push("/app/billing");
      }
      return;
    }
    setCharacter(result.character);
    router.refresh();
    return result.character;
  }

  async function onEdit(instruction: string) {
    const next = await run("edit", () =>
      editCharacterVersionAction(character.id, selected.id, instruction),
    );
    // Jump to the new version so the user watches it generate.
    if (next) select(next.versions[0].id);
  }

  function onRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === character.name) {
      setName(character.name);
      return;
    }
    void run("rename", () => renameCharacterAction(character.id, trimmed));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app/characters" className="text-sm font-semibold text-muted transition hover:text-foreground">
            ← 回到角色
          </Link>
          <input
            type="text"
            value={name}
            maxLength={40}
            aria-label="角色名稱"
            onChange={(event) => setName(event.target.value)}
            onBlur={onRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") (event.target as HTMLInputElement).blur();
            }}
            className="font-display mt-2 block w-full max-w-md rounded-lg border border-transparent bg-transparent text-3xl font-bold hover:border-accent-ink/15 focus-visible:border-accent-ink/30 focus-visible:outline-none"
          />
        </div>
        <p className="text-sm text-muted">
          {character.styleName} · {character.versions.length} 個版本
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[17.5rem_minmax(0,1fr)] md:items-start">
        <VersionList character={character} selectedId={selected.id} onSelect={select} />
        <VersionDetail
          character={character}
          version={selected}
          credits={credits}
          subscribed={subscribed}
          pending={pending}
          error={error}
          onSetDefault={() =>
            void run("default", () => setDefaultVersionAction(character.id, selected.id))
          }
          onEdit={(instruction) => void onEdit(instruction)}
          onRetry={() =>
            void run("retry", () => retryCharacterVersionAction(character.id, selected.id))
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Server page**

`src/app/app/characters/[id]/page.tsx`:

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAppUser } from "@/lib/auth";
import { getActiveSubscription, isSubscriptionActive } from "@/lib/billing/credits";
import { charactersCollection } from "@/lib/collections";
import { toPublicCharacter } from "@/lib/serialize";
import type { Character } from "@/types/character";
import { CharacterWorkspace } from "./character-workspace";

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  if (!ObjectId.isValid(id)) notFound();

  const characters = await charactersCollection();
  const character = (await characters.findOne({
    _id: new ObjectId(id),
    clerkUserId: user.clerkUserId,
  })) as Character | null;
  if (!character) notFound();

  const sub = await getActiveSubscription(user.clerkUserId);

  return (
    <Suspense fallback={<div className="h-64 rounded-[1.5rem] bg-accent-ink/5" />}>
      <CharacterWorkspace
        character={toPublicCharacter(character)}
        credits={user.credits}
        subscribed={isSubscriptionActive(sub)}
      />
    </Suspense>
  );
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add "src/app/app/characters/[id]"
git commit -m "Add the character workspace with versions, edit, default, and polling."
```

---

### Task 6: Cast in videos — types, prompts, pipeline

**Files:**
- Modify: `src/types/project.ts`
- Create: `src/lib/characters/cast-prompt.ts`
- Create: `src/lib/characters/cast-prompt.test.ts`
- Modify: `src/lib/director/run-phase-a.ts`, `src/lib/director/run-phase-b.ts`, `src/lib/director/jobs.ts`
- Modify: `src/lib/higgsfield/frame-prompts.ts`, `src/lib/higgsfield/pipeline.ts`
- Modify: `src/lib/actions/projects.ts` (`createVideoAction`)
- Modify: `src/lib/serialize.ts` (`PublicVideo.cast`)

**Interfaces:**
- Consumes: `CastMember`, `charactersCollection`, `resolveDefaultVersion`.
- Produces:
  - `Project.cast?: CastMember[]`
  - `castBlockForPhaseA(cast: CastMember[] | undefined): string | null`
  - `castLineForPhaseB(cast: CastMember[] | undefined): string`
  - `castParagraphForFrames(cast: CastMember[] | undefined): string[]`
  - `castReferenceUrls(cast: CastMember[] | undefined): string[]`
  - `PublicVideo.cast: Array<{ characterId: string; name: string; blueprintUrl: string }>`

- [ ] **Step 1: Write the failing test**

`src/lib/characters/cast-prompt.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  castBlockForPhaseA,
  castLineForPhaseB,
  castParagraphForFrames,
  castReferenceUrls,
} from "./cast-prompt";
import type { CastMember } from "@/types/character";

const cast: CastMember[] = [
  {
    characterId: new ObjectId(),
    versionId: new ObjectId(),
    name: "小明",
    blueprintUrl: "https://blob/a.png",
    prompt: "七歲男孩，藍格子睡衣",
  },
  {
    characterId: new ObjectId(),
    versionId: new ObjectId(),
    name: "阿花",
    blueprintUrl: "https://blob/b.png",
    prompt: "戴眼鏡的女孩",
  },
];

test("phase A cast block names every member and asks for a lock summary", () => {
  const block = castBlockForPhaseA(cast);
  assert.ok(block);
  assert.match(block, /^Cast \(use these exact names/);
  assert.match(block, /- 小明: 七歲男孩，藍格子睡衣/);
  assert.match(block, /- 阿花: 戴眼鏡的女孩/);
  assert.match(block, /characterLock/);
  assert.equal(castBlockForPhaseA([]), null);
  assert.equal(castBlockForPhaseA(undefined), null);
});

test("phase B line lists names with blueprint urls or none", () => {
  assert.equal(
    castLineForPhaseB(cast),
    "Cast reference sheets: 小明 (https://blob/a.png); 阿花 (https://blob/b.png)",
  );
  assert.equal(castLineForPhaseB([]), "Cast reference sheets: none");
});

test("frame paragraph and reference urls follow the cast", () => {
  const lines = castParagraphForFrames(cast);
  assert.match(lines[0], /Cast reference sheets are attached/);
  assert.match(lines[1], /小明, 阿花/);
  assert.deepEqual(castParagraphForFrames(undefined), []);
  assert.deepEqual(castReferenceUrls(cast), ["https://blob/a.png", "https://blob/b.png"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/lib/characters/cast-prompt.test.ts`
Expected: FAIL — `Cannot find module './cast-prompt'`.

- [ ] **Step 3: Add the cast type and helpers**

In `src/types/project.ts` add `import type { CastMember } from "@/types/character";` and, inside `Project` after `characterImageUrl?: string;`:

```ts
  // Characters chosen at creation; snapshot of each default blueprint.
  cast?: CastMember[];
```

`src/lib/characters/cast-prompt.ts`:

```ts
import type { CastMember } from "@/types/character";

// Text the director and image prompts share so every stage names the same cast.

export function castBlockForPhaseA(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return null;
  return [
    "Cast (use these exact names; they are the only recurring characters):",
    ...cast.map((member) => `- ${member.name}: ${member.prompt}`),
    "Write characterLock as a compact summary of the cast above.",
    "Reference cast members by name in explainerScene.",
  ].join("\n");
}

export function castLineForPhaseB(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return "Cast reference sheets: none";
  return `Cast reference sheets: ${cast
    .map((member) => `${member.name} (${member.blueprintUrl})`)
    .join("; ")}`;
}

export function castParagraphForFrames(cast: CastMember[] | undefined) {
  if (!cast || cast.length === 0) return [];
  return [
    "Cast reference sheets are attached; each character must match its sheet exactly (face, hair, outfit, proportions).",
    `Cast names: ${cast.map((member) => member.name).join(", ")}.`,
  ];
}

export function castReferenceUrls(cast: CastMember[] | undefined) {
  return (cast || []).map((member) => member.blueprintUrl);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/lib/characters/cast-prompt.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Thread cast through Phase A / B**

`src/lib/director/run-phase-a.ts` — add `import { castBlockForPhaseA } from "@/lib/characters/cast-prompt";` and `import type { CastMember } from "@/types/character";`, add `cast?: CastMember[];` to the input type, and replace the `characterNote` assignment with:

```ts
  const characterNote =
    castBlockForPhaseA(input.cast) ||
    (input.characterImageUrl
      ? `A character reference image is provided at ${input.characterImageUrl}. Extract and lock that character.`
      : "No character reference image. Use the default locked everyman from the skill.");
```

`src/lib/director/run-phase-b.ts` — add `import { castLineForPhaseB } from "@/lib/characters/cast-prompt";` and `import type { CastMember } from "@/types/character";`, add `cast?: CastMember[];` to the input type, and replace the line `Character reference image: ${input.characterImageUrl || "none"}` with:

```ts
${input.cast && input.cast.length > 0 ? castLineForPhaseB(input.cast) : `Character reference image: ${input.characterImageUrl || "none"}`}
```

`src/lib/director/jobs.ts` — pass `cast: project.cast,` in both the `runPhaseA({...})` and `runPhaseB({...})` calls, next to `characterImageUrl: project.characterImageUrl,`.

- [ ] **Step 6: Cast-aware frames**

`src/lib/higgsfield/frame-prompts.ts` — add `import { castParagraphForFrames } from "@/lib/characters/cast-prompt";` and insert `...castParagraphForFrames(project.cast),` into the returned array right after the `Locked character (...)` line.

`src/lib/higgsfield/pipeline.ts`:

Add `import { castReferenceUrls } from "@/lib/characters/cast-prompt";`.

In `startFrameGeneration`, replace everything from `const existingStill = ...` through the final `if (project.characterStillUrl) await submitFrameJobs(project);` with:

```ts
  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        status: "frames_generating",
        error: undefined,
        updatedAt: new Date(),
      },
    },
  );

  // With a cast, the blueprints are the lock: skip the still and go straight to frames.
  if (project.cast && project.cast.length > 0) {
    await submitFrameJobs(project);
    return;
  }

  const existingStill = await jobs.findOne({
    projectId: project._id,
    kind: "still",
  });

  if (!existingStill) {
    const still = await submitImage({
      model: skill.higgsfieldDefaults.imageModel,
      prompt: stillPrompt(project),
      aspectRatio: project.aspectRatio,
      quality: skill.higgsfieldDefaults.imageQuality || "low",
      resolution: skill.higgsfieldDefaults.imageResolution || "1k",
      referenceImageUrls: [project.characterImageUrl],
    });
    await jobs.insertOne({
      projectId: project._id,
      clipIndex: -1,
      kind: "still",
      model: skill.higgsfieldDefaults.imageModel,
      requestId: still.request_id,
      statusUrl: still.status_url,
      status: (still.status as GenerationStatus) || "queued",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // A still from an earlier run may already be done; don't wait on it.
  if (project.characterStillUrl) await submitFrameJobs(project);
```

In `submitOneFrame`, replace `referenceImageUrls: [project.characterStillUrl, project.characterImageUrl],` with:

```ts
    referenceImageUrls:
      project.cast && project.cast.length > 0
        ? castReferenceUrls(project.cast)
        : [project.characterStillUrl, project.characterImageUrl],
```

In `submitClipJobs`, replace the `fallbackRef` line with:

```ts
  const fallbackRef =
    project.cast?.[0]?.blueprintUrl || project.characterStillUrl || project.characterImageUrl;
```

- [ ] **Step 7: Snapshot cast in `createVideoAction`**

In `src/lib/actions/projects.ts` add imports:

```ts
import { resolveDefaultVersion } from "@/lib/characters/versions";
import { charactersCollection } from "@/lib/collections"; // merge into the existing collections import
import type { CastMember, Character } from "@/types/character";
```

Add `const CAST_MAX = 4;` near the top.

Replace the `characterImageUrl` read with:

```ts
    const characterIds = formData
      .getAll("characterIds")
      .map(String)
      .filter((id) => ObjectId.isValid(id));
    if (characterIds.length > CAST_MAX) {
      return { ok: false, error: `最多選 ${CAST_MAX} 個角色` };
    }
```

After the skill lookup and before `const now = new Date();` add:

```ts
    let cast: CastMember[] = [];
    if (characterIds.length > 0) {
      const characters = await charactersCollection();
      const docs = (await characters
        .find({
          _id: { $in: characterIds.map((id) => new ObjectId(id)) },
          clerkUserId: user.clerkUserId,
        })
        .toArray()) as Character[];
      if (docs.length !== characterIds.length) {
        return { ok: false, error: "有角色不存在" };
      }
      cast = [];
      for (const id of characterIds) {
        const character = docs.find((doc) => doc._id.toHexString() === id)!;
        const version = resolveDefaultVersion(character);
        if (!version?.blueprintUrl) {
          return { ok: false, error: `角色 ${character.name} 尚未有可用藍圖` };
        }
        cast.push({
          characterId: character._id,
          versionId: version.id,
          name: character.name,
          blueprintUrl: version.blueprintUrl,
          prompt: version.prompt,
        });
      }
    }
```

In the `insertOne` document, replace `characterImageUrl,` with `cast,`.

- [ ] **Step 8: Expose cast on `PublicVideo`**

In `src/lib/serialize.ts` add to `PublicVideo`:

```ts
  cast: Array<{ characterId: string; name: string; blueprintUrl: string }>;
```

and in `toPublicVideo`:

```ts
    cast: (video.cast || []).map((member) => ({
      characterId: member.characterId.toHexString(),
      name: member.name,
      blueprintUrl: member.blueprintUrl,
    })),
```

- [ ] **Step 9: Typecheck, lint, all tests**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/lib/characters/*.test.ts src/lib/folder.test.ts src/lib/billing/credit-balance.test.ts`
Expected: exit 0; 11 tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/types/project.ts src/lib/characters/cast-prompt.ts src/lib/characters/cast-prompt.test.ts src/lib/director src/lib/higgsfield src/lib/actions/projects.ts src/lib/serialize.ts
git commit -m "Snapshot a video cast and feed blueprints into Phase A/B and frame generation."
```

---

### Task 7: Reel form — character picker replaces the upload step

**Files:**
- Create: `src/app/app/projects/[id]/character-picker.tsx`
- Modify: `src/app/app/projects/new/new-project-form.tsx`
- Modify: `src/app/app/projects/[id]/project-workspace.tsx`
- Modify: `src/app/app/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `PublicCharacter`, `charactersCollection`, `toPublicCharacter`.
- Produces: `CharacterPicker({ characters, value, onChange, disabled, max = 4 })`; `NewProjectForm` gains `characters: PublicCharacter[]`; `ProjectWorkspace` gains `characters`.

- [ ] **Step 1: Picker**

`src/app/app/projects/[id]/character-picker.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { PublicCharacter } from "@/lib/serialize";

// Multi-select of characters with a completed default blueprint.
export function CharacterPicker({
  characters,
  value,
  onChange,
  disabled,
  max = 4,
}: {
  characters: PublicCharacter[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const ready = characters.filter((character) => character.previewUrl);

  if (ready.length === 0) {
    return (
      <p className="text-sm text-muted">
        還沒有可用的角色。
        <Link href="/app/characters" className="ml-1 font-semibold underline underline-offset-4">
          先到角色庫建立 →
        </Link>
      </p>
    );
  }

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else if (value.length < max) {
      onChange([...value, id]);
    }
  }

  return (
    <div>
      <div role="group" aria-label="角色" className="grid gap-2 sm:grid-cols-2">
        {ready.map((character) => {
          const active = value.includes(character.id);
          const full = !active && value.length >= max;
          return (
            <motion.button
              key={character.id}
              type="button"
              role="checkbox"
              aria-checked={active}
              disabled={disabled || full}
              onClick={() => toggle(character.id)}
              whileTap={{ scale: 0.98 }}
              className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-accent-ink bg-accent-ink text-paper"
                  : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.previewUrl!}
                alt=""
                width={72}
                height={40}
                className="h-10 w-[72px] shrink-0 rounded-md bg-white object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{character.name}</span>
                <span className={`block text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                  {character.styleName}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        已選 {value.length} / {max}。
        <Link href="/app/characters" className="ml-1 underline underline-offset-4">
          管理角色
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Swap Step 06 in the form**

In `src/app/app/projects/new/new-project-form.tsx`:

1. Remove `import { uploadCharacterImageAction } from "@/lib/actions/upload";` and add `import { CharacterPicker } from "../[id]/character-picker";` and `import type { PublicCharacter, PublicSkill, PublicVideo } from "@/lib/serialize";` (merge with the existing type import).
2. Add `characters: PublicCharacter[];` to the props type and destructure `characters`.
3. Replace the `characterImageUrl`/`uploading` state with:

```ts
  const [characterIds, setCharacterIds] = useState<string[]>(
    initialVideo?.cast.map((member) => member.characterId) || [],
  );
```

4. Delete the `onUpload` function.
5. In `onSubmit`, replace `if (characterImageUrl) formData.set("characterImageUrl", characterImageUrl);` with:

```ts
    for (const id of characterIds) formData.append("characterIds", id);
```

6. Replace the whole `<Section step="06" title="角色參考圖" ...>…</Section>` block with:

```tsx
              <Section step="06" title="角色" hint="選填。最多 4 個；分鏡與分鏡圖會鎖定這些角色的藍圖。">
                <CharacterPicker
                  characters={characters}
                  value={characterIds}
                  onChange={setCharacterIds}
                  disabled={submitting}
                />
              </Section>
```

7. In `canSubmit`, remove `&& !uploading`.
8. Delete the `UploadIcon` function at the bottom of the file.
9. In the locked summary row (the `key="summary"` block), after the duration `<span>`, add the cast names when present:

```tsx
                {project?.cast.length ? (
                  <>
                    <Dot />
                    <span>{project.cast.map((member) => member.name).join("、")}</span>
                  </>
                ) : null}
```

- [ ] **Step 3: Thread characters through the workspace and page**

`src/app/app/projects/[id]/project-workspace.tsx` — add `characters: PublicCharacter[];` to props (import the type from `@/lib/serialize`), destructure it, and pass `characters={characters}` to `<NewProjectForm>`.

`src/app/app/projects/[id]/page.tsx` — add imports `charactersCollection` (merge into the collections import), `toPublicCharacter` (merge into the serialize import), and `import type { Character } from "@/types/character";`. After the skills query add:

```ts
  const charactersCol = await charactersCollection();
  const characters = (
    (await charactersCol
      .find({ clerkUserId: user.clerkUserId })
      .sort({ updatedAt: -1 })
      .toArray()) as Character[]
  ).map(toPublicCharacter);
```

and pass `characters={characters}` to `<ProjectWorkspace>`.

- [ ] **Step 4: Typecheck, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/lib/characters/*.test.ts src/lib/folder.test.ts src/lib/billing/credit-balance.test.ts`
Expected: exit 0; 11 tests pass. `rg -n "characterImageUrl" src/app` prints nothing (the field stays only in `src/lib` for legacy data).

- [ ] **Step 5: Smoke the routes compile**

With `npm run dev` running: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/app/characters` and the same for `/app/skills`.
Expected: `/app/characters` → `307` (Clerk redirect, page compiled); `/app/skills` → `404`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/app/projects/[id]" src/app/app/projects/new/new-project-form.tsx
git commit -m "Pick characters in the reel form instead of uploading a reference image."
```

---

## Manual QA (after login, not automated)

1. `/app/characters` → 新增角色（doodle, description, optional image）→ lands on workspace, v1 shows 生成中, credits −1; sheet appears within ~1–2 min; v1 badged 預設.
2. 從此版本編輯「把睡衣換成紅色」→ v2 appears selected and generating; on completion, 設為預設 works; card on `/app/characters` shows v2.
3. Force a failure (e.g. temporarily invalid `HF_CREDENTIALS`) → version shows 失敗 and credits refunded; 重試 charges again.
4. New reel with two characters → Phase A storyboard names them; approving frames creates no `still` job and each frame job carries two `image_references`.
5. New reel with no characters → still job runs as before.
6. `/app/skills` returns 404; nav shows 角色.
