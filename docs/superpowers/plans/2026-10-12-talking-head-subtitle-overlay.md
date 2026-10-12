# Talking-head subtitle overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On Cinematic realistic Talking-head read and Full body Talking-head read, generate the person clip with no on-screen text, then overlay a Text Style subtitle PNG.

**Architecture:** Phase A stores `subtitleOverlay`. The storyboard planner and frame prompt omit lettering. A `subtitlePlate` image job paints the spoken line on `#FF00FF` and a local key writes a transparent PNG. Browser export burns that PNG onto each clip with one shared ffmpeg filter. The studio player shows the same PNG over the provider video.

**Tech Stack:** Next.js 16, React 19, MongoDB, zod 4, Higgsfield `submitImage` (not called in tests), `sharp`, browser `@ffmpeg/ffmpeg`, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-12-talking-head-subtitle-overlay-design.md`

## Global Constraints

- Gate: `isTalkingHeadSkill(skillSlug)` and (`styleId === "realistic"` or `baseStyleId === "realistic"`). A renamed style whose name is only "Cinematic realistic" does not qualify.
- Cartoon explainer on Cinematic realistic stays on `usesSteadyStills`. It does not use this overlay.
- Spoken line stays in the motion prompt for lip-sync. `Subtitle:` / `字幕：` and subtitle fade wording do not.
- Clip splitting is unchanged.
- Videos with `subtitleOverlay` unset keep painted subtitles. No migration.
- Plate cost is `FRAME_COST` (4) per clip. Failure refunds those 4 credits. Stills and the clip video continue. Export waits until every plate is `completed`.
- Key color is `#FF00FF`. A pixel is transparent when red ≥ 215, blue ≥ 215, and green ≤ 40. Under 1% opaque pixels fails the plate with `字幕圖沒有留下可疊上的字`.
- Plate width is 78% of the frame. 9:16 vertical center is at 62% of frame height. 16:9 plate bottom is 8% of frame height above the bottom edge. Export fades opacity over the first 0.4s and the last 0.4s. The studio preview does not fade.
- Tests do not call Higgsfield.
- Do not commit unless the user asks. The commit steps below are for a later execution pass that the user has approved.

---

### Task 1: Plate gate, prompt, and key rule

**Files:**
- Create: `src/service/director/subtitle-plate.ts`
- Test: `src/service/director/subtitle-plate.test.ts`

**Interfaces:**
- Consumes: `isTalkingHeadSkill` from `src/service/director/talking-head.ts`, `subtitleLookLine` and `textStyleSampleLookLine` from `src/service/director/subtitle-look.ts`, `toWrittenChinese` from `src/service/director/written-chinese.ts`.
- Produces:
  - `usesTalkingHeadSubtitleOverlay(input: { skillSlug?: string; styleId?: string; baseStyleId?: string }): boolean`
  - `subtitlePlatePrompt(input: { line: string; language?: "en" | "yue"; lookLine?: string; sampleImageIndex?: number }): string`
  - `isMagentaKeyPixel(r: number, g: number, b: number): boolean`
  - `opaqueRatio(pixels: Array<{ r: number; g: number; b: number }>): number`
  - `PLATE_EMPTY_ERROR` = `"字幕圖沒有留下可疊上的字"`
  - `plateIsEmpty(ratio: number): boolean` true when `ratio < 0.01`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PLATE_EMPTY_ERROR,
  isMagentaKeyPixel,
  opaqueRatio,
  plateIsEmpty,
  subtitlePlatePrompt,
  usesTalkingHeadSubtitleOverlay,
} from "@/service/director/subtitle-plate";

test("overlay gate is both talking-head skills on cinematic realistic only", () => {
  assert.equal(usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "realistic" }), true);
  assert.equal(
    usesTalkingHeadSubtitleOverlay({ skillSlug: "full-body-talking-head-director", styleId: "realistic" }),
    true,
  );
  assert.equal(
    usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "abc", baseStyleId: "realistic" }),
    true,
  );
  assert.equal(usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "doodle" }), false);
  assert.equal(usesTalkingHeadSubtitleOverlay({ skillSlug: "cartoon-explainer-video-director", styleId: "realistic" }), false);
  assert.equal(
    usesTalkingHeadSubtitleOverlay({ skillSlug: "talking-head-director", styleId: "doodle", baseStyleId: "doodle" }),
    false,
  );
});

