# Style Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One typed style catalog (9 styles, each with a typography guideline) that drives character blueprints, storyboard frames and the director prompts, with generated preview images shown in both creation forms; image generation moves to GPT Image `medium`, frames persist without alpha, and single-frame redos attach the sibling frame as a style reference.

**Architecture:** `src/lib/styles/` becomes the registry (`catalog.ts` data, `prompts.ts` pure prompt builders, `list.ts` server merge with Mongo). Consumers (`frame-prompts.ts`, `pipeline.ts`, `blueprint-prompt.ts`, `load-skill-prompt.ts`) stop carrying whiteboard literals and call the builders with a resolved `Style`. A new Mongo `styles` collection stores only preview state written by `scripts/seed-style-previews.ts`. A shared `StylePicker` renders preview cards in the video form and the character modal.

**Tech Stack:** Next.js App Router server actions, MongoDB driver, Higgsfield `@higgsfield/client/v2` (`openai/gpt-image-1.5`), Vercel Blob, `sharp`, `node --test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-09-18-style-registry-design.md`

## Global Constraints

- Style ids: `"doodle" | "flat-vector" | "paper-cutout" | "chalkboard" | "watercolor" | "clay" | "pixel" | "ink-manga" | "realistic"`; `DEFAULT_STYLE_ID = "doodle"`.
- No hex / RGB / Pantone notation inside any prompt text (SKILL.md rule). `canvasColor` is UI/flatten only and must never be emitted into a prompt.
- Image model stays `openai/gpt-image-1.5`; quality `"medium"` everywhere images are generated.
- Existing imports of `@/lib/styles` (`STYLES`, `STYLE_IDS`, `StyleId`, `isStyleId`) keep working.
- Videos without `styleId` resolve to `doodle`.
- Tests: `npx tsx --test <files>`; also `npx tsc --noEmit` and `npm run lint` before each commit.
- Reply/commit messages to the user in Traditional Chinese; code comments short and in English (repo convention).

---

### Task 1: Style catalog + prompt builders

**Files:**
- Create: `src/lib/styles/catalog.ts`
- Create: `src/lib/styles/prompts.ts`
- Create: `src/lib/styles/index.ts`
- Create: `src/lib/styles/prompts.test.ts`
- Delete: `src/lib/styles.ts`

**Interfaces:**
- Produces: `Style`, `StyleId`, `STYLES`, `STYLE_IDS`, `DEFAULT_STYLE_ID`, `isStyleId`, `resolveStyle(id?: string): Style`, `styleBlockForDirector(style): string`, `styleLinesForFrame(style): string[]`, `styleLinesForBlueprint(style): string[]`, `styleLetteringLine(style): string`.

- [ ] **Step 1: Write the failing test** `src/lib/styles/prompts.test.ts`

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { STYLES, STYLE_IDS, resolveStyle } from "./catalog";
import {
  styleBlockForDirector,
  styleLetteringLine,
  styleLinesForBlueprint,
  styleLinesForFrame,
} from "./prompts";

const HEX = /#[0-9a-f]{3,8}\b/i;

