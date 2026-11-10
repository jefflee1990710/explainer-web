# OpenCut H3 Masked Latent On-Screen Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade OpenCut's AI On-Screen Text (`src/service/opencut/on-screen-text.ts`) to detect a centered, face-safe, corner-avoiding redraw zone via SAM 3 + local variance and render the artistic text seamlessly into the video via Seedream 5.0 Pro + Vast.ai ComfyUI `MiniMax-H3` Masked Latent Inpainting.

**Architecture:** Add `src/service/opencut/safe-text-zone.ts` for SAM 3 face-avoiding, body-tolerant, horizontally centered, corner-avoiding bounding box & feathered mask generation. Add `buildComfyMaskedTextInpaintGraph` in `src/service/comfy/submit-clip-video.ts` (using `MiniMaxH3FantasticVideoEditLatent` + `MiniMaxH3ContexMaskedTarget` + `MiniMaxH3AddGuide` at `frame_idx: 0`) and wire `src/service/opencut/on-screen-text.ts` + `src/opencut/embed/scro-onscreen-text.ts` to position and render the text seamlessly.

**Tech Stack:** Next.js 16, TypeScript, `sharp`, `fal-ai/sam-3/image-rle`, `bytedance-seed/seedream-5-0-pro`, Vast.ai ComfyUI (`MiniMax-H3`).

**Spec:** `docs/superpowers/specs/2026-11-10-opencut-h3-masked-latent-onscreen-text-design.md`

## Global Constraints
- Never occlude detected `face` masks (`facePenalty = 600` per 16x16 cell); overlapping `person` body/torso is allowed.
- Keep horizontal center near `cx = 0.50`, vertical center near `0.64`, `0.50`, or `0.32`, and penalize the 4 corners.
- Never make live paid API calls in unit tests.

## Review Focus
- Empty or zero-face frames must still pick a horizontally centered, non-corner low-variance box.
- Frames where the face is dead-center (`cy ≈ 0.38`) must shift the box to `cy ≈ 0.68` (center-slightly-down across the torso/chest).

---

### Task 1: SAM 3 Centered Face-Safe Text Zone Detector (`src/service/opencut/safe-text-zone.ts`)

**Files:**
- Create: `src/service/opencut/safe-text-zone.ts`
- Test: `src/service/opencut/safe-text-zone.test.ts`

**Interfaces:**
- Produces:
  - `computeCenteredFaceSafeBox(input: { rgba: Buffer; width: number; height: number; faceMask: Uint8Array; stdThreshold?: number }): { bestBox: { x: number; y: number; w: number; h: number }; normalizedOffset: { offsetX: number; offsetY: number }; maskPngBuffer: Promise<Buffer> }`
  - `detectCenteredFaceSafeTextZone(imageBuffer: Buffer): Promise<{ width: number; height: number; bestBox: { x: number; y: number; w: number; h: number }; normalizedOffset: { offsetX: number; offsetY: number }; maskPng: Buffer }>`

- [ ] **Step 1: Write unit tests in `src/service/opencut/safe-text-zone.test.ts`**
- [ ] **Step 2: Implement `src/service/opencut/safe-text-zone.ts` and verify tests pass**

### Task 2: In-Scene Seedream Prompt & Feathered Patch + H3 Masked Latent Integration (`src/service/opencut/on-screen-text.ts`)

**Files:**
- Modify: `src/service/opencut/on-screen-text.ts`
- Modify: `src/model/project.ts`
- Modify: `src/opencut/embed/scro-onscreen-text.ts`
- Test: `src/service/opencut/on-screen-text.test.ts`

**Interfaces:**
- Produces:
  - `inSceneOnScreenTextPrompt(input: { text: string; lookLine?: string; box: { x: number; y: number; w: number; h: number }; width: number; height: number }): string`
  - `extractFeatheredInSceneTextPatch(input: { originalFrame: Buffer; paintedFrame: Buffer; box: { x: number; y: number; w: number; h: number } }): Promise<Buffer>`

- [ ] **Step 1: Add unit tests in `src/service/opencut/on-screen-text.test.ts`**
- [ ] **Step 2: Implement in-scene prompt, feathered patch extraction, and timeline `positionX`/`positionY` placement**
- [ ] **Step 3: Run tests and `npx tsc --noEmit`**