test("plate prompt spells the line on magenta and keeps the look", () => {
  const prompt = subtitlePlatePrompt({ line: "Hello there.", lookLine: "Look: thick marker." });
  assert.match(prompt, /Hello there\./);
  assert.match(prompt, /#FF00FF/);
  assert.match(prompt, /thick marker/);
  assert.match(prompt, /No person/);
  const yue = subtitlePlatePrompt({ line: "唔該晒", language: "yue", sampleImageIndex: 1 });
  assert.doesNotMatch(yue, /唔該晒/);
  assert.match(yue, /attached image 1/);
});

test("magenta key drops the backdrop and keeps dark letters", () => {
  assert.equal(isMagentaKeyPixel(255, 0, 255), true);
  assert.equal(isMagentaKeyPixel(220, 30, 230), true);
  assert.equal(isMagentaKeyPixel(10, 10, 10), false);
  assert.equal(opaqueRatio([{ r: 255, g: 0, b: 255 }, { r: 0, g: 0, b: 0 }]), 0.5);
  assert.equal(plateIsEmpty(0.009), true);
  assert.equal(plateIsEmpty(0.01), false);
  assert.equal(PLATE_EMPTY_ERROR, "字幕圖沒有留下可疊上的字");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/director/subtitle-plate.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import { subtitleLookLine, textStyleSampleLookLine } from "@/service/director/subtitle-look";
import { toWrittenChinese } from "@/service/director/written-chinese";
import type { VoLanguage } from "@/model/project";

export const PLATE_EMPTY_ERROR = "字幕圖沒有留下可疊上的字";

export function usesTalkingHeadSubtitleOverlay(input: {
  skillSlug?: string;
  styleId?: string;
  baseStyleId?: string;
}) {
  const cinematic = input.styleId === "realistic" || input.baseStyleId === "realistic";
  return isTalkingHeadSkill(input.skillSlug) && cinematic;
}

export function subtitlePlatePrompt(input: {
  line: string;
  language?: VoLanguage;
  lookLine?: string;
  sampleImageIndex?: number;
}) {
  const words = input.language === "yue" ? toWrittenChinese(input.line) : input.line.trim();
  const look = input.sampleImageIndex
    ? textStyleSampleLookLine(input.sampleImageIndex)
    : input.lookLine?.trim() || subtitleLookLine();
  return [
    "Subtitle graphic only. Large phone-readable lettering. No person, no room, no logo, no second line.",
    look,
    `The only words are: ${words}`,
    "Include any paper strip, sticker, or stroke that belongs to the Look. Do not paint that Look's full-bleed field.",
    "The area outside the graphic is flat #FF00FF. No pixel of the letters, paper, sticker, or shadow may be #FF00FF.",
  ].join("\n");
}

export function isMagentaKeyPixel(r: number, g: number, b: number) {
  return r >= 215 && b >= 215 && g <= 40;
}

export function opaqueRatio(pixels: Array<{ r: number; g: number; b: number }>) {
  if (pixels.length === 0) return 0;
  const kept = pixels.filter((pixel) => !isMagentaKeyPixel(pixel.r, pixel.g, pixel.b)).length;
  return kept / pixels.length;
}

export function plateIsEmpty(ratio: number) {
  return ratio < 0.01;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/director/subtitle-plate.test.ts`
Expected: PASS. If the Cantonese assertion fails, print `toWrittenChinese("唔該晒")` and put that exact string in the test. The spoken colloquial line must not remain as the only spelling.

- [ ] **Step 5: Commit**

```bash
git add src/service/director/subtitle-plate.ts src/service/director/subtitle-plate.test.ts
git commit -m "$(cat <<'EOF'
Add the talking-head subtitle plate gate and key rule.

EOF
)"
```

---

### Task 2: Storyboard and motion omit on-screen subtitles

**Files:**
- Modify: `src/service/director/talking-head.ts` (`planTalkingHeadClips`, `talkingHeadDirectorBlock`, `shotLine`, `withThisClipSubtitle`)
- Modify: `src/service/director/talking-performance.ts` (`talkingMotionLine`)
- Test: `src/service/director/talking-head.test.ts`
- Test: `src/service/director/talking-performance.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1. The flag is a boolean argument. Phase A (Task 7) passes `usesTalkingHeadSubtitleOverlay`.
- Produces: `planTalkingHeadClips` and `talkingHeadDirectorBlock` accept `overlay?: boolean`. `talkingMotionLine` accepts `overlay?: boolean`.

- [ ] **Step 1: Write the failing test**

Append to `src/service/director/talking-head.test.ts`:

```ts
test("overlay talking-head scenes keep the voice line and drop the subtitle", () => {
  const clips = planTalkingHeadClips({
    source: "Hello there. See you.",
    pace: "medium",
    language: "en",
    aspectRatio: "9:16",
    overlay: true,
  });
  assert.match(clips[0].motionCamera, /Hello there/);
  assert.doesNotMatch(clips[0].startScene, /Subtitle:/);
  assert.doesNotMatch(clips[0].endScene, /Subtitle:/);
  assert.doesNotMatch(clips[0].motionCamera, /fades and slides/);
  assert.doesNotMatch(clips[1].startScene, /Subtitle:/);
  const block = talkingHeadDirectorBlock("talking-head-director", "9:16", undefined, true);
  assert.match(block, /no letters/i);
  assert.doesNotMatch(block, /Write the subtitle into startScene/);
});
```

`talkingHeadDirectorBlock`'s fourth argument is `overlay`. Existing calls pass nothing and still include `Write the subtitle` via `talkingSubtitleRule`. Do not change the existing 9:16 / 16:9 subtitle test.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/director/talking-head.test.ts`
Expected: FAIL because `overlay` is ignored and `Subtitle:` is still present.

- [ ] **Step 3: Write minimal implementation**

Add `overlay?: boolean` to `planTalkingHeadClips`. Pass it into `shotLine`, `withThisClipSubtitle`, and `talkingMotionLine`.

In `shotLine`, when `scene.overlay` is true, return the pose, set, and camera only. Do not append `subtitleSentence`.

`withThisClipSubtitle` when `overlay` is true returns the previous end with the old subtitle sentence stripped and does not append a new one:

```ts
if (overlay) return previousEnd.replace(/\s*(?:Subtitle:|字幕：).*$/u, "").trim();
```

`talkingHeadDirectorBlock(skillSlug?, aspectRatio?, performance?, overlay?: boolean)`: when `overlay` is true, push this sentence instead of `talkingSubtitleRule(aspectRatio)`:

```ts
"The frame has no letters, no subtitle, no caption, no logo, and no writing. The spoken line is voice only."
```

`talkingMotionLine` gains `overlay?: boolean`. When true, build the same face, hands, and camera sentences already in the function, and skip `fadeIn`, `fadeOut`, and the `subtitle` sentence. Keep `speaks "${input.line}"` (English) and `口型跟住講「${input.line}」` (Cantonese). The Cantonese branch still speaks the colloquial `input.line`, not the written form.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/director/talking-head.test.ts src/service/director/talking-performance.test.ts`
Expected: PASS, including the existing subtitle-placement test that does not pass `overlay`.

- [ ] **Step 5: Commit**

```bash
git add src/service/director/talking-head.ts src/service/director/talking-performance.ts src/service/director/talking-head.test.ts src/service/director/talking-performance.test.ts
git commit -m "$(cat <<'EOF'
Keep cinematic talking-head stills free of painted subtitles.

EOF
)"
```

---

### Task 3: Frame prompt drops lettering when the flag is set

**Files:**
- Modify: `src/service/higgsfield/frame-prompts.ts` (`buildFramePrompt`, `frameSubmitPlan`)
- Test: `src/service/higgsfield/frame-prompts.test.ts`

**Interfaces:**
- Consumes: `project.subtitleOverlay` (typed in Task 6; until then the test object may set the field and the prompt function reads it as optional).
- Produces: overlay still prompts contain `Final check: no letters, no subtitle, no caption bar, no watermark.` and do not attach `textStyleImageUrl`.

- [ ] **Step 1: Write the failing test**

In `frame-prompts.test.ts`, follow the existing talking-head project helper. Set `skillSlug` to `talking-head-director`, `styleId` to `realistic`, `subtitleOverlay: true`, `textStyleImageUrl` to `https://blob/look.png`, and a clip `englishVo` of `Hello there.`

```ts
test("cinematic talking-head overlay stills do not paint the subtitle", () => {
  const video = project("realistic");
  video.skillSlug = "talking-head-director";
  video.subtitleOverlay = true;
  video.textStyleImageUrl = "https://blob/look.png";
  video.phaseA!.clips[0].englishVo = "Hello there.";
  video.phaseA!.clips[0].startScene = 'Person seated. Subtitle: one LARGE line, exactly "Hello there."';
  const prompt = buildFramePrompt(video, 1, "start");
  assert.match(prompt, /no letters, no subtitle, no caption bar, no watermark/);
  assert.doesNotMatch(prompt, /Look:/);
  assert.doesNotMatch(prompt, /Subtitle:/);
  const plan = frameSubmitPlan(video, 1, "start");
  assert.equal(plan.imageUrls.includes("https://blob/look.png"), false);
});
```

If `project()` has no `phaseA.clips[0]`, copy the setup from the existing test `"talking-head stills keep only the first character"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/higgsfield/frame-prompts.test.ts`
Expected: FAIL because the Look line and the text-style URL are still present.

- [ ] **Step 3: Write minimal implementation**

At the start of the lettering section in `buildFramePrompt`:

```ts
const overlay = project.subtitleOverlay === true && isTalkingHeadSkill(project.skillSlug);
```

Add optional `subtitleOverlay?: boolean` on `Project` in `src/model/project.ts` if Task 6 has not landed yet. Then, when `overlay` is true:

- Force `textStyleUrl` to `undefined` before `frameSceneReferenceUrls` counts it, so image indexes stay aligned.
- Strip a trailing subtitle sentence from the scene: `sceneDescription.replace(/\s*(?:Subtitle:|字幕：).*$/u, "").trim()`.
- Set `onCanvasTextBlock` to `[]`.
- Replace the scene-text final check with `Final check: no letters, no subtitle, no caption bar, no watermark.`

In `frameSubmitPlan`, when the same `overlay` condition is true, pass an empty text-style URL list.

A talking-head project with `subtitleOverlay` unset still attaches the Look line. Do not change that branch.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/higgsfield/frame-prompts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/higgsfield/frame-prompts.ts src/service/higgsfield/frame-prompts.test.ts
git commit -m "$(cat <<'EOF'
Stop attaching text style to cinematic talking-head stills.

EOF
)"
```

---

### Task 4: Placement and ffmpeg overlay filter

**Files:**
- Create: `src/service/video-edit/subtitle-placement.ts`
- Test: `src/service/video-edit/subtitle-placement.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `subtitlePlacement(aspect: "9:16" | "16:9" | "1:1", frameW: number, frameH: number): { x: string; y: string; w: number }`
  - `buildSubtitleOverlayFilter(input: { count: number; hasAudio: boolean; durations: number[]; aspect: "9:16" | "16:9" | "1:1"; width: number; height: number }): string`
  - Plate input index for clip `i` is `count + i` (clips first, then plates in the same order).

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSubtitleOverlayFilter, subtitlePlacement } from "@/service/video-edit/subtitle-placement";

