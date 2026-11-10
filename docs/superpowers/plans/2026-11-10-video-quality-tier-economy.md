# Economy vs. 2K Cinema Video Generation Tier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Economy` (`4 credits/s`, Vast.ai `ref2va` with first/last latent keyframes via `MiniMaxH3AddGuide`) vs. `2K Cinema` (`15 credits/s`, cloud 2K) video quality tier selector to the creation dock and clip inspector, remembering the user's last choice as their default without ever showing `"H3"` in the UI.

**Architecture:** `VideoQualityTier` (`"economy" | "2k_cinema"`) is stored on `Project` and optionally overridden per `StoryboardRow`. When `videoQualityTier === "economy"` and ComfyUI is configured, `submitClipVideo` routes non-talking-head clips to `submitComfyStoryboardClipVideo`, which passes character/scene references into `MiniMaxH3ReferenceToVideo` and chains `MiniMaxH3AddGuide` nodes at `frame_idx: 0` (start frame) and `frame_idx: -1` (end frame when present) to encode keyframes into the target latent.

**Tech Stack:** Next.js 16 App Router, TypeScript, MongoDB, ComfyUI (`MiniMaxH3ReferenceToVideo` + `MiniMaxH3AddGuide`), Node test runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-11-10-video-quality-tier-economy-design.md`

## Global Constraints

- Never display the string `"H3"` in any user-facing UI label; use only `Economy` (`經濟 / 平價`) and `2K Cinema` (`2K 影院`).
- `Economy` bills `4 credits / second` (`ECONOMY_VIDEO_CREDITS_PER_SECOND = 4`) with no extra voice-swap surcharge.
- `talking-head-director` remains on its dedicated `4 credits/s` lip-sync pipeline (`heygen/avatar-iv`).
- Persist the user's selected tier in `localStorage` (`scro:default-video-quality-tier`) so future projects default to their last choice (Option C).

## Review Focus

- Unknown or missing `videoQualityTier` on existing MongoDB projects must safely default to `"2k_cinema"` (preserving existing cloud behavior and credit tests).
- Single-frame (`start-only`) clips in `Economy` mode must attach only `MiniMaxH3AddGuide (frame_idx = 0)` and omit the `frame_idx = -1` end-frame guide node so ComfyUI never receives an empty `LoadImage` node.
- Dual-frame clips (`start` + `end`) in `Economy` mode must chain `MiniMaxH3AddGuide (frame_idx = 0)` -> `MiniMaxH3AddGuide (frame_idx = -1)` -> `MiniMaxH3ChainContext (Node 57)`.
- Per-clip `videoQualityTier` override on a `StoryboardRow` must override the project-level `videoQualityTier` in `resolveClipProject`, `clipStateFor` credit calculation, and `sendClipVideo`.
- `talking-head-director` must ignore `videoQualityTier === "economy"` for ComfyUI routing and stay on `heygen/avatar-iv`.

---

### Task 1: Model, Context Propagation & Credit Pricing for `VideoQualityTier`

**Files:**
- Modify: `src/model/project.ts`
- Modify: `src/service/clip/clip-context.ts`
- Modify: `src/service/credit-costs.ts`
- Modify: `src/service/production-plan.ts`
- Modify: `src/service/clip-stage.ts`
- Test: `src/service/billing/credit-pricing.test.ts`

**Interfaces:**
- Produces:
  - `VIDEO_QUALITY_TIERS = ["economy", "2k_cinema"] as const`
  - `type VideoQualityTier = (typeof VIDEO_QUALITY_TIERS)[number]`
  - `isVideoQualityTier(value: unknown): value is VideoQualityTier`
  - `ECONOMY_VIDEO_CREDITS_PER_SECOND = 4`
  - `videoCreditsPerSecond(styleId?: string, videoQualityTier?: VideoQualityTier): number`
  - `videoCost(seconds: number, styleId?: string, voiceSwap?: boolean, maxSeconds?: number, videoQualityTier?: VideoQualityTier): number`

- [ ] **Step 1: Write the failing test in `src/service/billing/credit-pricing.test.ts`**

```ts
test("economy videoQualityTier bills 4 credits per second with no voice surcharge while 2k_cinema keeps 15 credits/s", () => {
  assert.equal(videoCost(6, "realistic", true, 15, "economy"), 24);
  assert.equal(videoCost(6, "doodle", true, 15, "economy"), 24);
  assert.equal(videoCost(6, "realistic", false, 15, "2k_cinema"), 90);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/billing/credit-pricing.test.ts`
Expected: FAIL (`24 !== 96`)

- [ ] **Step 3: Implement `VideoQualityTier` in `src/model/project.ts`, `src/service/clip/clip-context.ts`, `src/service/credit-costs.ts`, `src/service/production-plan.ts`, and `src/service/clip-stage.ts`**

Add `VIDEO_QUALITY_TIERS`, `VideoQualityTier`, and `isVideoQualityTier` to `src/model/project.ts` (and `videoQualityTier?: VideoQualityTier` on `Project`, `StoryboardRow`, and `ClipDirectorOverrides`). Propagate `videoQualityTier` in `src/service/clip/clip-context.ts` (`attachClipOverrides` & `resolveClipProject`). Update `videoCreditsPerSecond`, `videoCost`, `clipVideoCost`, and `clipStateFor` to charge `ECONOMY_VIDEO_CREDITS_PER_SECOND` (`4`) when `videoQualityTier === "economy"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/billing/credit-pricing.test.ts src/service/clip-stage.test.ts src/service/production-plan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/model/project.ts src/service/clip/clip-context.ts src/service/credit-costs.ts src/service/production-plan.ts src/service/clip-stage.ts src/service/billing/credit-pricing.test.ts
git commit -m "feat(billing): add economy (4 credits/s) vs 2k_cinema videoQualityTier pricing"
```

---

### Task 2: Vast.ai ComfyUI `ref2va` + `MiniMaxH3AddGuide` First/Last Latent Keyframe Graph

**Files:**
- Modify: `src/service/comfy/submit-clip-video.ts`
- Modify: `src/service/higgsfield/generate.ts`
- Modify: `src/service/higgsfield/pipeline.ts`
- Test: `src/service/comfy/openjutsu-graph.test.ts`

**Interfaces:**
- Consumes: `VideoQualityTier` from `src/model/project.ts`
- Produces:
  - `shouldUseComfyForClipVideo(input: { model: string; audioUrl?: string; skillSlug?: string; durationSeconds?: number; videoQualityTier?: VideoQualityTier }): boolean`
  - `buildComfyRef2VaLatentGuideGraph(input: { runId: string; aspectRatio: AspectRatio; durationSeconds: number; prompt: string; startName: string; endName?: string | null; charName?: string | null; sceneName?: string | null; skillSlug?: string }): ApiGraph`

- [ ] **Step 1: Write the failing test in `src/service/comfy/openjutsu-graph.test.ts`**

```ts
test("shouldUseComfyForClipVideo enables ComfyUI when videoQualityTier is economy, and buildComfyRef2VaLatentGuideGraph chains MiniMaxH3AddGuide at frame_idx 0 and -1", () => {
  process.env.COMFY_BASE_URL = "http://127.0.0.1:8189";
  process.env.COMFY_API_KEY = "test_key";
  delete process.env.COMFY_CLIP_VIDEO_ENABLED;

  assert.equal(
    shouldUseComfyForClipVideo({
      model: "minimax/hailuo-3",
      skillSlug: "story-short-director",
      videoQualityTier: "economy",
    }),
    true,
  );
  assert.equal(
    shouldUseComfyForClipVideo({
      model: "heygen/avatar-iv",
      skillSlug: "talking-head-director",
      videoQualityTier: "economy",
    }),
    false,
  );

  const startOnlyGraph = buildComfyRef2VaLatentGuideGraph({
    runId: "r1",
    aspectRatio: "16:9",
    durationSeconds: 6,
    prompt: "Walk forward",
    startName: "start.jpg",
    charName: "char.jpg",
    sceneName: "scene.jpg",
  });
  assert.equal(startOnlyGraph["72"]?.class_type, "MiniMaxH3AddGuide");
  assert.equal(startOnlyGraph["72"]?.inputs.frame_idx, 0);
  assert.equal(startOnlyGraph["73"], undefined);
  assert.deepEqual(startOnlyGraph["57"]?.inputs.conditioning, ["72", 0]);

  const dualFrameGraph = buildComfyRef2VaLatentGuideGraph({
    runId: "r2",
    aspectRatio: "16:9",
    durationSeconds: 6,
    prompt: "Walk forward",
    startName: "start.jpg",
    endName: "end.jpg",
    charName: "char.jpg",
  });
  assert.equal(dualFrameGraph["72"]?.class_type, "MiniMaxH3AddGuide");
  assert.equal(dualFrameGraph["72"]?.inputs.frame_idx, 0);
  assert.equal(dualFrameGraph["73"]?.class_type, "MiniMaxH3AddGuide");
  assert.equal(dualFrameGraph["73"]?.inputs.frame_idx, -1);
  assert.deepEqual(dualFrameGraph["57"]?.inputs.conditioning, ["73", 0]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/service/comfy/openjutsu-graph.test.ts`
Expected: FAIL (`buildComfyRef2VaLatentGuideGraph is not a function`)

- [ ] **Step 3: Implement `buildComfyRef2VaLatentGuideGraph` and `videoQualityTier` routing in `src/service/comfy/submit-clip-video.ts`, `src/service/higgsfield/generate.ts`, and `src/service/higgsfield/pipeline.ts`**

In `src/service/comfy/submit-clip-video.ts`:
- Return `true` in `shouldUseComfyForClipVideo` when `input.videoQualityTier === "economy"` (for non-HeyGen, non-`talking-head-director` clips).
- Extract `buildComfyRef2VaLatentGuideGraph`:
  - Wire `charName` and `sceneName` into `Node 30` (`MiniMaxH3ReferenceToVideo`) `ref_images.ref_image_0..1` (falling back to `startName` on `ref_image_0` if neither `charName` nor `sceneName` is provided).
  - Add `Node 72` (`MiniMaxH3AddGuide`, `frame_idx: 0`, `positive: ["30", 0]`, `latent: ["30", 1]`, `vae: ["20", 0]`, `image: ["2", 0]`) for `startName`.
  - When `endName` is present, add `Node 73` (`MiniMaxH3AddGuide`, `frame_idx: -1`, `positive: ["72", 0]`, `latent: ["30", 1]`, `vae: ["20", 0]`, `image: ["3", 0]`) and wire `Node 57.inputs.conditioning = ["73", 0]`; otherwise wire `Node 57.inputs.conditioning = ["72", 0]`.
- Pass `videoQualityTier: project.videoQualityTier` from `sendClipVideo` (`src/service/higgsfield/pipeline.ts`) into `submitClipVideo` (`src/service/higgsfield/generate.ts`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/service/comfy/openjutsu-graph.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/service/comfy/submit-clip-video.ts src/service/higgsfield/generate.ts src/service/higgsfield/pipeline.ts src/service/comfy/openjutsu-graph.test.ts
git commit -m "feat(comfy): route economy tier to Vast ref2va with MiniMaxH3AddGuide first/last latent frames"
```

---

### Task 3: Project Actions, Creation Dock Picker & Clip Inspector Toggle (`Economy` vs `2K Cinema`)

**Files:**
- Modify: `src/presentation/serialize.ts`
- Modify: `src/service/project/actions.ts`
- Modify: `src/presentation/actions/project.ts`
- Modify: `src/presentation/components/app/projects/new/director-dock-brief.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx`
- Modify: `src/presentation/components/app/projects/new/video-edit-properties.tsx`
- Modify: `pipeline-models.md`
- Test: `src/presentation/components/app/projects/new/brief-defaults.test.ts`

**Interfaces:**
- Consumes: `VideoQualityTier`, `isVideoQualityTier` from `src/model/project.ts`
- Produces:
  - `DEFAULT_VIDEO_QUALITY_TIER_STORAGE_KEY = "scro:default-video-quality-tier"`
  - `resolveDefaultVideoQualityTier(stored?: string | null): VideoQualityTier`
  - `setClipVideoQualityTierAction(videoId: string, clipNumber: number, tier: VideoQualityTier)`

- [ ] **Step 1: Write the failing test in `src/presentation/components/app/projects/new/brief-defaults.test.ts`**

```ts
test("resolveDefaultVideoQualityTier reads economy or 2k_cinema and defaults to 2k_cinema", () => {
  assert.equal(resolveDefaultVideoQualityTier("economy"), "economy");
  assert.equal(resolveDefaultVideoQualityTier("2k_cinema"), "2k_cinema");
  assert.equal(resolveDefaultVideoQualityTier(null), "2k_cinema");
  assert.equal(resolveDefaultVideoQualityTier("invalid"), "2k_cinema");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/presentation/components/app/projects/new/brief-defaults.test.ts`
Expected: FAIL (`resolveDefaultVideoQualityTier is not a function`)

- [ ] **Step 3: Implement UI picker (`Economy` vs `2K Cinema`, zero `"H3"` text), localStorage persistence, and server actions**

- Add `resolveDefaultVideoQualityTier` and `DEFAULT_VIDEO_QUALITY_TIER_STORAGE_KEY` to `src/presentation/components/app/projects/new/brief-defaults.ts`.
- Wire `videoQualityTier` through `NewProjectForm` and `DirectorDockBrief` as a pill button in the creation dock (cycling between `Economy · 4 cr/s` and `2K Cinema · 15 cr/s` for non-talking-head skills, saving to `localStorage` on change).
- Add per-clip `Economy` / `2K Cinema` toggle in `video-edit-properties.tsx` (`setClipVideoQualityTierAction`) and serialize `videoQualityTier` on `PublicVideo` and `PublicStoryboardRow` in `src/presentation/serialize.ts`.
- Update `pipeline-models.md` to document the `Economy` (`4 credits/s`, Vast.ai `ref2va` + `MiniMaxH3AddGuide` latent frames) vs. `2K Cinema` (`15 credits/s`) tiers.

- [ ] **Step 4: Run tests & typecheck to verify everything passes**

Run: `npx tsc --noEmit && npx tsx --test src/presentation/components/app/projects/new/brief-defaults.test.ts src/service/comfy/openjutsu-graph.test.ts src/service/billing/credit-pricing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/presentation/serialize.ts src/service/project/actions.ts src/presentation/actions/project.ts src/presentation/components/app/projects/new/brief-defaults.ts src/presentation/components/app/projects/new/brief-defaults.test.ts src/presentation/components/app/projects/new/director-dock-brief.tsx src/presentation/components/app/projects/new/new-project-form.tsx src/presentation/components/app/projects/new/video-edit-properties.tsx pipeline-models.md
git commit -m "feat(ui): add Economy vs 2K Cinema selector in creation dock and clip inspector"
```
