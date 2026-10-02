# Director Instruction + Scene Reference Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the brief's "Topic or script" field to a director Instruction and let users attach up to 4 described reference images that the director assigns to clips and that scene stills use as references.

**Architecture:** Images live once on the video document (`referenceImages`, ids `R1..R4`). Phase A receives them as labelled multimodal parts and writes `referenceImageIds` per storyboard row. `frameSubmitPlan` resolves those ids to URLs and puts them after the anchor and before cast/logo refs; existing per-model limits and contact-sheet stacking handle overflow.

**Tech Stack:** Next.js 16 server actions, React 19, MongoDB driver 7, zod 4, AI SDK `generateText` + `@ai-sdk/google`, `@vercel/blob`, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-02-director-instruction-reference-images-design.md`

## Global Constraints

- DB field stays `source`; MCP param stays `source`. Only UI copy and prompt wording change.
- Max 4 reference images; description required, trimmed, 1–300 chars; ids assigned server-side `R1..Rn` in user order.
- Stored URLs must pass `isBrandAssetUrl(url, clerkUserId, blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN))`.
- Uploads: PNG/JPG/WebP, ≤ 5MB (existing `checkBrandUpload` / `uploadBrandAssetAction`).
- Frame ref order: `[annotated, anchor, ...clip scene refs, ...character locks, ...logo]`.
- Phase A reference image download failure skips that image (log), never fails Phase A.
- `brief-defaults.ts` must not store reference images.
- New UI component in its own file in `src/presentation/components/app/projects/new/`, with `"use client"`.
- Short, clear code comments matching surrounding density.
- **Do not commit.** `src/model/project.ts`, `src/service/project/actions.ts`, `src/service/director/run-phase-a.ts`, `src/service/mcp/server.ts`, `new-project-form.tsx`, and both `brief.*.ts` files already carry the user's uncommitted work. Leave every change in the working tree for the user to review; skip all commit steps.
- Verification per task: `npx tsx --test <files>`; at the end `npx tsc --noEmit` and `npx eslint <touched files>`.

## File Structure

- Create `src/service/project/reference-images.ts` — pure helpers: limits, parse/validate, clip id sanitizing, clip URL lookup, director prompt text.
- Create `src/service/project/reference-images.test.ts`.
- Create `src/service/director/reference-image-content.ts` — downloads reference images into labelled AI SDK content parts (skips failures).
- Create `src/service/project/reference-image-import.ts` — MCP: download a public image URL and re-host to the user's brand path.
- Create `src/presentation/components/app/projects/new/reference-images-field.tsx` — upload rows UI.
- Modify `src/model/project.ts`, `src/model/director.ts` — types/schemas.
- Modify `src/service/project/actions.ts` — read/write `referenceImages`.
- Modify `src/presentation/serialize.ts` — expose `referenceImages`.
- Modify `src/service/director/run-phase-a.ts`, `src/service/director/jobs.ts` — instruction wording, image parts, rules, id sanitizing.
- Modify `src/service/higgsfield/frame-prompts.ts` + test — scene refs and prompt line.
- Modify `new-project-form.tsx`, `brief.en.ts`, `brief.zh-Hant.ts` — copy + field wiring.
- Modify `src/service/mcp/server.ts` — describe + `referenceImages` param.

---

### Task 1: Model types and pure reference-image helpers

**Files:**
- Modify: `src/model/project.ts` (types near line 73 `StoryboardRow`, line 160 `Project`; schemas near line 237 and 272)
- Modify: `src/model/director.ts:3-17`
- Create: `src/service/project/reference-images.ts`
- Test: `src/service/project/reference-images.test.ts`

**Interfaces:**
- Produces:
  - `type ReferenceImage = { id: string; url: string; description: string }` (exported from `@/model/project`)
  - `Project.referenceImages?: ReferenceImage[]`, `StoryboardRow.referenceImageIds?: string[]`
  - `MAX_REFERENCE_IMAGES = 4`, `REFERENCE_DESCRIPTION_MAX = 300`
  - `parseReferenceImages(raw: string, isAllowedUrl: (url: string) => boolean): { ok: true; images: ReferenceImage[] } | { ok: false; error: string }`
  - `sanitizeClipReferenceIds<T extends { referenceImageIds?: string[] }>(clips: T[], images: ReferenceImage[] | undefined): T[]`
  - `clipReferenceImageUrls(project: Pick<Project, "phaseA" | "referenceImages">, clipNumber: number): string[]`
  - `referenceImageLabel(image: ReferenceImage): string`
  - `phaseAReferenceImageRules(images: ReferenceImage[]): string`

- [ ] **Step 1: Add types and schemas**

In `src/model/project.ts`, add above `export type StoryboardRow`:

```ts
// User-supplied scene reference for the director. Max 4 per video, ids R1..R4.
export type ReferenceImage = {
  id: string;
  url: string;
  description: string;
};
```

Inside `StoryboardRow`, before `editedAt`:

```ts
  // Reference images (R1..R4) the director assigned to this clip's stills.
  referenceImageIds?: string[];