test("9:16 plate center sits at 62 percent; 16:9 sits above the bottom", () => {
  const reel = subtitlePlacement("9:16", 1080, 1920);
  assert.equal(reel.w, 842);
  assert.equal(reel.x, "(main_w-overlay_w)/2");
  assert.equal(reel.y, "1190-(overlay_h/2)");
  const wide = subtitlePlacement("16:9", 1920, 1080);
  assert.equal(wide.w, 1498);
  assert.equal(wide.y, "main_h-overlay_h-86");
});

test("overlay filter fades each plate for 0.4s", () => {
  const filter = buildSubtitleOverlayFilter({
    count: 2,
    hasAudio: true,
    durations: [5, 6],
    aspect: "9:16",
    width: 1080,
    height: 1920,
  });
  assert.match(filter, /\[2:v\]scale=842:-1/);
  assert.match(filter, /fade=t=in:st=0:d=0\.4:alpha=1/);
  assert.match(filter, /fade=t=out:st=4\.6:d=0\.4:alpha=1/);
  assert.match(filter, /\[3:v\]scale=842:-1/);
  assert.match(filter, /overlay=/);
});
```

`842` is `Math.round(1080 * 0.78)`. `1190` is `Math.round(1920 * 0.62)`. `1498` is `Math.round(1920 * 0.78)`. `86` is `Math.round(1080 * 0.08)`. `4.6` is `5 - 0.4`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/video-edit/subtitle-placement.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
const PLATE_WIDTH = 0.78;
const VERTICAL_CENTER = 0.62;
const BOTTOM_INSET = 0.08;
const FADE_SEC = 0.4;

function num(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

export function subtitlePlacement(
  aspect: "9:16" | "16:9" | "1:1",
  frameW: number,
  frameH: number,
) {
  const w = Math.round(frameW * PLATE_WIDTH);
  const x = "(main_w-overlay_w)/2";
  if (aspect === "16:9") {
    const inset = Math.round(frameH * BOTTOM_INSET);
    return { x, y: `main_h-overlay_h-${inset}`, w };
  }
  const center = Math.round(frameH * VERTICAL_CENTER);
  return { x, y: `${center}-(overlay_h/2)`, w };
}

export function buildSubtitleOverlayFilter(input: {
  count: number;
  hasAudio: boolean;
  durations: number[];
  aspect: "9:16" | "16:9" | "1:1";
  width: number;
  height: number;
}) {
  const place = subtitlePlacement(input.aspect, input.width, input.height);
  const parts: string[] = [];
  for (let i = 0; i < input.count; i += 1) {
    const duration = input.durations[i] ?? 5;
    const fadeOut = Math.max(0, duration - FADE_SEC);
    const plate = input.count + i;
    parts.push(
      `[${plate}:v]scale=${place.w}:-1,format=rgba,fade=t=in:st=0:d=${num(FADE_SEC)}:alpha=1,fade=t=out:st=${num(fadeOut)}:d=${num(FADE_SEC)}:alpha=1[p${i}]`,
    );
    parts.push(`[${i}:v][p${i}]overlay=x=${place.x}:y=${place.y}:format=auto[b${i}]`);
  }
  return parts.join(";");
}
```

