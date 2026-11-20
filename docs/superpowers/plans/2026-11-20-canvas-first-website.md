# Scro Canvas-First Public Website Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul Scro's entire public website (`/`, `SiteHeader`, `SiteFooter`, `SiteFeaturesMenu`, `StudioPowertoolsBand`, and all public feature/tool pages + i18n/JSON-LD) into a unified Canvas-First experience focused on effortless AI media creation, with zero mention of ComfyUI, OpenCut, or FFmpeg jargon.

**Architecture:** Introduce a shared `canvasLaunchHref(signedIn, templateId)` helper routing signed-in visitors directly into `/app/canvas` (or `/app/canvas?template=...`) and signed-out visitors via `/sign-up?next=...`. Replace the 11-band patchwork homepage with 6 cohesive Canvas-First bands (Interactive Canvas Hero + 6-Template Grid + 3 Simple Steps + AI Character IP/Catalog + Canvas Studio Powertools + Free Credit Closer), replace `PublicStudioCreationHub` on `/simple`, `/scroswap`, `/teleport` with `CanvasTemplateLauncher`, replace `editor-desk.png` on `/right-tool` & `/talking-head` with `CanvasPostFlowVisual`, and scrub all technical jargon / OpenCut references across `en`, `zh-Hant`, and `zh-Hans` messages.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Node built-in `node:test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-20-canvas-first-website-design.md`

## Global Constraints

- **Zero Technical Jargon on Public Site**: Never mention `ComfyUI`, `OpenCut`, `Multi-Track`, or `FFmpeg` in public marketing components, JSON-LD, or `messages/*.ts` public marketing sections.
- **Keep Active Non-Canvas Destinations Intact**: Keep `/pricing` plan checkout cards pointing to `/app/billing` when signed in, keep character-builder CTAs pointing to `/app/characters` / `/app/characters/generate`, and keep `/posts` (Blog), `/academy`, `/affiliate`, `/contact`, `/terms`, `/privacy`.
- **Testing & Quality**: `npx tsc --noEmit`, `npx eslint` on all touched files, and `npx tsx --test 'src/**/*.test.ts'` must pass with 0 errors.
- **App Canvas Reliability**: Export `maxDuration = 800` on `src/app/app/canvas/page.tsx` so Vercel `after()` flows never hit default short timeouts when `WORKER_QUEUE_ENABLED` is unset.

## Review Focus

1. **Signed-out visitor clicking any Canvas template CTA** → must land on `/sign-up?next=%2Fapp%2Fcanvas%3Ftemplate%3D...` (preserved by `AuthForm.safeNext`) and redirect straight into that template after signup.
2. **Zero leakage of forbidden terms (`ComfyUI`, `OpenCut`, `FFmpeg`, `Multi-Track`, `2 cr/s`) or stale internal routes (`/app/life`, `/app/explainers`, `/app/talking-heads`, `/app/scroswap`, `/app/teleport`, `/simple`)** in public marketing components and i18n keys.
3. **No double dark-hero stacking on `/explainer` or `/talking-head` and no stale `editor-desk.png` OpenCut screenshots** on `/right-tool` or `/talking-head`.
4. **All 6 starter template IDs referenced by public cards/launchers match `CANVAS_STARTER_TEMPLATES` (`talking-head`, `explainer`, `scro-swap`, `teleport`, `ffmpeg-reel`, `text-image-video`)** via `isCanvasStarterTemplateId`.
5. **Multilingual consistency (`en`, `zh-Hant`, `zh-Hans`)**: all new public UI components and updated i18n keys render natural copy in all 3 locales.

---

### Task 1: Shared `canvasLaunchHref`, Navigation (`SiteHeader`, `SiteFooter`, `SiteFeaturesMenu`) & `/economy` Redirect

**Files:**
- Create: `src/presentation/components/canvas-launch-href.ts`
- Create: `src/presentation/components/canvas-launch-href.test.ts`
- Modify: `src/presentation/components/site-header.tsx`
- Modify: `src/presentation/components/site-footer.tsx`
- Modify: `src/presentation/components/site-features-menu.tsx`
- Modify: `src/app/economy/page.tsx`

**Interfaces:**
- Produces in `src/presentation/components/canvas-launch-href.ts`:
  - `canvasLaunchHref(signedIn: boolean, templateId?: CanvasStarterTemplateId): string`
  - `CANVAS_PUBLIC_TEMPLATE_LABELS`: metadata map for public showcase cards (no "FFmpeg" jargon)

