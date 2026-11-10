# Economy vs. 2K Cinema Video Generation Tier Design

Date: 2026-11-10

## 1. Intent & Why
Enable users to generate AI storyboard clips at ~75% lower credit cost (`4 credits/s` vs `15 credits/s`) by routing **Economy** clips to our self-hosted Vast.ai ComfyUI worker (`MiniMax-H3 ref2va` + `MiniMaxH3AddGuide` first/last latent keyframes), while keeping **2K Cinema** on the cloud 2K pipeline. Users must never see internal model names like `"H3"` in the UI—only **Economy** and **2K Cinema**.

## 2. Goals & Non-Goals
- **Goals**:
  1. **UI Labels**: Display only **`Economy`** (`經濟 / 平價`) and **`2K Cinema`** (`2K 影院`) — zero `"H3"` branding in user-facing UI.
  2. **Option C Placement**:
     - Selectable in the **Create Video Setup Bar** (`brief-setup-mode-bar.tsx` / `new-project-form.tsx`) and per-clip in the **Editor Clip Inspector**.
     - Persists the user's last selected tier as their default (in `localStorage` and user preferences) for future videos.
  3. **Vast.ai `ref2va` + First/Last Latent Frame Graph**:
     - `MiniMaxH3ReferenceToVideo` (`Node 30`) receives Character Blueprint & Scene Plate as `ref_images`.
     - `MiniMaxH3AddGuide` at `frame_idx: 0` encodes `startImageUrl` (`first_frame`) into the target video latent at frame `0`.
     - When `endImageUrl` (`last_frame`) is present, a second `MiniMaxH3AddGuide` at `frame_idx: -1` encodes `endImageUrl` into the target video latent at the final frame (`-1`).
  4. **Pricing**:
     - `Economy`: **`4 credits / second`**
     - `2K Cinema`: **`15 credits / second`** (realistic) / **`9 credits / second`** (non-realistic cloud)
- **Non-Goals**:
  - `talking-head-director` remains on its dedicated `4 credits/s` lip-sync pipeline (`heygen/avatar-iv`).

## 3. Approaches Considered
- **Approach A**: Project/clip picker only (no saved default).
- **Approach B**: Account settings only (hidden from creation bar).
- **Approach C (Selected)**: Project creation bar + per-clip editor inspector + auto-remembered user default.

## 4. Technical Architecture
1. **Data Model (`src/model/project.ts`)**:
   - `export const VIDEO_QUALITY_TIERS = ["economy", "2k_cinema"] as const;`
   - `export type VideoQualityTier = (typeof VIDEO_QUALITY_TIERS)[number];`
   - Add `videoQualityTier?: VideoQualityTier` to `Project`, `StoryboardRow`, and `ClipDirectorOverrides`.
2. **Billing & Credit Calculation (`src/service/credit-costs.ts`, `src/service/clip-stage.ts`, `src/service/production-plan.ts`)**:
   - `export const ECONOMY_VIDEO_CREDITS_PER_SECOND = 4;`
   - When `videoQualityTier === "economy"`, `videoCreditsPerSecond` returns `4` (with no extra voice swap surcharge).
3. **ComfyUI Graph (`src/service/comfy/submit-clip-video.ts`)**:
   - Update `shouldUseComfyForClipVideo` to return `true` when `videoQualityTier === "economy"` and `hasComfyEndpoint()` is true.
   - Chain `MiniMaxH3AddGuide` nodes (`frame_idx: 0` for `startName`, and `frame_idx: -1` for `endName` when present) between `MiniMaxH3ReferenceToVideo` (`Node 30`) and `MiniMaxH3ChainContext` (`Node 57`).