```

Inside `Project`, after `logoUrl?: string;`:

```ts
  // Scene references from the brief; the director assigns them per clip.
  referenceImages?: ReferenceImage[];
```

In the `storyboardRowSchema` in `project.ts`, before `editedAt`:

```ts
  referenceImageIds: z.array(z.string()).optional(),
```

In `projectSchema`, after `logoUrl: z.string().optional(),`:

```ts
  referenceImages: z
    .array(z.object({ id: z.string(), url: z.string(), description: z.string() }))
    .optional(),
```

In `src/model/director.ts` `storyboardRowSchema`, before `bgmSfx`:

```ts
  referenceImageIds: z.array(z.string()).optional(),
```

- [ ] **Step 2: Write the failing test**

Create `src/service/project/reference-images.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Project } from "@/model/project";
import {
  MAX_REFERENCE_IMAGES,
  clipReferenceImageUrls,
  parseReferenceImages,
  phaseAReferenceImageRules,
  referenceImageLabel,
  sanitizeClipReferenceIds,
} from "@/service/project/reference-images";

const allowed = (url: string) => url.startsWith("https://store/explainer/brand/u/");
const img = (n: number, description = `desc ${n}`) => ({
  url: `https://store/explainer/brand/u/${n}.png`,
  description,
});

test("empty input means no reference images", () => {
  assert.deepEqual(parseReferenceImages("", allowed), { ok: true, images: [] });
});

test("ids are reassigned R1..Rn in user order and descriptions trimmed", () => {
  const raw = JSON.stringify([{ ...img(2), id: "R9", description: "  shop front " }, img(1)]);
  const parsed = parseReferenceImages(raw, allowed);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.images, [
    { id: "R1", url: img(2).url, description: "shop front" },
    { id: "R2", url: img(1).url, description: "desc 1" },
  ]);
});

test("rejects more than the limit, blank descriptions, long descriptions, foreign urls, bad json", () => {
  const tooMany = Array.from({ length: MAX_REFERENCE_IMAGES + 1 }, (_, i) => img(i));
  assert.deepEqual(parseReferenceImages(JSON.stringify(tooMany), allowed), {
    ok: false,
    error: "參考圖最多 4 張",
  });
  assert.deepEqual(parseReferenceImages(JSON.stringify([img(1, "  ")]), allowed), {
    ok: false,
    error: "請為每張參考圖填寫說明",
  });
  assert.deepEqual(parseReferenceImages(JSON.stringify([img(1, "x".repeat(301))]), allowed), {
    ok: false,
    error: "參考圖說明最多 300 字",
  });
  assert.deepEqual(
    parseReferenceImages(JSON.stringify([{ url: "https://evil/x.png", description: "d" }]), allowed),
    { ok: false, error: "參考圖來源無效，請重新上傳" },
  );
  assert.deepEqual(parseReferenceImages("{nope", allowed), { ok: false, error: "參考圖資料無效" });
});

const images = [
  { id: "R1", url: "https://store/r1.png", description: "a" },
  { id: "R2", url: "https://store/r2.png", description: "b" },
];

test("sanitize keeps known ids once and drops the field when empty", () => {
  const clips = sanitizeClipReferenceIds(
    [
      { clipNumber: 1, referenceImageIds: ["R2", "R2", "R7", "R1"] },
      { clipNumber: 2, referenceImageIds: ["R9"] },
      { clipNumber: 3 },
    ],
    images,
  );
  assert.deepEqual(clips, [
    { clipNumber: 1, referenceImageIds: ["R1", "R2"] },
    { clipNumber: 2 },
    { clipNumber: 3 },
  ]);
  assert.deepEqual(sanitizeClipReferenceIds([{ clipNumber: 1, referenceImageIds: ["R1"] }], undefined), [
    { clipNumber: 1 },
  ]);
});