- [ ] **Step 1: Write failing test in `src/presentation/components/canvas-launch-href.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `canvas-launch-href.ts` and update `site-header.tsx`, `site-footer.tsx`, `site-features-menu.tsx`, and `economy/page.tsx`**
- [ ] **Step 4: Run tests and `npx tsc --noEmit` to verify pass**
- [ ] **Step 5: Commit**

---

### Task 2: Canvas-First Homepage (`src/app/page.tsx`, `LandingHero`, `LandingCanvasShowcase`, `LandingCanvasTemplates`, `LandingSteps`, `LandingCatalog`, `StudioPowertoolsBand`, `LandingFreeCredit`)

**Files:**
- Create: `src/presentation/components/landing-canvas-showcase.tsx`
- Create: `src/presentation/components/landing-canvas-templates.tsx`
- Modify: `src/presentation/components/landing-hero.tsx`
- Modify: `src/presentation/components/landing-steps.tsx`
- Modify: `src/presentation/components/landing-catalog.tsx`
- Modify: `src/presentation/components/studio-powertools-band.tsx`
- Modify: `src/presentation/components/landing-free-credit.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/presentation/components/landing-ai-influencer.test.ts`

**Interfaces:**
- Consumes: `canvasLaunchHref`, `CANVAS_STARTER_TEMPLATES`
- Produces: `LandingCanvasShowcase({ signedIn })`, `LandingCanvasTemplates({ signedIn })`, 6-band `HomePage` (`LandingHero` + `LandingCanvasTemplates` + `LandingSteps` + `LandingCast` + `LandingCatalog` + `StudioPowertoolsBand` + `LandingFreeCredit`).

- [ ] **Step 1: Update `landing-ai-influencer.test.ts` with failing Canvas-First homepage & zero-jargon assertions**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Build `LandingCanvasShowcase`, `LandingCanvasTemplates`, and update homepage bands & `src/app/page.tsx`**
- [ ] **Step 4: Run tests and `npx tsc --noEmit` to verify pass**
- [ ] **Step 5: Commit**

---

### Task 3: Public Tool Launchers (`/simple`, `/scroswap`, `/teleport`, `/explainer`) & `CanvasPostFlowVisual` (Replacing OpenCut Screenshots)

**Files:**
- Create: `src/presentation/components/canvas-template-launcher.tsx`
- Create: `src/presentation/components/canvas-post-flow-visual.tsx`
- Modify: `src/app/simple/page.tsx`
- Modify: `src/app/scroswap/page.tsx`
- Modify: `src/app/teleport/page.tsx`
- Modify: `src/app/explainer/page.tsx`
- Modify: `src/app/talking-head/talking-head-finish.tsx`
- Modify: `src/app/right-tool/right-tool-edit.tsx`
- Test: `src/presentation/components/landing-ai-influencer.test.ts`

**Interfaces:**
- Consumes: `canvasLaunchHref`, `isCanvasStarterTemplateId`
- Produces: `CanvasTemplateLauncher({ templateId, signedIn })`, `CanvasPostFlowVisual({ locale })`.

- [ ] **Step 1: Add failing assertions in `landing-ai-influencer.test.ts` verifying `/simple`, `/scroswap`, `/teleport`, `/explainer` no longer render `PublicStudioCreationHub` and `/right-tool` + `/talking-head` no longer reference `editor-desk.png`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `CanvasTemplateLauncher`, `CanvasPostFlowVisual`, and update those 6 files**
- [ ] **Step 4: Run tests and `npx tsc --noEmit` to verify pass**
- [ ] **Step 5: Commit**

---

### Task 4: Public Feature Pages, i18n Messages (`en`, `zh-Hant`, `zh-Hans`), `/app/canvas` `maxDuration`, and Full-Repo Leak Verification

**Files:**
- Modify: `src/util/i18n/messages/en.ts`
- Modify: `src/util/i18n/messages/zh-Hant.ts`
- Modify: `src/util/i18n/messages/zh-Hans.ts`
- Modify: `src/presentation/components/examples-hero.tsx` (if CTA links to old routes)
- Modify: `src/presentation/components/example-band.tsx`
- Modify: `src/presentation/components/examples-view.tsx`
- Modify: `src/app/explainer/explainer-hero.tsx` / `explainer-cta.tsx` / `explainer-flow.tsx` / `explainer-uses.tsx`
- Modify: `src/app/talking-head/talking-head-hero.tsx` / `talking-head-cta.tsx` / `talking-head-steps.tsx`
- Modify: `src/app/right-tool/right-tool-directors.tsx` / `right-tool-hero.tsx` / `right-tool-cta.tsx`
- Modify: `src/app/product-promo/product-promo-wild.tsx` / `product-promo-hero.tsx` / `product-promo-cta.tsx`
- Modify: `src/app/cantonese/cantonese-hero.tsx` / `cantonese-cta.tsx`
- Modify: `src/app/ai-influencer/ai-influencer-hero.tsx` / `ai-influencer-cta.tsx`
- Modify: `src/app/app/canvas/page.tsx` (`export const maxDuration = 800`)
- Modify: `src/presentation/components/landing-ai-influencer.test.ts`

- [ ] **Step 1: Add comprehensive leak tests in `landing-ai-influencer.test.ts` checking public pages & i18n messages have zero `ComfyUI`, `OpenCut`, `FFmpeg`, `Multi-Track`, or `/app/life` references**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Update all `messages/*.ts` public marketing copy, feature page CTAs (`canvasLaunchHref`), and add `maxDuration = 800` on `/app/canvas/page.tsx`**
- [ ] **Step 4: Run `npx tsc --noEmit`, `npx eslint` on all touched files, and full `npx tsx --test 'src/**/*.test.ts'`**
- [ ] **Step 5: Commit**
