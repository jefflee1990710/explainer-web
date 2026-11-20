# Scro Canvas-First Public Website Overhaul Design

**Date:** 2026-11-20  
**Status:** Draft (Pending Builder Check & User Approval)  
**Scope:** Complete overhaul of Scro's public marketing website (`/` homepage, `SiteHeader`, `SiteFooter`, `SiteFeaturesMenu`, `StudioPowertoolsBand`, all public feature/tool pages, JSON-LD, and i18n copy) to center 100% on **Scro Canvas** — effortless AI media creation for everyone, with zero mention of ComfyUI, OpenCut, or technical FFmpeg jargon on public pages.

---

## 1. Intent & Why

Scro's logged-in product has been consolidated around `/app/canvas`, where anyone can build AI videos, talking heads, explainers, character swaps, scene teleports, voiceovers, and FFmpeg edits by clicking a starter template or asking the Canvas AI Assistant.

However, the public website (`https://www.scro.io`) still reflects the old fragmented architecture:
- Homepage `/` (`src/app/page.tsx`) renders 11 disjointed sections leading with `/simple`, legacy `"2 cr/s"` chips, and `"Multi-Track AI Video Editor"` (OpenCut) copy.
- `SiteHeader` points `"Try It Now"` to `/simple`, and `SiteFooter` links to `"Simple Studio"`.
- Public tool pages (`/simple`, `/explainer`, `/scroswap`, `/teleport`) mount `PublicStudioCreationHub`, which creates legacy non-Canvas jobs instead of opening `/app/canvas`.
- Feature pages (`/talking-head`, `/right-tool`, `/ai-influencer`, `/product-promo`, `/cantonese`, `/examples`) still contain legacy OpenCut timeline / standalone desk references in copy and i18n messages.

This overhaul aligns the entire public website behind **one clear promise**: anyone can start creating AI media effortlessly on **Scro Canvas** in one click — no technical setup, no complex wiring, and zero mention of ComfyUI.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
1. **Canvas-First Homepage (`/`)**: Replace the 11-band patchwork with a cohesive 6-band layout led by an **Interactive Canvas Stage Hero** (tabbed workflow preview + AI Assistant prompt example + live sample output) and a **6-Template One-Click Grid** launching straight into `/app/canvas?template=...`.
2. **Effortless Positioning (Zero Technical Jargon)**: All headlines, subtitles, and feature copy focus purely on convenience and simplicity (*pick a template or tell the AI Assistant what you want, drop your media, click Run Flow*). Never mention ComfyUI, OpenCut, or FFmpeg anywhere on the public site — describe video merging, voice mixing, trimming, and aspect formatting in plain creator language (e.g., *Auto-Edit & Mix / 自動串接與混音*).
3. **Global Navigation & Footer Alignment**: Update `SiteHeader`, `SiteFeaturesMenu`, and `SiteFooter` so primary CTAs open Canvas (`/app/canvas` when signed in, `/sign-up?next=%2Fapp%2Fcanvas` when signed out), and remove `"Simple Studio"` / `"2 cr/s"` legacy labels.
4. **All Public Feature & Tool Pages Updated**:
   - Replace `PublicStudioCreationHub` usage on `/simple`, `/explainer`, `/scroswap`, `/teleport` with a lightweight **`CanvasTemplateLauncher`** component that previews the corresponding Canvas template and sends users straight to `/app/canvas?template=...` (via `/sign-up?next=...` if signed out).
   - Update copy, CTAs, `StudioPowertoolsBand`, `RightToolEdit`, `ExamplesView`, `/talking-head`, `/ai-influencer`, `/product-promo`, `/cantonese`, `/pricing`, and JSON-LD across `en`, `zh-Hant`, and `zh-Hans` to remove all OpenCut / multi-track timeline / standalone tool references and unify on Scro Canvas.

### Non-Goals
- Do NOT remove or break `/posts` (public Blog), `/academy`, `/affiliate`, `/contact`, `/terms`, `/privacy`.
- Do NOT modify `/app/canvas` studio backend or worker pipelines (already deployed on `main`).
- Do NOT delete existing `/public/landing/**`, `/public/hero/**`, `/public/examples/**`, or `/public/cta/**` image/video assets — reuse existing proven visual assets cleanly inside the redesigned sections.

### Anti-Goals
- Do NOT mention ComfyUI, FFmpeg, local weights, or technical node-graph jargon on public marketing pages.
- Do NOT leave `PublicStudioCreationHub` calling legacy `createSimpleVideoAction` / `createVideoAction` from public pages when users expect to enter Scro Canvas.
- Do NOT hardcode broken `/app/explainers`, `/app/talking-heads`, `/app/scroswap`, `/app/teleport`, or `/app/life` URLs in public CTAs.

---

## 3. Shared Routing & CTA Helper