`1:1` uses the 9:16 vertical-center branch. The filter does not concat. Callers concat the `[b0]…[bN]` labeled streams. `hasAudio` is unused inside this function; audio stays on the clip inputs.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/video-edit/subtitle-placement.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/video-edit/subtitle-placement.ts src/service/video-edit/subtitle-placement.test.ts
git commit -m "$(cat <<'EOF'
Add the subtitle plate placement and ffmpeg overlay filter.

EOF
)"
```

---

### Task 5: Reel fingerprint includes plate URLs

**Files:**
- Modify: `src/service/reel/fingerprint.ts`
- Test: `src/service/reel/fingerprint.test.ts`

**Interfaces:**
- Consumes: plate `blobUrl` on the project.
- Produces: `clipReelFingerprint` appends `:plate:<last 48 of blobUrl>` per clip when `subtitleOverlay` is true. Missing plate uses `:plate:`.

- [ ] **Step 1: Write the failing test**

Extend `ReelClipSource` in the test with `subtitleOverlay` and `subtitlePlates`. Add:

```ts
test("fingerprint changes when a subtitle plate URL changes", () => {
  const base = {
    subtitleOverlay: true,
    phaseA: { clips: [{ clipNumber: 1 }] },
    clips: [{ clipNumber: 1, blobUrl: "https://blob/clip.mp4", submittedAt: "t" }],
    subtitlePlates: [{ clipNumber: 1, blobUrl: "https://blob/plate-a.png" }],
  };
  const next = {
    ...base,
    subtitlePlates: [{ clipNumber: 1, blobUrl: "https://blob/plate-b.png" }],
  };
  assert.notEqual(clipReelFingerprint(base), clipReelFingerprint(next));
  const painted = { phaseA: base.phaseA, clips: base.clips };
  assert.equal(clipReelFingerprint(painted).includes("plate"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/reel/fingerprint.test.ts`
Expected: FAIL because both fingerprints match.

- [ ] **Step 3: Write minimal implementation**

Add optional `subtitleOverlay?: boolean` and `subtitlePlates?: Array<{ clipNumber: number; blobUrl?: string }>` to `ReelClipSource`. Inside the `.map`, when `project.subtitleOverlay` is true, append `:plate:${(plate?.blobUrl || "").slice(-48)}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/reel/fingerprint.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/reel/fingerprint.ts src/service/reel/fingerprint.test.ts
git commit -m "$(cat <<'EOF'
Invalidate the reel when a subtitle plate changes.

EOF
)"
```

---

### Task 6: Persist the flag and the plate rows

**Files:**
- Modify: `src/model/generation-job.ts` (add `"subtitlePlate"` to `GenerationKind` and the zod enum)
- Modify: `src/model/project.ts` (`subtitleOverlay`, `subtitlePlates`, zod)
- Modify: `src/presentation/serialize.ts` (copy both fields onto the public video)

**Interfaces:**
- Consumes: Task 1 error string is not stored here.
- Produces:

```ts
export type SubtitlePlate = {
  clipNumber: number;
  status: "queued" | "in_progress" | "completed" | "failed";
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  submittedAt?: string;
  creditsCharged?: number;
};
```

`Project.subtitleOverlay?: boolean` and `Project.subtitlePlates?: SubtitlePlate[]`. Public video includes the same two fields. `GenerationKind` includes `"subtitlePlate"`.

- [ ] **Step 1: Add the types and zod**

Match the existing `frames` array style in `project.ts`. Plate status uses the same four strings as `ProjectClip.status`. Do not add `framePosition` for this kind.

In `toPublicVideo`, set:

```ts
subtitleOverlay: video.subtitleOverlay === true,
subtitlePlates: video.subtitlePlates,
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. Fix any object literal that builds a `Project` or `GenerationJob` and now rejects the new union member. Adding a union member should not break existing kinds.

- [ ] **Step 3: Commit**

```bash
git add src/model/generation-job.ts src/model/project.ts src/presentation/serialize.ts
git commit -m "$(cat <<'EOF'
Store the talking-head subtitle overlay flag and plate rows.

EOF
)"
```

---

### Task 7: Phase A writes the flag into the storyboard

**Files:**
- Modify: `src/service/director/run-phase-a.ts` (pass `overlay` into `talkingHeadDirectorBlock` and `planTalkingHeadClips`)
- Modify: `src/service/director/jobs.ts` (`runPhaseAJob` sets `subtitleOverlay` on the video write)
- Modify: `src/service/director/append-clip.ts` (pass `project.subtitleOverlay` into `planTalkingHeadClips`)
- Modify: `src/service/style/renderable-style.ts` (`RenderableStyle` gains optional `baseStyleId?: StyleId`)

**Interfaces:**
- Consumes: `usesTalkingHeadSubtitleOverlay` from Task 1. `renderableFromUserStyle` sets `baseStyleId: doc.baseStyleId`. `renderableFromSystem` leaves it unset.
- Produces: a new or regenerated storyboard stores `subtitleOverlay` true or false. Overlay storyboard rows come from `planTalkingHeadClips({ overlay: true })`.

- [ ] **Step 1: Write the failing test**

Add to `src/service/style/renderable-style.test.ts` if that file exists; otherwise create it with the existing test import style:

```ts
test("user renderable style keeps baseStyleId", () => {
  const style = renderableFromUserStyle({
    _id: new ObjectId(),
    baseStyleId: "realistic",
    name: "My look",
  } as UserStyleDoc);
  assert.equal(style.baseStyleId, "realistic");
});
```

Fill the rest of the doc with the fields `renderableFromUserStyle` already reads (`name`, `description`, `canvas`, `canvasColor`, `look`, `palette`, `typography`, `motion`, `negatives`, lettering keys). Copy a fixture from `user-style-actions.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/style/renderable-style.test.ts`
Expected: FAIL because `baseStyleId` is undefined.

- [ ] **Step 3: Write minimal implementation**

`renderableFromUserStyle` returns `baseStyleId: doc.baseStyleId`.

`run-phase-a.ts` already has `talkingHead` and `input.style`. Compute:

```ts
const subtitleOverlay = usesTalkingHeadSubtitleOverlay({
  skillSlug: input.skill.slug,
  styleId: input.style.id,
  baseStyleId: "baseStyleId" in input.style ? input.style.baseStyleId : undefined,
});
```

Pass `subtitleOverlay` as the fourth argument to `talkingHeadDirectorBlock` and as `overlay` to `planTalkingHeadClips`. Return it on the phase A result object the job already persists, or have `runPhaseAJob` compute the same boolean from the loaded style and `$set: { subtitleOverlay }` in the storyboard write. One write, next to the phase A document. A later Phase A replaces the flag.

`append-clip.ts` passes `overlay: project.subtitleOverlay === true` into `planTalkingHeadClips`. It does not recompute the gate.

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/service/style/renderable-style.test.ts src/service/director/talking-head.test.ts src/service/director/run-phase-a.test.ts`
Expected: PASS. Skip a missing `run-phase-a.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/service/style/renderable-style.ts src/service/style/renderable-style.test.ts src/service/director/run-phase-a.ts src/service/director/jobs.ts src/service/director/append-clip.ts
git commit -m "$(cat <<'EOF'
Mark cinematic talking-head storyboards for subtitle overlay.

EOF
)"
```

---

### Task 8: Charge one plate per clip

**Files:**
- Modify: `src/service/production-plan.ts`
- Test: `src/service/production-plan.test.ts`

**Interfaces:**
- Consumes: `FRAME_COST`, `project.subtitleOverlay`, `project.phaseA.clips.length`.
- Produces: `subtitlePlateCost(project): number` returns `FRAME_COST * clipCount` when `subtitleOverlay` is true, otherwise 0. `planGenerateAllScenes` adds that number to `cost`.

- [ ] **Step 1: Write the failing test**

```ts
test("cinematic talking-head scene plan adds one plate per clip", () => {
  const video = project();
  video.subtitleOverlay = true;
  video.phaseA = { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] } as Project["phaseA"];
  assert.equal(subtitlePlateCost(video), FRAME_COST * 2);
  const plan = planGenerateAllScenes(video);
  assert.equal(plan.cost, sceneImageCost(video, [1, 2]) + FRAME_COST * 2);
  video.subtitleOverlay = false;
  assert.equal(subtitlePlateCost(video), 0);
});
```

Use the existing `project()` helper in that test file. If `planGenerateAllScenes` only prices clips that still need frames, set those two clips to need frames the same way the current tests do.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/production-plan.test.ts`
Expected: FAIL because `subtitlePlateCost` is not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
export function subtitlePlateCost(project: { subtitleOverlay?: boolean; phaseA?: { clips: unknown[] } }) {
  if (project.subtitleOverlay !== true) return 0;
  return FRAME_COST * (project.phaseA?.clips.length ?? 0);
}
```

Add `subtitlePlateCost(project)` inside `planGenerateAllScenes`'s returned `cost`. Do not add it to `planRemaining` or `planSelected` video costs. A plate retry charges `FRAME_COST` at the retry call site in Task 9, not here.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/production-plan.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/production-plan.ts src/service/production-plan.test.ts
git commit -m "$(cat <<'EOF'
Bill one subtitle plate for each cinematic talking-head clip.

EOF
)"
```

---

### Task 9: Enqueue, key, and finish plate jobs

**Files:**
- Create: `src/service/higgsfield/subtitle-plate-job.ts`
- Modify: `src/service/clip/enqueue-scene-images.ts` (enqueue plates in the same credit spend as frames)
- Modify: `src/service/higgsfield/pipeline.ts` (on job sync, call `syncSubtitlePlateJob` before the video-project path and return)
- Test: `src/service/higgsfield/subtitle-plate-key.test.ts`

**Interfaces:**
- Consumes: `subtitlePlatePrompt`, `isMagentaKeyPixel`, `opaqueRatio`, `plateIsEmpty`, `PLATE_EMPTY_ERROR` from Task 1. `submitImage` from `src/service/higgsfield/generate.ts`. `imageRouteForSceneText` from `src/service/generation/image-backend.ts`. `persistBuffer` from `src/service/higgsfield/persist.ts`.
- Produces:
  - `enqueueSubtitlePlateJobs(project: Project): Promise<void>`
  - `syncSubtitlePlateJob(job: GenerationJob, status: GenerationStatus, outputUrl?: string): Promise<void>`
  - `keyMagentaPng(png: Buffer): Promise<{ png: Buffer; ratio: number }>`

- [ ] **Step 1: Write the failing key test**

```ts
import assert from "node:assert/strict";
import sharp from "sharp";
import { test } from "node:test";
import { keyMagentaPng } from "@/service/higgsfield/subtitle-plate-job";

test("keyMagentaPng clears magenta and keeps a black pixel", async () => {
  const png = await sharp({
    create: { width: 2, height: 1, channels: 3, background: { r: 255, g: 0, b: 255 } },
  })
    .composite([{ input: await sharp({ create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toBuffer(), left: 0, top: 0 }])
    .png()
    .toBuffer();
  const keyed = await keyMagentaPng(png);
  assert.ok(keyed.ratio >= 0.01);
  const { data } = await sharp(keyed.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 255);
  assert.equal(data[7], 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/higgsfield/subtitle-plate-key.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

`keyMagentaPng` reads raw RGB with `sharp`, builds an RGBA buffer, sets alpha to 0 where `isMagentaKeyPixel` is true, and returns `sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer()` plus `opaqueRatio`.

`enqueueSubtitlePlateJobs` no-ops when `project.subtitleOverlay !== true`. For each `phaseA` clip it inserts a `generationJobs` row `{ kind: "subtitlePlate", clipIndex: clipNumber - 1, status: "pending", model: imageRouteForSceneText(resolveSceneText(project).language).model }` and a `subtitlePlates` row `{ clipNumber, status: "queued", submittedAt, creditsCharged: FRAME_COST }`. Prompt is `subtitlePlatePrompt` with the clip `englishVo`, project language, `subtitleLookLine(project.subtitleLook)` or the custom look line already stored for frames, and `sampleImageIndex: 1` when `textStyleImageUrl` is set. That sample URL is the only reference image on the submit.

`syncSubtitlePlateJob` loads the output, runs `keyMagentaPng`, and when `plateIsEmpty(ratio)` sets the plate `failed` with `PLATE_EMPTY_ERROR` and refunds `creditsCharged` via `refundCredits`. On success, `persistBuffer` the keyed PNG and set `blobUrl` and `status: "completed"`. On provider failure, set `failed`, store `error`, refund `FRAME_COST`. Do not change frames or clip video status.

Call `enqueueSubtitlePlateJobs` from `enqueueSceneImagesForNewVideo` after `enqueueClipFrameJobs` succeeds, inside the same try. If it throws, the existing refund of `plan.cost` already covers the plate credits because Task 8 added them to that cost.

In `pipeline.ts` job sync, handle `job.kind === "subtitlePlate"` the same way as `textStylePreview`: call `syncSubtitlePlateJob`, update the job row, return. Do not fall through to frame handling.

Submit of `pending` subtitle plates uses the existing pending-job runner that calls `submitImage`. Find the `kind === "frame"` submit branch and add `subtitlePlate` next to it with the plate prompt and optional text-style sample URL. Do not submit a plate to the video model.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/higgsfield/subtitle-plate-key.test.ts src/service/director/subtitle-plate.test.ts`
Expected: PASS. This test does not call Higgsfield.

- [ ] **Step 5: Commit**

```bash
git add src/service/higgsfield/subtitle-plate-job.ts src/service/higgsfield/subtitle-plate-key.test.ts src/service/clip/enqueue-scene-images.ts src/service/higgsfield/pipeline.ts
git commit -m "$(cat <<'EOF'
Generate a keyed subtitle plate for each cinematic talking-head clip.

EOF
)"
```

---

### Task 10: Burn plates on export

**Files:**
- Modify: `src/presentation/components/app/projects/new/browser-video-export.ts`
- Modify: `src/presentation/components/app/projects/new/video-edit-desk.tsx`
- Modify: `src/service/director/jobs.ts` (`runReelJob`)
- Test: `src/service/video-edit/subtitle-placement.test.ts` (filter already covered in Task 4)

**Interfaces:**
- Consumes: `buildSubtitleOverlayFilter`, `subtitlePlacement`.
- Produces: `renderVideoInBrowser` accepts `plates?: Array<{ clipNumber: number; url: string }>` . When that array is non-empty, every clip is overlaid before concat, including a one-clip export. Cache key includes the plate URLs.

- [ ] **Step 1: Write the failing guard test**

Add `src/service/video-edit/subtitle-export.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { subtitleExportBlocked } from "@/service/video-edit/subtitle-export";

test("export waits until every overlay plate is completed", () => {
  assert.equal(
    subtitleExportBlocked({
      subtitleOverlay: true,
      phaseA: { clips: [{ clipNumber: 1 }, { clipNumber: 2 }] },
      subtitlePlates: [
        { clipNumber: 1, status: "completed", blobUrl: "https://blob/a.png" },
        { clipNumber: 2, status: "failed" },
      ],
    }),
    true,
  );
  assert.equal(
    subtitleExportBlocked({
      subtitleOverlay: true,
      phaseA: { clips: [{ clipNumber: 1 }] },
      subtitlePlates: [{ clipNumber: 1, status: "completed", blobUrl: "https://blob/a.png" }],
    }),
    false,
  );
  assert.equal(subtitleExportBlocked({ phaseA: { clips: [{ clipNumber: 1 }] } }), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/video-edit/subtitle-export.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
export function subtitleExportBlocked(project: {
  subtitleOverlay?: boolean;
  phaseA?: { clips: Array<{ clipNumber: number }> };
  subtitlePlates?: Array<{ clipNumber: number; status?: string; blobUrl?: string }>;
}) {
  if (project.subtitleOverlay !== true) return false;
  return (project.phaseA?.clips || []).some((clip) => {
    const plate = project.subtitlePlates?.find((item) => item.clipNumber === clip.clipNumber);
    return plate?.status !== "completed" || !plate.blobUrl;
  });
}
```

`video-edit-desk.tsx` calls `subtitleExportBlocked(project)` before `renderVideoInBrowser`. When it returns true, set the export message to `字幕圖尚未完成` and return. When `project.subtitleOverlay` is true, ignore `existingUrl` / `project.reelUrl` and pass plates:

```ts
plates: (project.subtitlePlates || [])
  .filter((plate) => plate.status === "completed" && plate.blobUrl)
  .map((plate) => ({ clipNumber: plate.clipNumber, url: plate.blobUrl! })),
```

In `renderVideoInBrowser`, add the plate URLs to `key`. Download them beside the clip files. Build `buildSubtitleOverlayFilter` for the clip count, then feed `[b0]…` into the existing concat filter instead of `[v0]…`. A single clip with a plate still runs ffmpeg; do not use the raw download shortcut in `exportNeedsRender` when plates exist. Pass `hasAudio` from the same detection `assembleClips` already uses.

In `runReelJob`, when `project.subtitleOverlay === true`, download each clip and its plate, run ffmpeg with `buildSubtitleOverlayFilter`, then concat the burned files with the existing `concatMp4Urls` path. A one-clip overlay reel burns the plate and does not return the provider URL unchanged. When the flag is unset, leave `runReelJob` as it is.

Frame size for the filter: 9:16 uses `1080×1920`, 16:9 uses `1920×1080`, 1:1 uses `1080×1080`. Read `project.aspectRatio`.

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/service/video-edit/subtitle-export.test.ts src/service/video-edit/subtitle-placement.test.ts src/service/reel/fingerprint.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/service/video-edit/subtitle-export.ts src/service/video-edit/subtitle-export.test.ts src/presentation/components/app/projects/new/browser-video-export.ts src/presentation/components/app/projects/new/video-edit-desk.tsx src/service/director/jobs.ts
git commit -m "$(cat <<'EOF'
Burn keyed subtitle plates onto cinematic talking-head exports.

EOF
)"
```

---

### Task 11: Studio preview overlay

**Files:**
- Create: `src/presentation/components/project/clip-subtitle-overlay.tsx`
- Modify: `src/presentation/components/project/clip-video-panel.tsx`
- Modify: `src/presentation/components/project/clip-preview-stage.tsx`

**Interfaces:**
- Consumes: `subtitlePlacement` from Task 4. Public `subtitleOverlay` and `subtitlePlates` from Task 6.
- Produces: `ClipSubtitleOverlay` renders a PNG over the video when the plate for this clip is `completed`.

- [ ] **Step 1: Add the component**

`clip-subtitle-overlay.tsx` starts with `"use client"`. Props: `src: string`, `aspectRatio: AspectRatio`. It renders an `img` with `alt=""` and `pointer-events-none`. Style uses the same ratios as `subtitlePlacement`: width `78%`, `left: 50%`, `transform: translateX(-50%)`. For `16:9`, `bottom: 8%`. For `9:16` and `1:1`, `top: 62%` and `transform: translate(-50%, -50%)`. No fade.

- [ ] **Step 2: Mount it on the player**

`ClipVideoPanel` gains optional `subtitleSrc?: string`. When `showVideo` and `subtitleSrc` are set, render `ClipSubtitleOverlay` inside the same relative box as `ClipVideoPlayer`, after the player.

`clip-preview-stage.tsx` passes `subtitleSrc` when `project.subtitleOverlay` is true and the plate for `state.clipNumber` is `completed` with a `blobUrl`. Thread `project.subtitleOverlay` and `project.subtitlePlates` through the existing props of `ClipPreviewStage`. Do not overlay a plate on the start or end still tiles.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/presentation/components/project/clip-subtitle-overlay.tsx src/presentation/components/project/clip-video-panel.tsx src/presentation/components/project/clip-preview-stage.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/project/clip-subtitle-overlay.tsx src/presentation/components/project/clip-video-panel.tsx src/presentation/components/project/clip-preview-stage.tsx
git commit -m "$(cat <<'EOF'
Show the subtitle plate over the talking-head clip preview.

EOF
)"
```

---

## Self-review

Spec coverage:

- Gate, both skills, catalog id and `baseStyleId`: Task 1 and Task 7.
- Prompt removal from scenes, motion, and frames: Tasks 2 and 3.
- Spoken line kept for lip-sync: Task 2.
- Plate prompt, magenta key, 1% empty failure, 4-credit refund: Tasks 1 and 9.
- Flag stored at Phase A, later jobs read it: Task 7.
- Fingerprint includes plate URL: Task 5.
- Browser export is the live burn; `runReelJob` shares the filter; one-clip export burns: Task 10.
- Preview has no fade; export fades 0.4s: Tasks 4 and 11.
- Old videos stay on painted subtitles: flag unset skips every new branch.
- No Higgsfield calls in tests: key test uses `sharp` locally.

Not in this plan: migrating finished clips, changing brand layers, changing clip splitting, cartoon explainer steady stills.