test("clip urls follow the row's ids", () => {
  const video = {
    referenceImages: images,
    phaseA: { clips: [{ clipNumber: 1, referenceImageIds: ["R2"] }, { clipNumber: 2 }] },
  } as unknown as Pick<Project, "phaseA" | "referenceImages">;
  assert.deepEqual(clipReferenceImageUrls(video, 1), ["https://store/r2.png"]);
  assert.deepEqual(clipReferenceImageUrls(video, 2), []);
  assert.deepEqual(clipReferenceImageUrls({ phaseA: undefined }, 1), []);
});

test("director text names each image and the assignment rule", () => {
  assert.equal(referenceImageLabel(images[0]), "Reference image R1: a");
  const rules = phaseAReferenceImageRules(images);
  assert.match(rules, /R1, R2/);
  assert.match(rules, /referenceImageIds/);
  assert.equal(phaseAReferenceImageRules([]), "");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test src/service/project/reference-images.test.ts`
Expected: FAIL — cannot find module `@/service/project/reference-images`.

- [ ] **Step 4: Implement helpers**

Create `src/service/project/reference-images.ts`:

```ts
import type { Project, ReferenceImage } from "@/model/project";

export const MAX_REFERENCE_IMAGES = 4;
export const REFERENCE_DESCRIPTION_MAX = 300;

export type ReferenceImagesParse =
  | { ok: true; images: ReferenceImage[] }
  | { ok: false; error: string };

function stringField(item: unknown, key: string) {
  if (!item || typeof item !== "object") return "";
  const value = (item as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

// Brief JSON → validated images. Client ids are ignored; order decides R1..Rn.
export function parseReferenceImages(
  raw: string,
  isAllowedUrl: (url: string) => boolean,
): ReferenceImagesParse {
  if (!raw.trim()) return { ok: true, images: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "參考圖資料無效" };
  }
  if (!Array.isArray(data)) return { ok: false, error: "參考圖資料無效" };
  if (data.length > MAX_REFERENCE_IMAGES) {
    return { ok: false, error: `參考圖最多 ${MAX_REFERENCE_IMAGES} 張` };
  }
  const images: ReferenceImage[] = [];
  for (const [index, item] of data.entries()) {
    const url = stringField(item, "url");
    const description = stringField(item, "description");
    if (!description) return { ok: false, error: "請為每張參考圖填寫說明" };
    if (description.length > REFERENCE_DESCRIPTION_MAX) {
      return { ok: false, error: `參考圖說明最多 ${REFERENCE_DESCRIPTION_MAX} 字` };
    }
    if (!url || !isAllowedUrl(url)) return { ok: false, error: "參考圖來源無效，請重新上傳" };
    images.push({ id: `R${index + 1}`, url, description });
  }
  return { ok: true, images };
}

// Keep only ids that exist, once each, in R1..Rn order; drop the field when empty.
export function sanitizeClipReferenceIds<T extends { referenceImageIds?: string[] }>(
  clips: T[],
  images: ReferenceImage[] | undefined,
): T[] {
  const known = (images || []).map((image) => image.id);
  return clips.map((clip) => {
    const { referenceImageIds, ...rest } = clip;
    const ids = known.filter((id) => referenceImageIds?.includes(id));
    return (ids.length ? { ...rest, referenceImageIds: ids } : rest) as T;
  });
}

// URLs of the reference images the director assigned to one clip.
export function clipReferenceImageUrls(
  project: Pick<Project, "phaseA" | "referenceImages">,
  clipNumber: number,
): string[] {
  const row = project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber);
  const ids = row?.referenceImageIds || [];
  return (project.referenceImages || [])
    .filter((image) => ids.includes(image.id))
    .map((image) => image.url);
}

export function referenceImageLabel(image: ReferenceImage) {
  return `Reference image ${image.id}: ${image.description}`;
}

// System rules for Phase A; empty when the brief has no reference images.
export function phaseAReferenceImageRules(images: ReferenceImage[]) {
  if (images.length === 0) return "";
  const ids = images.map((image) => image.id).join(", ");
  return [
    `The user attached scene reference images ${ids}, each labelled with its description in the user message.`,
    "Use them to plan scenes: match the composition, subject, product, and setting they show.",
    "For each clip whose scene should follow a reference, list its id(s) in that clip's referenceImageIds.",
    "Only tag clips the image truly fits. One image may serve several clips. You do not have to use every image, and most clips may have none.",
    "When a clip has referenceImageIds, its scene fields must describe what that image shows.",
  ].join(" ");
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test src/service/project/reference-images.test.ts`
Expected: PASS (6 tests).

---

### Task 2: Server brief parsing and serialization

**Files:**
- Modify: `src/service/project/actions.ts:62-151` (`BriefFields`, `readVideoBrief`), `:306-328` (insert), `:412-437` (update)
- Modify: `src/presentation/serialize.ts:50` (type) and `:159` (mapper)

**Interfaces:**
- Consumes: `parseReferenceImages` from Task 1.
- Produces: `PublicVideo.referenceImages: ReferenceImage[]` (always an array); FormData key `referenceImages` (JSON string of `{ url, description }[]`).

- [ ] **Step 1: Extend `BriefFields` and `readVideoBrief`**

Add import:

```ts
import { parseReferenceImages } from "@/service/project/reference-images";
import type { ReferenceImage } from "@/model/project";
```

(Merge `ReferenceImage` into the existing `import type { … } from "@/model/project"` block instead of a second import.)

In `BriefFields` add after `logoUrl?: string;`:

```ts
  // Up to 4 described scene references, ids R1..Rn.
  referenceImages: ReferenceImage[];
```

Change the missing-source error copy:

```ts
  if (!source) return { ok: false, error: "請提供導演指示" };
```

After the logo check (before `return { ok: true, … }`):

```ts
  // Image gen downloads these too, so only this user's brand uploads are allowed.
  const storeHost = blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN);
  const references = parseReferenceImages(String(formData.get("referenceImages") || ""), (url) =>
    isBrandAssetUrl(url, clerkUserId, storeHost),
  );
  if (!references.ok) return references;
```

Add `referenceImages: references.images,` to the returned `brief`.

- [ ] **Step 2: Persist on create and rewrite**

In `createVideoAction` insert, after the `logoUrl` spread:

```ts
      ...(brief.referenceImages.length ? { referenceImages: brief.referenceImages } : {}),
```

In `rewriteVideoBrief` `$set`, after the `logoUrl` spread:

```ts
          ...(brief.referenceImages.length ? { referenceImages: brief.referenceImages } : {}),
```

and in `$unset`, after the logo line:

```ts
          ...(brief.referenceImages.length ? {} : { referenceImages: "" }),
```

- [ ] **Step 3: Serialize**

In `src/presentation/serialize.ts`, add to `PublicVideo` after `logoUrl?: string;`:

```ts
  referenceImages: NonNullable<Project["referenceImages"]>;
```

and in `toPublicVideo` after `logoUrl: video.logoUrl,`:

```ts
    referenceImages: video.referenceImages || [],
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `actions.ts` / `serialize.ts` (the form does not read the field yet).

---

### Task 3: Director Phase A — instruction wording, image parts, id sanitizing

**Files:**
- Create: `src/service/director/reference-image-content.ts`
- Modify: `src/service/director/run-phase-a.ts:65-85` (input), `:106-114` (loading), `:151-160` (system rules), `:200-227` (user content), `:236-240` (sanitize)
- Modify: `src/service/director/jobs.ts:48-65`

**Interfaces:**
- Consumes: `referenceImageLabel`, `phaseAReferenceImageRules`, `sanitizeClipReferenceIds` (Task 1); `loadDirectorImageParts` from `@/service/character/cast-prompt`.
- Produces: `loadReferenceImageContent(images?: ReferenceImage[]): Promise<{ parts: Array<{ type: "text"; text: string } | { type: "image"; image: Uint8Array }>; attached: ReferenceImage[] }>`; `runPhaseA` input `referenceImages?: ReferenceImage[]`.

- [ ] **Step 1: Create the tolerant loader**

`src/service/director/reference-image-content.ts`:

```ts
import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { referenceImageLabel } from "@/service/project/reference-images";
import type { ReferenceImage } from "@/model/project";

type ContentPart = { type: "text"; text: string } | { type: "image"; image: Uint8Array };

// Label + bytes per reference image. A failed download is skipped, not fatal.
export async function loadReferenceImageContent(images: ReferenceImage[] = []) {
  const parts: ContentPart[] = [];
  const attached: ReferenceImage[] = [];
  for (const image of images) {
    try {
      const [part] = await loadDirectorImageParts([image.url]);
      if (!part) continue;
      parts.push({ type: "text", text: referenceImageLabel(image) }, part);
      attached.push(image);
    } catch (error) {
      console.error("[phase-a] reference image skipped", { id: image.id, error });
    }
  }
  return { parts, attached };
}
```

- [ ] **Step 2: Wire into `runPhaseA`**

Imports:

```ts
import { loadReferenceImageContent } from "@/service/director/reference-image-content";
import {
  phaseAReferenceImageRules,
  sanitizeClipReferenceIds,
} from "@/service/project/reference-images";
```

and add `ReferenceImage` to the `import type { … } from "@/model/project"` block.

Input type, after `logoUrl?: string;`:

```ts
  // Brief scene references; the director tags clips with their ids.
  referenceImages?: ReferenceImage[];
```

After `const logoImages = …`:

```ts
  const references = await loadReferenceImageContent(input.referenceImages);
```

In the system template, right after the `${ characterImages.length ? … : "" }` block, add:

```ts
${phaseAReferenceImageRules(references.attached)}
```

Replace the first lines of the user text:

```ts
            text: `Director instruction (may contain the topic, an outline, or a full script — follow it):
${input.source}
```

Change the content array order to put references before characters:

```ts
          ...references.parts,
          ...characterImages,
          ...logoImages,
```

When building `next`, sanitize ids (talking-head rows are replaced later and carry none):

```ts
  let next: PhaseAProposal = {
    ...output,
    loopMode: "linear",
    clips: sanitizeClipReferenceIds(
      dualBeat ? output.clips.map(normalizeDualBeatRow) : output.clips,
      references.attached,
    ),
  };
```

(This replaces the existing `...(dualBeat ? { clips: … } : {})` spread.)

- [ ] **Step 3: Pass from the job**

In `src/service/director/jobs.ts` `runPhaseA({ … })`, after `logoUrl: project.logoUrl,`:

```ts
      referenceImages: project.referenceImages,
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx tsx --test src/service/project/reference-images.test.ts src/service/director/*.test.ts`
Expected: PASS, no type errors.

---

### Task 4: Scene stills use the clip's reference images

**Files:**
- Modify: `src/service/higgsfield/frame-prompts.ts:218-260` (`buildFramePrompt` counts/lines), `:333-340` (compose), `:390-408` (`frameSubmitPlan`)
- Test: `src/service/higgsfield/frame-prompts.test.ts`

**Interfaces:**
- Consumes: `clipReferenceImageUrls` (Task 1).
- Produces: exported `sceneReferenceFrameLine(start: number, count: number): string`.

- [ ] **Step 1: Write the failing tests**

Append to `src/service/higgsfield/frame-prompts.test.ts`:

```ts
test("assigned scene references sit after the anchor and before the cast", () => {
  const video = project();
  video.cast = [
    {
      characterId: new ObjectId(),
      versionId: new ObjectId(),
      name: "Lily",
      blueprintUrl: "https://blob/c.png",
      prompt: "",
    },
  ];
  video.referenceImages = [
    { id: "R1", url: "https://blob/r1.png", description: "shop" },
    { id: "R2", url: "https://blob/r2.png", description: "menu" },
  ];
  video.phaseA!.clips[0].referenceImageIds = ["R2"];
  const plan = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(plan.refs, ["https://blob/r2.png", "https://blob/c.png"]);
  assert.match(plan.prompt, /SCENE REFERENCE: attached image 1 shows/);
  assert.match(plan.prompt, /attached image 2/);
});

test("clips without assigned references attach none", () => {
  const video = project();
  video.referenceImages = [{ id: "R1", url: "https://blob/r1.png", description: "shop" }];
  const plan = frameSubmitPlan(video, 1, "start");
  assert.deepEqual(plan.refs, []);
  assert.doesNotMatch(plan.prompt, /SCENE REFERENCE/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/service/higgsfield/frame-prompts.test.ts`
Expected: FAIL — refs lack `https://blob/r2.png`, no `SCENE REFERENCE` line.

- [ ] **Step 3: Implement**

Import:

```ts
import { clipReferenceImageUrls } from "@/service/project/reference-images";
```

Add near `logoReferenceUrls`:

```ts
// Brief reference images the director assigned to this clip; they guide layout, not cast looks.
export function sceneReferenceFrameLine(start: number, count: number) {
  const which =
    count === 1 ? `attached image ${start} shows` : `attached images ${start}–${start + count - 1} show`;
  return `SCENE REFERENCE: ${which} the intended layout, subject, and setting for this scene — follow their composition; keep cast identity from the character references.`;
}
```

In `buildFramePrompt`, replace

```ts
  const characterAttachmentStart = annotatedCount + anchorCount + 1;
```

with

```ts
  const sceneRefUrls = clipReferenceImageUrls(project, clipNumber);
  const sceneRefStart = annotatedCount + anchorCount + 1;
  const characterAttachmentStart = sceneRefStart + sceneRefUrls.length;
  const sceneRefLines = sceneRefUrls.length
    ? [sceneReferenceFrameLine(sceneRefStart, sceneRefUrls.length)]
    : [];
```

In `compose`, insert before `...castLines,`:

```ts
    ...sceneRefLines,
```

In `frameSubmitPlan`, change `lockUrls`:

```ts
      lockUrls: [
        ...clipReferenceImageUrls(project, clipNumber),
        ...frameLockReferenceUrls(project),
        ...logoReferenceUrls(project),
      ],
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/service/higgsfield/frame-prompts.test.ts`
Expected: PASS (all existing tests plus the 2 new ones).

---

### Task 5: Brief form — Instruction copy and reference image rows

**Files:**
- Create: `src/presentation/components/app/projects/new/reference-images-field.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx` (state ~155/179, `briefUnchanged` 260-278, `briefFormData` 280-296, `resetBriefFromProject` 361-373, `canSubmit` 683-688, Section 02 at 778-795)
- Modify: `src/util/i18n/messages/workspace/brief.en.ts:27-36`, `brief.zh-Hant.ts:27-35`

**Interfaces:**
- Consumes: `PublicVideo.referenceImages` (Task 2), `BrandUploadButton`, `MAX_REFERENCE_IMAGES`, `REFERENCE_DESCRIPTION_MAX` (Task 1).
- Produces: `ReferenceImageDraft = { url: string; description: string }`; `<ReferenceImagesField value onChange onError disabled />`.

- [ ] **Step 1: i18n copy**

`brief.en.ts` — replace `section02` and `source`, add `references`:

```ts
  section02: {
    title: "Instruction",
    hint: "Tell the director how to plan this video: what to cover, tone, structure, must-have shots. You can also paste a full script or article.",
  },
  source: {
    label: "Instruction",
    placeholder:
      "For example: Explain why compound interest matters for young adults. Open with a surprising number, use one simple metaphor, end with one action step.",
    charCount: "{n} characters",
  },
  references: {
    title: "Reference images",
    hint: "Optional, up to {max}. Describe each image; the director decides which scenes use it and reuses it when drawing those scenes.",
    add: "Add reference image",
    remove: "Remove",
    alt: "Reference image {id}",
    descriptionLabel: "Description of {id}",
    descriptionPlaceholder: "What this shows and how to use it, e.g. our shop front — use for the opening scene.",
    descriptionCount: "{n}/{max}",
    descriptionRequired: "Add a description for every reference image.",
  },
```

`brief.zh-Hant.ts` — same keys:

```ts
  section02: {
    title: "導演指示",
    hint: "告訴導演這支影片要怎麼規劃：要講什麼、語氣、結構、必要的畫面。也可以直接貼上完整腳本或文章。",
  },
  source: {
    label: "導演指示",
    placeholder: "例如：解釋為什麼複利對年輕人特別重要。開場用一個驚人的數字，用一個簡單比喻說明，最後給一個行動建議。",
    charCount: "{n} 字",
  },
  references: {
    title: "參考圖",
    hint: "選填，最多 {max} 張。替每張圖寫說明；導演會決定用在哪些場景，並在產生那些場景圖時當參考。",
    add: "加入參考圖",
    remove: "移除",
    alt: "參考圖 {id}",
    descriptionLabel: "{id} 的說明",
    descriptionPlaceholder: "這張圖是什麼、要怎麼用，例如：我們的店面，用在開場。",
    descriptionCount: "{n}/{max}",
    descriptionRequired: "請為每張參考圖填寫說明。",
  },
```

Also update `footer.editBriefWarning` wording "Changing the topic" → "Changing the instruction" (en) and the matching zh-Hant line "改題材" → "改導演指示" if present.

- [ ] **Step 2: Create the field component**

`src/presentation/components/app/projects/new/reference-images-field.tsx`:

```tsx
"use client";

import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  MAX_REFERENCE_IMAGES,
  REFERENCE_DESCRIPTION_MAX,
} from "@/service/project/reference-images";

const REFERENCE_ACCEPT = "image/png,image/jpeg,image/webp";

export type ReferenceImageDraft = { url: string; description: string };

// Up to 4 brief reference images: thumbnail, required description, remove.
export function ReferenceImagesField({
  value,
  onChange,
  onError,
  disabled,
}: {
  value: ReferenceImageDraft[];
  onChange: (next: ReferenceImageDraft[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  function update(index: number, description: string) {
    onChange(value.map((item, i) => (i === index ? { ...item, description } : item)));
  }

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold">{t("brief.references.title")}</p>
      <p className="mt-1 text-xs text-muted">
        {t("brief.references.hint", { max: String(MAX_REFERENCE_IMAGES) })}
      </p>
      <ul className="mt-3 space-y-3">
        {value.map((item, index) => {
          const id = `R${index + 1}`;
          return (
            <li key={item.url} className="flex gap-3 rounded-2xl border border-accent-ink/10 bg-paper p-3">
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--studio-fill)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={t("brief.references.alt", { id })} className="h-full w-full object-cover" />
                <span className="font-display absolute left-1 top-1 rounded-full bg-lime px-1.5 text-[10px] font-bold">
                  {id}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor={`reference-${id}`}>
                  {t("brief.references.descriptionLabel", { id })}
                </label>
                <textarea
                  id={`reference-${id}`}
                  rows={2}
                  required
                  maxLength={REFERENCE_DESCRIPTION_MAX}
                  value={item.description}
                  disabled={disabled}
                  onChange={(event) => update(index, event.target.value)}
                  placeholder={t("brief.references.descriptionPlaceholder")}
                  className="w-full resize-y rounded-xl border border-accent-ink/15 bg-white px-3 py-2 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                />
                <div className="mt-1 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                    className="inline-flex min-h-8 cursor-pointer items-center rounded-md px-2.5 text-xs font-semibold text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("brief.references.remove")}
                  </button>
                  <span className="text-xs tabular-nums text-muted">
                    {t("brief.references.descriptionCount", {
                      n: String(item.description.length),
                      max: String(REFERENCE_DESCRIPTION_MAX),
                    })}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {value.length < MAX_REFERENCE_IMAGES ? (
        <div className="mt-3">
          <BrandUploadButton
            label={t("brief.references.add")}
            accept={REFERENCE_ACCEPT}
            disabled={disabled}
            onUploaded={(asset) => {
              if (asset.kind === "image") onChange([...value, { url: asset.url, description: "" }]);
            }}
            onError={onError}
          />
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Wire into the form**

Import:

```ts
import {
  ReferenceImagesField,
  type ReferenceImageDraft,
} from "@/presentation/components/app/projects/new/reference-images-field";
```

State, after `logoUrl` state:

```ts
  const [referenceImages, setReferenceImages] = useState<ReferenceImageDraft[]>(
    () => toReferenceDrafts(initialVideo?.referenceImages),
  );
```

Add a module-level helper near `Section`:

```ts
// Saved images → editable rows (ids are reassigned server-side).
function toReferenceDrafts(images: PublicVideo["referenceImages"] | undefined): ReferenceImageDraft[] {
  return (images || []).map((image) => ({ url: image.url, description: image.description }));
}
```

`briefUnchanged()` — add before the cast comparison:

```ts
      JSON.stringify(toReferenceDrafts(project.referenceImages)) ===
        JSON.stringify(referenceImages.map((item) => ({ ...item, description: item.description.trim() }))) &&
```

`briefFormData()` — after the logo line:

```ts
    formData.set("referenceImages", JSON.stringify(referenceImages));
```

`resetBriefFromProject` — after `setLogoUrl(…)`:

```ts
    setReferenceImages(toReferenceDrafts(video.referenceImages));
```

`canSubmit` — add:

```ts
    referenceImages.every((item) => item.description.trim().length > 0) &&
```

Section 02 — after the char-count `<p>`:

```tsx
                <ReferenceImagesField
                  value={referenceImages}
                  onChange={setReferenceImages}
                  onError={setError}
                  disabled={briefBusy}
                />
                {referenceImages.some((item) => !item.description.trim()) ? (
                  <p className="mt-2 text-xs text-muted">{t("brief.references.descriptionRequired")}</p>
                ) : null}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx eslint src/presentation/components/app/projects/new/reference-images-field.tsx src/presentation/components/app/projects/new/new-project-form.tsx src/util/i18n/messages/workspace/brief.en.ts src/util/i18n/messages/workspace/brief.zh-Hant.ts`
Expected: clean. (zh-Hant must satisfy `MessageShape<typeof briefEn>`; tsc catches missing keys.)

- [ ] **Step 5: Manual check in the browser**

With `npm run dev` running, open a folder → New video. Confirm: section 02 reads "Instruction / 導演指示"; adding 4 images hides the add button; Start stays disabled until every description is filled; after creating, restart shows the same rows.

---

### Task 6: MCP `create_video` accepts reference images

**Files:**
- Create: `src/service/project/reference-image-import.ts`
- Modify: `src/service/mcp/server.ts:280-326`

**Interfaces:**
- Consumes: `persistBuffer` (`@/service/higgsfield/persist`), `brandAssetPath`, `checkBrandUpload`, `isBrandAssetUrl`, `blobStoreHost` (`@/service/video-edit/edit-state`).
- Produces: `importReferenceImage(url: string, clerkUserId: string): Promise<string>` (brand URL; throws on failure).

- [ ] **Step 1: Create the importer**

```ts
import { randomUUID } from "node:crypto";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  blobStoreHost,
  brandAssetPath,
  checkBrandUpload,
  isBrandAssetUrl,
} from "@/service/video-edit/edit-state";

// MCP has no upload tool: copy a public image into the user's brand folder.
export async function importReferenceImage(url: string, clerkUserId: string): Promise<string> {
  if (isBrandAssetUrl(url, clerkUserId, blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN))) return url;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`無法下載參考圖（${response.status}）`);
  const type = (response.headers.get("content-type") || "").split(";")[0].trim();
  const buffer = Buffer.from(await response.arrayBuffer());
  const checked = checkBrandUpload({ type, size: buffer.length });
  if (!checked.ok || checked.kind !== "image") {
    throw new Error(checked.ok ? "參考圖只支援 PNG、JPG、WebP" : checked.error);
  }
  return persistBuffer(buffer, brandAssetPath(clerkUserId, randomUUID(), checked.ext), type);
}
```

- [ ] **Step 2: Extend the tool**

Import `importReferenceImage`. In `create_video` `inputSchema`, change `source` and add `referenceImages`:

```ts
        source: z
          .string()
          .min(1)
          .describe("Director instruction: how to plan the video; may include the topic or a full script"),
        referenceImages: z
          .array(
            z.object({
              url: z.string().url().describe("Public PNG/JPG/WebP image, ≤ 5MB"),
              description: z.string().min(1).max(300).describe("What it shows and how the director should use it"),
            }),
          )
          .max(4)
          .optional()
          .describe("Scene references; the director assigns them to clips and reuses them for scene stills"),
```

In the handler, before `createVideoAction(form)`:

```ts
      const references = [];
      for (const item of args.referenceImages || []) {
        references.push({
          url: await importReferenceImage(item.url, user.clerkUserId),
          description: item.description,
        });
      }
      if (references.length) form.set("referenceImages", JSON.stringify(references));
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint src/service/mcp/server.ts src/service/project/reference-image-import.ts`
Expected: clean.

---

### Task 7: Full verification

- [ ] **Step 1:** `npx tsx --test $(rg --files -g '*.test.ts' src)` — all pass.
- [ ] **Step 2:** `npx tsc --noEmit` — clean.
- [ ] **Step 3:** `npx eslint` on every touched file — clean.
- [ ] **Step 4:** End-to-end in the browser: create a video with 2 reference images (e.g. a product photo and a shop front) and an instruction mentioning both. After Phase A, check in Mongo that some `phaseA.clips[].referenceImageIds` are set, generate that clip's frames, and confirm the still follows the reference.
- [ ] **Step 5:** Report to the user; leave all changes uncommitted.