Create `src/presentation/components/canvas-launch-href.ts`:
- `canvasLaunchHref(signedIn: boolean, templateId?: CanvasStarterTemplateId): string`
  - Target path: `templateId ? "/app/canvas?template=" + templateId : "/app/canvas"`.
  - When `signedIn === true`: returns the target path directly.
  - When `signedIn === false`: returns `/sign-up?next=${encodeURIComponent(target)}`.
- Verify `src/app/sign-up/[[...sign-up]]/page.tsx` and `AuthForm` preserve `nextPath` including query params (`/app/canvas?template=talking-head`) after signup/login (check `AuthForm` redirect sanitization so relative `/app/canvas?template=...` is preserved cleanly).

---

## 4. Homepage (`/`) Redesign (`src/app/page.tsx`)

Streamline `/` into **6 focused Canvas-First sections** (using dark `#0d0e13` + `#c6f24b` lime studio contrast alternating with crisp `#ffffff` / `#fafafa` sections):

1. **Band 1 — Interactive Canvas Stage Hero (`LandingHero` + `LandingCanvasShowcase`)**:
   - **Headline & Subheadline**: Focused 100% on simplicity & convenience (no ComfyUI mention).
     - `en`: *"Create AI Videos on One Simple Canvas."* / *"Pick a ready-made template or tell the AI Assistant what you want—generate lip-sync reels, explainers, character swaps, and edits in minutes."*
     - `zh-Hant`: *"一塊畫布，輕鬆完成所有 AI 影片創作。"* / *"不用學複雜工具或設定。揀選範本或直接同 AI 助理講一句，一鍵完成對嘴口播、解說短片、換角換場與配音剪接。"*
     - `zh-Hans`: *"一块画布，轻松完成所有 AI 视频创作。"* / *"不用学复杂工具或配置。选择模板或直接对 AI 助理说一句，一键完成对口播、解说短视频、换角换场与配音剪辑。"*
   - **Primary CTA**: `⚡ Start Creating on Canvas` → `canvasLaunchHref(signedIn)`
   - **Secondary CTA**: `Browse Templates ↓` → `#canvas-templates`
   - **Interactive Visual Stage (`LandingCanvasShowcase`)**:
     - Left/Top interactive tab pills for 5 everyday creator workflows (`Talking Head`, `AI Explainer`, `Scro Swap`, `Teleport`, `Auto-Edit & Mix`).
     - Center visual card: animated/glowing 2–3 step visual flow (`Script` → `AI Voice` → `Talking Head`, etc.) + a sample **Canvas AI Assistant** prompt bubble showing how a plain sentence builds the flow automatically.
     - Right output preview: plays the corresponding real sample video (`/hero/tools/talking-head/center.mp4`, `/hero/tools/explainer/center.mp4`, `/hero/tools/scroswap/center.mp4`, `/hero/tools/teleport/center.mp4`, `/hero/tools/simple/center.mp4`) with a 1-click `Try This Template →` link (`canvasLaunchHref(signedIn, tplId)`).

2. **Band 2 — 6 Ready-to-Run Canvas Templates (`LandingCanvasTemplates`, `id="canvas-templates"`)**:
   - Renders 6 clean template cards matching `CANVAS_STARTER_TEMPLATES` (`talking-head`, `explainer`, `scro-swap`, `teleport`, `ffmpeg-reel`, `text-image-video`).
   - Each card shows: plain-language title & benefit (using plain creator copy such as *"Multi-Clip Merge & Voice Mix / 多段合併配音剪輯"* without "FFmpeg" jargon), 2–3 visual step pills (e.g. `Script → AI Voice → 1080p Lip-Sync`), estimated cost badge, and `Open in Canvas →` (`canvasLaunchHref(signedIn, tpl.id)`).

3. **Band 3 — 3 Effortless Steps (`LandingSteps`)**:
   - `01`: Pick a Template or Ask AI Assistant (zero setup, AI wires the workflow for you).
   - `02`: Add Your Character, Product, or Clip (reuses `/landing/steps/character.webp`, `life.webp`, `video.webp`).
   - `03`: Hit Run Flow & Download MP4 (cloud handles voice, rendering, and FFmpeg assembly automatically).

4. **Band 4 — AI Character IP & Catalog (`LandingCast` + `LandingCatalog`)**:
   - Retains the popular AI Influencer Identity Lock showcase (`/app/characters`), framed as reusable characters you can drop into any Canvas node with 1 click. **[Our Call]**: Character-creation CTAs keep `/app/characters` (active Studio page), while any legacy `/app/life` links inside `LandingCatalog` switch to `canvasLaunchHref(signedIn)` (`scro:life` lives inside Canvas).