test("every style ships a director block with typography, motion and negatives", () => {
  for (const id of STYLE_IDS) {
    const block = styleBlockForDirector(STYLES[id]);
    assert.match(block, /## Visual style/);
    assert.match(block, /Typography:/);
    assert.match(block, /Motion:/);
    assert.match(block, /Never:/);
    assert.doesNotMatch(block, HEX, `${id} leaks a hex code`);
  }
});

test("frame lines name the style, canvas, look and lettering", () => {
  const lines = styleLinesForFrame(STYLES.doodle);
  assert.match(lines.join("\n"), /Whiteboard doodle explainer video/);
  assert.match(lines.join("\n"), /Canvas: clean solid white canvas/);
  assert.match(styleLetteringLine(STYLES.doodle), /^Lettering: .*all-caps marker labels/);
  assert.doesNotMatch(lines.join("\n"), HEX);
});

test("blueprint lines carry the canvas so a chalkboard sheet is not white", () => {
  const chalk = styleLinesForBlueprint(STYLES.chalkboard).join("\n");
  assert.match(chalk, /dark green slate chalkboard/);
  assert.doesNotMatch(chalk, /solid white/);
});

test("resolveStyle falls back to doodle", () => {
  assert.equal(resolveStyle(undefined).id, "doodle");
  assert.equal(resolveStyle("nope").id, "doodle");
  assert.equal(resolveStyle("pixel").id, "pixel");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test src/lib/styles/prompts.test.ts`  
Expected: FAIL — cannot find module `./catalog`.

- [ ] **Step 3: Write `src/lib/styles/catalog.ts`**

```ts
// Single source of truth for visual styles. Characters and videos share it;
// prompts are built from these fields by ./prompts.ts. Colour words only in
// prompt fields (SKILL.md forbids hex inside model prompts); `canvasColor`
// is for UI cards and alpha-flattening and never reaches a prompt.
export type StyleId =
  | "doodle"
  | "flat-vector"
  | "paper-cutout"
  | "chalkboard"
  | "watercolor"
  | "clay"
  | "pixel"
  | "ink-manga"
  | "realistic";

export type Style = {
  id: StyleId;
  name: string;
  nameZh: string;
  description: string;
  canvas: string;
  canvasColor: string;
  look: string;
  palette: string;
  typography: string;
  motion: string;
  negatives: string;
};

export const DEFAULT_STYLE_ID: StyleId = "doodle";

export const STYLE_IDS: StyleId[] = [
  "doodle",
  "flat-vector",
  "paper-cutout",
  "chalkboard",
  "watercolor",
  "clay",
  "pixel",
  "ink-manga",
  "realistic",
];

// Shared preview scene: identical composition for every style so the nine
// cards compare directly and each shows how the style renders text.
export const STYLE_PREVIEW_SCENE =
  "Scene: a friendly explainer character stands at the left third, pointing up at a large light bulb floating at the right third; the bulb carries the label IDEA; one arrow curves from the character's hand to the bulb. Wide margins on every side. Showcase this style's canvas, look and lettering.";

export const STYLES: Record<StyleId, Style> = {
  doodle: {
    id: "doodle",
    name: "Whiteboard doodle",
    nameZh: "白板塗鴉手繪",
    description: "黑色馬克筆線條、扁平上色，白板解說感。",
    canvas: "clean solid white canvas, as if sketched with a digital marker",
    canvasColor: "#ffffff",
    look: "2D hand-drawn cartoon: bold black outlines with slightly irregular organic stroke weight, lines never perfectly straight; flat marker-style colour fills sitting slightly inside the outlines and a little scribbled; almost no shading",
    palette: "white canvas, black ink, light blue, warm yellow, brown, green and gray; warm yellow for tags and highlights, green for arrows and positive tags, brown for cardboard boxes, gray for neutral props",
    typography: "short handwritten all-caps marker labels in black with the same stroke weight as the outlines and a slightly wobbly baseline; tags are warm-yellow rounded rectangles with a black outline; never printed fonts, never subtitles or captions",
    motion: "marker-doodle animation: objects pop, morph and slide with snappy hand-drawn timing; arrows draw themselves on; icons snap into place",
    negatives: "photorealism, 3D rendering, painterly shading, gradients, chalkboard inversion, polished outline-free vector art, perfect CAD geometry, watermarks",
  },
  "flat-vector": {
    id: "flat-vector",
    name: "Flat vector",
    nameZh: "扁平向量插畫",
    description: "無外框幾何造型、企業風配色，乾淨俐落。",
    canvas: "flat solid off-white canvas",
    canvasColor: "#f6f4ee",
    look: "clean flat vector illustration with no outlines: simple geometric shapes, soft rounded corners, characters with slightly elongated limbs, flat colour blocks with at most one darker tone for depth, no gradients, no textures",
    palette: "off-white canvas with a confident corporate palette: deep indigo, coral, mustard, teal and a warm range of skin tones; one accent colour per scene",
    typography: "clean geometric sans-serif labels in title case, medium weight, set in deep indigo or the scene accent colour; labels sit in soft rounded pill shapes or float with generous spacing; never handwriting",
    motion: "smooth eased motion: shapes slide and scale with gentle overshoot, elements assemble from simple geometric parts, subtle parallax",
    negatives: "outlines, hand-drawn wobble, photorealism, 3D shading, gradients, textures, heavy drop shadows",
  },
  "paper-cutout": {
    id: "paper-cutout",
    name: "Paper cut-out",
    nameZh: "剪紙拼貼",
    description: "層疊色紙、手撕邊緣與微陰影的停格質感。",
    canvas: "kraft-toned textured paper backdrop",
    canvasColor: "#e9dcc5",
    look: "layered paper cut-out collage: every element is a flat piece of coloured construction paper with slightly torn or scissor-cut edges, stacked with small soft drop shadows to show depth; visible paper grain, no outlines",
    palette: "kraft paper background with saturated construction-paper colours: tomato red, sky blue, sunflower yellow, leaf green, cream and charcoal",
    typography: "letters cut individually from dark paper and glued slightly askew, bold uppercase, each letter casting a tiny shadow; labels sit on a torn paper strip in a contrasting colour",
    motion: "stop-motion paper feel: pieces slide in on flat planes, flip and layer, slight jitter between frames, shadows move with the pieces",
    negatives: "outlines, smooth vector shading, photorealistic people, gradients, glossy 3D, digital fonts",
  },
  chalkboard: {
    id: "chalkboard",
    name: "Chalkboard",
    nameZh: "粉筆黑板",
    description: "深綠黑板、白色與粉彩粉筆手繪。",
    canvas: "dark green slate chalkboard with faint chalk-dust smudges",
    canvasColor: "#2f4f3f",
    look: "hand-drawn chalk illustration: white chalk strokes with rough dusty texture and slightly uneven pressure, sparse cross-hatch shading, coloured chalk used only for accents",
    palette: "dark green board, white chalk, pastel chalk accents in yellow, pink, light blue and mint",
    typography: "handwritten chalk lettering in white, all caps, slightly uneven with chalk-dust texture; key words underlined with a quick chalk stroke or boxed in a coloured chalk rectangle",
    motion: "chalk draws itself on stroke by stroke, erased areas leave a faint smear, elements wipe in and out like a hand drawing live",
    negatives: "white background, marker lines, photorealism, 3D, glossy fills, gradients, printed fonts",
  },
  watercolor: {
    id: "watercolor",
    name: "Watercolour storybook",
    nameZh: "水彩繪本",
    description: "柔和暈染、鉛筆線稿的繪本氛圍。",
    canvas: "warm cream cold-pressed watercolour paper with visible grain",
    canvasColor: "#fbf6ea",
    look: "storybook watercolour: loose translucent washes with soft bleeding edges and granulation, fine pencil or sepia ink line work underneath, white paper left showing as highlights",
    palette: "cream paper with soft washes: dusty rose, sage green, ochre, muted cobalt and warm gray; colours stay light and airy",
    typography: "gentle hand-lettered sepia ink in mixed case like a picture-book caption, sitting on a light wash blob or plain paper; never bold blocky text",
    motion: "washes bloom outward, ink lines draw on softly, elements fade and drift like turning pages",
    negatives: "hard vector edges, black marker outlines, photorealism, neon colours, 3D rendering, heavy shadows",
  },
  clay: {
    id: "clay",
    name: "Claymation",
    nameZh: "3D 黏土動畫",
    description: "手捏黏土、柔光攝影棚的停格動畫。",
    canvas: "soft studio backdrop in a single pastel colour",
    canvasColor: "#efe6f5",
    look: "stop-motion claymation: chunky hand-sculpted plasticine characters and props with visible fingerprints and slight lumpiness, soft studio lighting, shallow depth of field, matte surfaces",
    palette: "pastel backdrop with bright plasticine colours: coral, sunshine yellow, mint, sky blue and warm terracotta skin tones",
    typography: "words sculpted from clay in rounded bold letters standing upright on the set with soft shadows; labels are small clay plaques with pressed-in letters; never flat graphic text",
    motion: "stop-motion cadence: squash and stretch, objects morph by reshaping the clay, slight hand-animated jitter",
    negatives: "flat 2D drawing, outlines, glossy CGI plastic, photorealistic humans, painted-on gradients, printed fonts",
  },
  pixel: {
    id: "pixel",
    name: "Pixel art",
    nameZh: "像素風",
    description: "16-bit 方塊像素、復古遊戲機調色。",
    canvas: "flat dark navy background with a subtle pixel grid",
    canvasColor: "#1e2340",
    look: "16-bit pixel art: crisp square pixels with no anti-aliasing, limited palette, chunky one-pixel dark outlines, simple dithering for shading, characters roughly forty-eight pixels tall",
    palette: "dark navy background with a retro console palette: bright cyan, magenta, lime, gold, white and a few skin tones",
    typography: "blocky monospaced pixel font in white or gold, uppercase, with a one-pixel dark drop shadow; labels sit in simple pixel boxes like a game HUD",
    motion: "sprite animation: frame-stepped movement, objects blink and slide in whole-pixel steps, flashing highlights, screen-shake on impacts",
    negatives: "smooth curves, anti-aliasing, gradients, photorealism, hand-drawn lines, blurry edges, vector shapes",
  },
  "ink-manga": {
    id: "ink-manga",
    name: "Ink manga",
    nameZh: "黑白漫畫線稿",
    description: "沾水筆線條、網點與速度線的漫畫張力。",
    canvas: "white manga page with a panel-free composition",
    canvasColor: "#ffffff",
    look: "black-and-white manga ink drawing: confident variable-width brush inking, screentone dot patterns for mid-tones, dramatic speed lines and impact bursts, expressive exaggerated faces",
    palette: "strictly black ink on white with gray screentone; a single spot colour of red allowed for one emphasis element per scene",
    typography: "bold hand-inked sound-effect style lettering in black with white inner fill and thick outline, uppercase, slightly tilted; explanatory labels sit inside rounded speech-bubble shapes with a small tail",
    motion: "manga panel energy: speed lines streak in, elements slam in with impact bursts, quick cuts, tone patterns shimmer",
    negatives: "full colour fills, painterly shading, photorealism, 3D, soft gradients, printed body-text fonts, chibi marker doodle",
  },
  realistic: {
    id: "realistic",
    name: "Cinematic realistic",
    nameZh: "寫實電影感",
    description: "真實光影、35mm 鏡頭感的電影劇照。",
    canvas: "real-world environment appropriate to the scene, softly lit",
    canvasColor: "#d9d6d0",
    look: "photorealistic cinematic still: natural skin and fabric detail, believable lighting with a soft key and gentle fill, 35mm lens look with shallow depth of field, filmic colour grading, no illustration",
    palette: "naturalistic colours with a filmic grade: warm highlights, teal-leaning shadows, restrained saturation",
    typography: "text appears only as physical objects in the scene: printed signs, labels, sticky notes, screens or chalk on a real board, in a clean modern sans-serif with correct perspective and lighting; never floating graphic overlays",
    motion: "live-action camera language: slow dolly, rack focus, handheld micro-drift, natural physics",
    negatives: "cartoon, outlines, flat colour, illustration, 3D toon shading, floating UI text, watermarks, uncanny faces",
  },
};

export function isStyleId(value: string | undefined): value is StyleId {
  return Boolean(value && STYLE_IDS.includes(value as StyleId));
}

// Old videos have no styleId; anything unknown is the original doodle look.
export function resolveStyle(id: string | undefined): Style {
  return STYLES[isStyleId(id) ? id : DEFAULT_STYLE_ID];
}
```

- [ ] **Step 4: Write `src/lib/styles/prompts.ts`**

```ts
import type { Style } from "./catalog";

// Markdown block appended to the director system prompt. It explicitly
// supersedes SKILL.md's whiteboard "Locked visual world" so one skill can
// drive every style.
export function styleBlockForDirector(style: Style) {
  return [
    `## Visual style: ${style.name} (overrides the "Locked visual world" section above)`,
    `Canvas: ${style.canvas}.`,
    `Look: ${style.look}.`,
    `Palette: ${style.palette}.`,
    `Typography: ${style.typography}.`,
    `Motion: ${style.motion}.`,
    `Never: ${style.negatives}.`,
    "Write visualWorld, palette and characterLock in this style. Keep every other rule (hooks, pacing, clip structure, cast lock, narration) unchanged.",
  ].join("\n");
}

// Opening lines of every storyboard-frame / still prompt.
export function styleLinesForFrame(style: Style) {
  return [
    `Single storyboard still for a ${style.name} explainer video.`,
    `Canvas: ${style.canvas}. Look: ${style.look}. Never: ${style.negatives}. No watermark.`,
  ];
}

// Placed next to the spelling rule so lettering and spelling travel together.
export function styleLetteringLine(style: Style) {
  return `Lettering: ${style.typography}.`;
}

// Character model-sheet rendering rules; the layout lines stay in blueprint-prompt.ts.
export function styleLinesForBlueprint(style: Style) {
  return [
    `Background: ${style.canvas}.`,
    `Rendering: ${style.look}.`,
    `Palette: ${style.palette}.`,
    `Never: ${style.negatives}.`,
  ];
}
```

- [ ] **Step 5: Write `src/lib/styles/index.ts` and delete `src/lib/styles.ts`**

```ts
export * from "./catalog";
export * from "./prompts";
```

`git rm src/lib/styles.ts`. All existing `@/lib/styles` imports now resolve to the folder index.

- [ ] **Step 6: Run tests, tsc**

Run: `npx tsx --test src/lib/styles/prompts.test.ts && npx tsc --noEmit`  
Expected: 4 tests pass; tsc reports errors only in `blueprint-prompt.ts` (uses removed `promptFragment`) — fixed in Task 2.

- [ ] **Step 7: Commit** (after Task 2 makes tsc green — commit both together as `feat(styles): typed style catalog with typography guidelines`).

---

### Task 2: Consumers read the catalog (blueprint, frame, still) + `Project.styleId`

**Files:**
- Modify: `src/types/project.ts` (add `styleId?: StyleId` to `Project`)
- Modify: `src/lib/serialize.ts` (`PublicVideo.styleId: StyleId`, resolve in `toPublicVideo`)
- Modify: `src/lib/characters/blueprint-prompt.ts`
- Modify: `src/lib/characters/blueprint-prompt.test.ts`
- Modify: `src/lib/higgsfield/frame-prompts.ts`
- Create: `src/lib/higgsfield/frame-prompts.test.ts`
- Modify: `src/lib/higgsfield/pipeline.ts` (`stillPrompt`)
- Modify: `src/lib/actions/generation.ts` (new `buildFramePrompt` signature)

**Interfaces:**
- Consumes: Task 1 builders.
- Produces: `buildFramePrompt(project, clipNumber, position, options?: { revision?: FrameRevision; styleRefUrl?: string })`; `videoStyle(project: Pick<Project, "styleId">): Style` exported from `frame-prompts.ts`.

- [ ] **Step 1: Types.** In `src/types/project.ts` import `StyleId` from `@/lib/styles` and add to `Project`: `// Visual style; videos created before the registry have none → doodle.` `styleId?: StyleId;`. In `serialize.ts` add `styleId: StyleId` to `PublicVideo` and `styleId: resolveStyle(video.styleId).id` in `toPublicVideo`.

- [ ] **Step 2: Blueprint.** In `blueprint-prompt.ts` replace `STYLES[input.styleId].promptFragment` with `...styleLinesForBlueprint(STYLES[input.styleId])`, and change `SHEET_LAYOUT[0]` to drop `solid white background,` (background now comes from the style line) and `SHEET_LAYOUT[1]` "blank white space" → "blank margin", "wide empty white margins" → "wide empty margins". Update the existing test assertions: `/solid white background/` → `/Background: clean solid white canvas/`, `/Leave at least 12% blank white space/` → `/Leave at least 12% blank margin/`; add:

```ts
test("chalkboard blueprint sits on a chalkboard, not white", () => {
  const prompt = buildBlueprintPrompt({ styleId: "chalkboard", description: "x", hasReference: false });
  assert.match(prompt, /Background: dark green slate chalkboard/);
  assert.doesNotMatch(prompt, /white background/i);
});
```

- [ ] **Step 3: Frame prompt test** `src/lib/higgsfield/frame-prompts.test.ts`

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { Project } from "@/types/project";
import { buildFramePrompt } from "./frame-prompts";

function project(styleId?: Project["styleId"]): Project {
  return {
    _id: new ObjectId(), projectId: new ObjectId(), userId: new ObjectId(), clerkUserId: "u",
    skillId: new ObjectId(), skillSlug: "s", source: "src", aspectRatio: "16:9",
    durationPreset: "punchy", styleId, status: "frames_ready", clips: [], creditCost: 0,
    creditsCharged: false, createdAt: new Date(), updatedAt: new Date(),
    phaseA: {
      englishTitle: "t", localizedTitle: "t", targetDuration: "15s", clipCount: 1, loopMode: "linear",
      coreMessage: "c", hookStrategy: "h", aspectRatio: "16:9", visualWorld: "vw", narrator: "n",
      englishWordCount: 5, characterLock: "lock", palette: "pal", bgmDirection: "b", narrativeArc: "a",
      clips: [{ clipNumber: 1, timeRange: "0-5s", durationSeconds: 5, narrativeJob: "j",
        explainerScene: "scene", motionCamera: "cam", englishVo: "vo", referenceTranslation: "r", bgmSfx: "s" }],
    },
  } as Project;
}

test("doodle frame prompt uses catalog text, no hard-coded whiteboard literal", () => {
  const prompt = buildFramePrompt(project(), 1, "start");
  assert.match(prompt, /Whiteboard doodle explainer video/);
  assert.match(prompt, /Canvas: clean solid white canvas/);
  assert.match(prompt, /Lettering: short handwritten all-caps marker labels/);
  assert.doesNotMatch(prompt, /whiteboard-doodle cartoon explainer video/);
});

test("pixel video gets pixel canvas and lettering", () => {
  const prompt = buildFramePrompt(project("pixel"), 1, "end");
  assert.match(prompt, /Pixel art explainer video/);
  assert.match(prompt, /Lettering: blocky monospaced pixel font/);
});

test("sibling reference line appears only when a styleRefUrl is given", () => {
  const without = buildFramePrompt(project(), 1, "start");
  const withRef = buildFramePrompt(project(), 1, "start", { styleRefUrl: "https://x/y.png" });
  assert.doesNotMatch(without, /sibling frame/);
  assert.match(withRef, /A sibling frame from the same clip is attached/);
});
```

Run: `npx tsx --test src/lib/higgsfield/frame-prompts.test.ts` → FAIL (signature / literals).

- [ ] **Step 4: Implement in `frame-prompts.ts`**

```ts
import { resolveStyle, styleLetteringLine, styleLinesForFrame, type Style } from "@/lib/styles";

export type FramePromptOptions = {
  revision?: FrameRevision;
  // Completed sibling frame (other end of the same clip) attached as a style anchor on redo.
  styleRefUrl?: string;
};

export function videoStyle(project: Pick<Project, "styleId">): Style {
  return resolveStyle(project.styleId);
}

export function buildFramePrompt(project, clipNumber, position, options: FramePromptOptions = {}) {
  const style = videoStyle(project);
  // ...row/next/moment unchanged...
  return [
    ...styleLinesForFrame(style),
    `Visual world: ${phaseA.visualWorld}`,
    `Palette: ${phaseA.palette}`,
    `Locked character (must look identical in every frame): ${phaseA.characterLock}`,
    ...castParagraphForFrames(project.cast),
    `Scene: ${row.explainerScene}`,
    `Motion and camera across the clip: ${row.motionCamera}`,
    moment,
    ...(options.styleRefUrl
      ? ["A sibling frame from the same clip is attached: match its line weight, character proportions, colouring and lettering exactly."]
      : []),
    ...revisionLines(options.revision),
    styleLetteringLine(style),
    "Any on-canvas text must be spelled exactly as written in the scene description.",
    `Aspect ratio ${project.aspectRatio}.`,
  ].join("\n");
}
```

Update callers: `initialFrames` (no options), `generation.ts` two call sites → `buildFramePrompt(project, clipNumber, position, { revision })` / `{ revision: next.revision }`.

- [ ] **Step 5: `stillPrompt` in `pipeline.ts`**

```ts
function stillPrompt(project: Project) {
  const style = videoStyle(project);
  const lock = project.phaseA?.characterLock || "default explainer everyman";
  return [
    `Character visual lock still for a ${style.name} explainer video.`,
    `Canvas: ${style.canvas}. Look: ${style.look}. Never: ${style.negatives}.`,
    `Front three-quarter standing pose, identical character: ${lock}.`,
    `Aspect ratio ${project.aspectRatio}.`,
  ].join(" ");
}
```

- [ ] **Step 6: Verify + commit**

Run: `npx tsx --test src/lib/styles/prompts.test.ts src/lib/characters/blueprint-prompt.test.ts src/lib/higgsfield/frame-prompts.test.ts && npx tsc --noEmit && npm run lint`  
Commit: `feat(styles): typed style catalog with typography guidelines; frames, stills and blueprints read it`

---

### Task 3: Director prompts receive the style

**Files:**
- Modify: `src/lib/director/load-skill-prompt.ts`
- Modify: `src/lib/director/run-phase-a.ts`, `src/lib/director/run-phase-b.ts`
- Modify: `src/lib/director/jobs.ts`

- [ ] **Step 1:** `skillPromptForPhaseA(skill, style)` / `skillPromptForPhaseB(skill, style)` return `` `${attachReferences(...)}\n\n${styleBlockForDirector(style)}` ``.
- [ ] **Step 2:** `runPhaseA` / `runPhaseB` inputs gain `style: Style`; pass through to the helpers.
- [ ] **Step 3:** In `jobs.ts` both call sites add `style: videoStyle(project)` (import from `@/lib/higgsfield/frame-prompts`).
- [ ] **Step 4:** `npx tsc --noEmit && npm run lint`; commit `feat(director): inject visual style block into Phase A/B prompts`.

---

### Task 4: Medium quality, opaque background, alpha flatten, COGS constant

**Files:**
- Modify: `scripts/seed-skills.ts` (`imageQuality: "medium"`, fix comment)
- Modify: `src/lib/higgsfield/pipeline.ts` (`|| "low"` → `|| "medium"` ×2; flatten in `applyJobStatus`)
- Modify: `src/lib/higgsfield/generate.ts` (`background: "opaque"`)
- Create: `src/lib/higgsfield/flatten.ts`, `src/lib/higgsfield/flatten.test.ts`
- Modify: `src/lib/billing/unit-economics.ts` (`TYPICAL_COGS_PER_CREDIT_USD = 0.225`, update comment)

- [ ] **Step 1: Flatten test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { flattenToCanvas } from "./flatten";

test("transparent pixels become the canvas colour and alpha is dropped", async () => {
  const rgba = await sharp({ create: { width: 2, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const out = await flattenToCanvas(rgba, "#2f4f3f");
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 3);
  assert.deepEqual([data[0], data[1], data[2]], [0x2f, 0x4f, 0x3f]);
});

test("opaque input passes through unchanged", async () => {
  const rgb = await sharp({ create: { width: 1, height: 1, channels: 3, background: "#ffffff" } }).png().toBuffer();
  const out = await flattenToCanvas(rgb, "#000000");
  assert.deepEqual(out, rgb);
});
```

- [ ] **Step 2: `flatten.ts`**

```ts
import sharp from "sharp";

// GPT Image sometimes returns RGBA with a transparent "canvas". Frames must be
// opaque so they read the same everywhere; fill with the style's canvas colour.
export async function flattenToCanvas(buffer: Buffer, canvasHex: string) {
  const meta = await sharp(buffer).metadata();
  if (!meta.hasAlpha) return buffer;
  return sharp(buffer).flatten({ background: canvasHex }).png().toBuffer();
}
```

- [ ] **Step 3: `generate.ts`** — in `submitImage`, when `/gpt-image/i.test(input.model)` add `background: "opaque"` to `common` (both the `/edit` and text branches). Probe: run `node -e` against Higgsfield's estimate endpoint (`https://platform.higgsfield.ai/estimate/openai/gpt-image-1.5`, header `Authorization: Key $HF_CREDENTIALS`, body with and without `background`) and note in the commit message whether the field is accepted; the flatten step covers the drop case either way.

- [ ] **Step 4: `pipeline.ts applyJobStatus`** — for `job.kind === "still" | "frame"`, load the project once (it is already loaded later for the refund; hoist it) and call

```ts
blobUrl = await persistMedia(input.outputUrl, path, {
  transform: (buf) => flattenToCanvas(buf, videoStyle(project).canvasColor).catch(() => buf),
});
```

- [ ] **Step 5:** quality/COGS edits; run `npx tsx --test src/lib/higgsfield/flatten.test.ts && npx tsc --noEmit && npm run lint`; commit `feat(images): medium quality, opaque backgrounds, alpha flatten to canvas colour`.

---

### Task 5: Sibling frame as style reference on redo

**Files:**
- Modify: `src/lib/higgsfield/pipeline.ts` (`submitOneFrame`, `regenerateFrames`)

- [ ] **Step 1:** `submitOneFrame(project, skill, clipNumber, position, options: { revision?: FrameRevision; styleRefUrl?: string } = {})`; prompt → `buildFramePrompt(project, clipNumber, position, options)`; refs → `[options.revision?.annotatedUrl, options.styleRefUrl, ...lockRefs]`.
- [ ] **Step 2:** In `regenerateFrames`, before submitting each target:

```ts
const sibling = project.frames?.find(
  (f) => f.clipNumber === target.clipNumber && f.position !== target.position && f.status === "completed",
);
await submitOneFrame(project, skill, target.clipNumber, target.position, {
  revision: target.revision,
  styleRefUrl: sibling?.blobUrl || sibling?.outputUrl,
});
```

`submitFrameJobs` (initial batch) keeps calling with no options.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`; commit `feat(frames): attach sibling frame as style reference when redrawing`.

---

### Task 6: `styles` collection, `listPublicStyles`, preview seed script

**Files:**
- Create: `src/types/style-doc.ts`
- Modify: `src/lib/collections.ts` (`stylesCollection`)
- Modify: `src/lib/serialize.ts` (`PublicStyle`)
- Create: `src/lib/styles/list.ts` (server-only)
- Create: `scripts/seed-style-previews.ts`
- Modify: `package.json` (`"seed:styles": "tsx scripts/seed-style-previews.ts"`)

- [ ] **Step 1: Types**

```ts
// src/types/style-doc.ts
import type { StyleId } from "@/lib/styles";
// Generated state only; definitions live in src/lib/styles/catalog.ts.
export type StyleDoc = {
  _id: StyleId;
  previewUrl?: string;
  previewHash?: string;
  previewRequestId?: string;
  updatedAt: Date;
};
```

`collections.ts`: `export async function stylesCollection(): Promise<Collection<StyleDoc>> { const db = await getDb(); return db.collection<StyleDoc>("styles"); }`

`serialize.ts`: `export type PublicStyle = { id: StyleId; name: string; nameZh: string; description: string; canvasColor: string; previewUrl?: string };`

- [ ] **Step 2: `src/lib/styles/list.ts`**

```ts
import "server-only";
import { stylesCollection } from "@/lib/collections";
import type { PublicStyle } from "@/lib/serialize";
import { STYLES, STYLE_IDS } from "./catalog";

// Catalog order + whatever previews the seed script has produced.
export async function listPublicStyles(): Promise<PublicStyle[]> {
  const docs = await (await stylesCollection()).find({}).toArray();
  return STYLE_IDS.map((id) => {
    const { name, nameZh, description, canvasColor } = STYLES[id];
    return { id, name, nameZh, description, canvasColor, previewUrl: docs.find((d) => d._id === id)?.previewUrl };
  });
}
```

- [ ] **Step 3: `scripts/seed-style-previews.ts`**

```ts
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { stylesCollection } from "../src/lib/collections";
import { fetchHiggsfieldStatus, mediaUrlFromResponse, submitImage } from "../src/lib/higgsfield/generate";
import { flattenToCanvas } from "../src/lib/higgsfield/flatten";
import { persistMedia } from "../src/lib/higgsfield/persist";
import { STYLE_IDS, STYLE_PREVIEW_SCENE, STYLES, styleLetteringLine, styleLinesForFrame } from "../src/lib/styles";

loadEnvConfig(process.cwd());

const MODEL = "openai/gpt-image-1.5";
const QUALITY = "medium" as const;
const POLL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;

const force = process.argv.includes("--force");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");

function previewPrompt(id: (typeof STYLE_IDS)[number]) {
  const style = STYLES[id];
  return [...styleLinesForFrame(style), STYLE_PREVIEW_SCENE, styleLetteringLine(style),
    "The label must read exactly IDEA.", "Aspect ratio 16:9."].join("\n");
}

async function waitForImage(statusUrl: string) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await fetchHiggsfieldStatus(statusUrl);
    if (status.status === "completed") {
      const url = mediaUrlFromResponse(status);
      if (!url) throw new Error("completed without image");
      return url;
    }
    if (status.status === "failed" || status.status === "nsfw") throw new Error(`generation ${status.status}`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error("timed out");
}

async function main() {
  const styles = await stylesCollection();
  let failed = 0;
  for (const id of STYLE_IDS) {
    if (only && !only.includes(id)) continue;
    const prompt = previewPrompt(id);
    const hash = createHash("sha256").update(`${prompt}|${MODEL}|${QUALITY}`).digest("hex");
    const existing = await styles.findOne({ _id: id });
    if (!force && existing?.previewUrl && existing.previewHash === hash) {
      console.log(`skip ${id} (up to date)`);
      continue;
    }
    try {
      console.log(`generate ${id}…`);
      const submitted = await submitImage({ model: MODEL, prompt, aspectRatio: "16:9", quality: QUALITY, resolution: "1k" });
      const url = await waitForImage(submitted.status_url);
      const previewUrl = await persistMedia(url, `explainer/styles/${id}`, {
        transform: (buf) => flattenToCanvas(buf, STYLES[id].canvasColor),
      });
      await styles.updateOne({ _id: id }, { $set: { previewUrl, previewHash: hash, previewRequestId: submitted.request_id, updatedAt: new Date() } }, { upsert: true });
      console.log(`  ✓ ${previewUrl}`);
    } catch (error) {
      failed++;
      console.error(`  ✗ ${id}:`, error instanceof Error ? error.message : error);
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
```

Note: `submitImage` attaches a webhook when `HF_WEBHOOK_SECRET` is set; the script must run with `HF_WEBHOOK_SECRET` unset (`env -u HF_WEBHOOK_SECRET npm run seed:styles`) or `submitImage` gains an `options?: { webhook?: false }` flag — implement the flag (cleaner) and pass `{ webhook: false }` from the script.

- [ ] **Step 4:** `npx tsc --noEmit && npm run lint`; commit `feat(styles): styles collection, listPublicStyles and seed:styles preview generator`.

---

### Task 7: `StylePicker` + video form + create action + style-aware character picker

**Files:**
- Create: `src/components/style-picker.tsx`
- Modify: `src/app/app/projects/new/new-project-form.tsx`
- Modify: `src/app/app/projects/[id]/page.tsx` (fetch `listPublicStyles()`, pass `styles`)
- Modify: `src/app/app/projects/[id]/character-picker.tsx` (`styleId` prop, disabled mismatch)
- Modify: `src/lib/actions/projects.ts` (`createVideoAction` reads/validates `styleId`)
- Modify: `src/components/project/frames-timeline.tsx` (style chip in header — optional, one line)

- [ ] **Step 1: `style-picker.tsx`** (`"use client"`, generic component in `src/components/`)

```tsx
"use client";

import { motion } from "framer-motion";
import type { PublicStyle } from "@/lib/serialize";

// Radio grid of visual styles with generated preview cards. Shared by the
// video form and the character modal.
export function StylePicker({ styles, value, onChange, disabled, label = "視覺風格" }: {
  styles: PublicStyle[]; value: string; onChange: (id: PublicStyle["id"]) => void; disabled?: boolean; label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3 sm:grid-cols-3">
      {styles.map((style) => {
        const active = style.id === value;
        return (
          <motion.button key={style.id} type="button" role="radio" aria-checked={active} disabled={disabled}
            onClick={() => onChange(style.id)} whileTap={{ scale: 0.98 }}
            className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? "border-accent-ink bg-accent-ink text-paper" : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"}`}>
            <div className="relative aspect-video w-full" style={{ backgroundColor: style.canvasColor }}>
              {style.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={style.previewUrl} alt={`${style.nameZh} 預覽`} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="absolute inset-0 grid place-items-center font-display text-sm font-bold text-accent-ink/60">{style.nameZh}</span>
              )}
            </div>
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold">{style.nameZh}</p>
              <p className={`mt-0.5 text-xs leading-5 ${active ? "text-paper/75" : "text-muted"}`}>{style.description}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Video form.** Props gain `styles: PublicStyle[]`; state `const [styleId, setStyleId] = useState<StyleId>(initialVideo?.styleId || DEFAULT_STYLE_ID)`; Step 01 renders `SkillPicker` then a sub-label 「視覺風格」 and `<StylePicker styles={styles} value={styleId} onChange={(id) => { setStyleId(id); setCharacterIds((ids) => ids.filter((cid) => characters.find((c) => c.id === cid)?.styleId === id)); }} disabled={locked || submitting} />`; `formData.set("styleId", styleId)`. Step 06 passes `styleId={styleId}` to `CharacterPicker`.
- [ ] **Step 3: `CharacterPicker`** gains `styleId?: string`; a character with `styleId && character.styleId !== styleId` renders `disabled` with a `「風格不同」` badge (`<span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">風格不同</span>`); `toggle` ignores mismatched ids.
- [ ] **Step 4: `createVideoAction`** — `const styleId = String(formData.get("styleId") || "")`; `if (!isStyleId(styleId)) return { ok: false, error: "請選擇視覺風格" };`; after building `cast`, `if (cast.some((m) => docs.find(d => d._id.equals(m.characterId))?.styleId !== styleId)) return { ok: false, error: "角色風格與影片風格不同" };`; insert `styleId`.
- [ ] **Step 5: Page** `projects/[id]/page.tsx`: `const styles = await listPublicStyles();` pass to `NewProjectForm`. Search for every `<NewProjectForm` usage (`rg -n "<NewProjectForm" src`) and pass `styles` in each.
- [ ] **Step 6: Timeline header chip** — in `frames-timeline.tsx` header, next to the title paragraph add `<Chip>{STYLES[project.styleId].nameZh}</Chip>`-style span (reuse the existing small chip styling used in `storyboard-preview.tsx`). Skip if it clutters; not required by spec success criteria.
- [ ] **Step 7:** `npx tsc --noEmit && npm run lint`; commit `feat(videos): choose a visual style with preview cards; cast must match the style`.

---

### Task 8: Character modal uses `StylePicker`

**Files:**
- Modify: `src/app/app/characters/create-character-modal.tsx` (props `styles: PublicStyle[]`, replace chips with `<StylePicker styles={styles} value={styleId} onChange={setStyleId} disabled={submitting} />`)
- Modify: `src/app/app/characters/page.tsx` (`const styles = await listPublicStyles()`; pass to `CreateCharacterButton`)
- Modify: `src/app/app/characters/character-grid.tsx` (if it renders `CreateCharacterButton`, thread `styles` through)

- [ ] **Step 1:** implement; `rg -n "CreateCharacterButton" src` to find every usage.
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint`; commit `feat(characters): style picker with previews in the create dialog`.

---

### Task 9: Seed, verify, ship

- [ ] **Step 1:** `npm run seed:skills` (quality → medium in Mongo).
- [ ] **Step 2:** `npm run seed:styles`; confirm 9 `✓` lines; spot-check two preview URLs render.
- [ ] **Step 3:** Full check: `npx tsx --test src/lib/styles/prompts.test.ts src/lib/characters/*.test.ts src/lib/higgsfield/*.test.ts src/lib/folder.test.ts src/lib/billing/credit-balance.test.ts && npx tsc --noEmit && npm run lint`.
- [ ] **Step 4:** Browser: `npx next dev -p 3100`; open `/app/characters` → 新增角色 shows 9 preview cards; open a folder → new video form shows 9 cards under 解說風格, picking 粉筆黑板 disables doodle characters with 風格不同. Screenshot both.
- [ ] **Step 5:** Commit any fixes; push `main`.

## Self-review

- Spec coverage: catalog + typography (T1), consumers (T2), director (T3), medium/opaque/flatten/COGS (T4), sibling ref (T5), Mongo + list + seed (T6), video UI/action/cast check (T7), character UI (T8), seed/verify (T9). Style chip in timeline is optional in both docs.
- Types: `buildFramePrompt(..., options?: FramePromptOptions)` used consistently in T2, T5; `videoStyle` defined in T2, used in T3/T4/T5; `styleLetteringLine` spelled identically in T1 test/impl and T6 script; `PublicStyle.previewUrl?: string` in T6/T7/T8.
- Placeholders: none; T7 step 6 is explicitly optional.