5. **Band 5 — 6 Canvas Studio Capabilities (`StudioPowertoolsBand`)**:
   - Rewrite all 6 cards across `zh` and `en` to match Scro Canvas's real capabilities:
     1. `Talking Head 120s & ElevenLabs TTS` (no OpenCut mention)
     2. `AI Explainer Templates` (Whiteboard, Paper Cutout, 3D Papercraft)
     3. `Scro Swap & Teleport` (Motion Swap, 17-Look Relight, Scene Relocate)
     4. `Auto-Edit, Merge & Voice Mix` (Auto-Concat, Audio Mux & Ducking, Trim/Speed, Aspect Resize — replacing old OpenCut AI Audio card, zero "FFmpeg" jargon)
     5. `Canvas AI Assistant` (Describe what you want in 6 languages, AI builds the graph for free)
     6. `2K Poster, Life Photos & Character Lock` (Seedream 5.0 Pro + locked character outfits)

6. **Band 6 — Free Welcome Credit CTA (`LandingFreeCredit`)**:
   - Launches straight into `canvasLaunchHref(signedIn)`.

---

## 5. Header, Footer & All Public Subpages

1. **`SiteHeader` (`src/presentation/components/site-header.tsx`)**:
   - Replace `"Try It Now"` (`/simple`) with `"Open Canvas"` / `"開始 Canvas"` pointing to `canvasLaunchHref(signedIn)`.
   - Keep `Home` (`/`), `Features` dropdown (`SiteFeaturesMenu`), `Pricing` (`/pricing`), `Blog` (`/posts`), and account/sign-in controls.
2. **`SiteFeaturesMenu` (`src/presentation/components/site-features-menu.tsx`)**:
   - Keep the 6 SEO feature links (`/explainer`, `/talking-head`, `/ai-influencer`, `/product-promo`, `/cantonese`, `/right-tool`) with updated Canvas-first blurbs in `messages/*.ts`.
3. **`SiteFooter` (`src/presentation/components/site-footer.tsx`)**:
   - Replace `Simple Studio` (`/simple`) with `Scro Canvas` (`canvasLaunchHref(signedIn)`), fix dark-mode hover colors (`hover:text-white` instead of `hover:text-[#12141c]` on dark footer links!), and keep `Scro Swap`, `Teleport`, `SITE_FEATURE_LINKS`, `/posts`, `/examples`, `/pricing`, `/contact`, `/terms`, `/privacy`.
4. **Public Tool & Feature Pages**:
   - **Create `CanvasTemplateLauncher`** (`src/presentation/components/canvas-template-launcher.tsx`): clean dark hero/launcher band used on `/simple`, `/scroswap`, and `/teleport` (replacing `PublicStudioCreationHub`), with `<h1>`, sample video, 3 simple steps, and 1-click `Open in Scro Canvas →` (`canvasLaunchHref(signedIn, templateId)`). **[Our Call]**: `/simple` maps to `"text-image-video"`, `/scroswap` to `"scro-swap"`, and `/teleport` to `"teleport"`.
   - **`/economy` [Our Call]**: redirect to `/pricing` (stays on a public page instead of forcing unauthenticated visitors into `/sign-in`).
   - **`/explainer` & `/talking-head` [Our Call]**: Remove `PublicStudioCreationHub` from `/explainer/page.tsx` so neither page stacks two dark heroes; keep `<ExplainerHero />` and `<TalkingHeadHero />` (preserving their SEO `<h1>`) with CTAs updated to `canvasLaunchHref(signedIn, "explainer")` and `canvasLaunchHref(signedIn, "talking-head")`.
   - **`/right-tool` & `/talking-head` post-production visual [Our Call]**: Replace the stale `editor-desk.png` OpenCut multi-track timeline screenshot in `src/app/right-tool/right-tool-edit.tsx` and `src/app/talking-head/talking-head-finish.tsx` with a live **`CanvasPostFlowVisual`** component (styled like Scro Canvas cards showing `Generated Clip` + `AI Voice` → `Auto Audio Mix` → `Auto Merge` → `MP4 Ready`) and update `rightTool.edit.*` / `talkingHeadPage.finish.*` copy to highlight automated voice mixing & clip merging in Canvas (zero "FFmpeg" or "OpenCut" jargon).
   - **`/ai-influencer`, `/product-promo`, `/cantonese`, `/examples`, `/pricing` [Our Call]**: Update video/media creation CTAs to `canvasLaunchHref(signedIn, ...)` while keeping `/pricing` subscription checkout cards pointing to `/app/billing` when signed in and character-builder CTAs pointing to `/app/characters`. Remove any remaining OpenCut / multi-track timeline / standalone tool mentions in `messages/*.ts` and `src/app/page.tsx` JSON-LD `featureList`.

---

## 6. Testing & Verification Scope

- Update `src/presentation/components/landing-ai-influencer.test.ts` (and add tests for `canvasLaunchHref`, `CanvasTemplateLauncher` / homepage Canvas-First structure, zero `"ComfyUI"` / `"OpenCut"` / `"Multi-Track"` / `"FFmpeg"` leaks on public marketing pages & messages).
- Verify `npx tsc --noEmit`, `npx eslint` on all touched files, and `npx tsx --test 'src/**/*.test.ts'` pass with 0 errors.
