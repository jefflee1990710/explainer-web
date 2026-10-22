# Hardcode Directors and Styles with `IDirector` & `IStyle` Interfaces

**Date:** 2026-10-22
**Status:** Approved

## 1. Goal & Scope

For better maintainability and consistency:
1. Move all **15 built-in Directors** and **35 built-in Styles** out of MongoDB (`skills`, `styles`, `user_directors`, `user_styles` collections) into standalone hardcoded TypeScript files.
2. Each Director and each Style lives in its own dedicated `.ts` file containing all of its prompts, references, metadata, and pipeline behavior settings.
3. Introduce two top-level interfaces—`IDirector` and `IStyle`—that enforce a consistent, reusable structure across every Director and Style file, including all special pipeline flags (such as whether a clip uses the next clip's start frame as its end frame, cast count requirements, speech/lip-sync mode, realistic grading, chalkboard surface rules, etc.).
4. Remove customized (user-forked) Director and Style features, including the standalone `/app/directors/**` and `/app/styles/**` pages, sidebar links, chat/fork/delete server actions, and preview generation jobs.
5. Automatically fall back any legacy database documents pointing to removed custom Director/Style IDs or slugs to the built-in defaults (`cartoon-explainer-video-director` for directors, and `resolveStyleId()` default for styles) without querying MongoDB for skills or styles.

---

## 2. High-Level Interfaces (`IDirector` & `IStyle`)

### 2.1 `IDirector` (`src/model/director.ts`)

```ts
import type { ObjectId } from "mongodb";
import type { SystemProfile } from "@/model/director-profile";
import type { SystemPerformance } from "@/model/director-performance";
import type {
  HiggsfieldDefaults,
  SkillInputSchema,
  SkillReference,
} from "@/model/skill";

export const DIRECTOR_SLUGS = [
  "cartoon-explainer-video-director",
  "story-short-director",
  "product-demo-director",
  "dialogue-qa-director",
  "listicle-director",
  "tutorial-director",
  "opening-director",
  "ending-director",
  "talking-head-director",
  "full-body-talking-head-director",
  "comparison-card-director",
  "talking-broll-director",
  "surprise-interview-director",
  "outfit-reel-director",
  "follow-shot-director",
] as const;

export type DirectorSlug = (typeof DIRECTOR_SLUGS)[number];

export type DirectorKeyframeMode = "start-only" | "end-is-next-start";
export type DirectorSpeechMode = "narrator" | "lip-sync" | "silent";

export interface IDirectorBehavior {
  /**
   * Keyframe generation strategy:
   * - "start-only": only the start still is generated; video renders from start still + motion prompt.
   * - "end-is-next-start": each clip generates a start still; clip N uses clip N+1's start still as its end keyframe (only the final clip generates its own end still).
   */
  readonly keyframeMode: DirectorKeyframeMode;
  /** Whether Clip 2+ continues from the previous clip's ending pose/framing. */
  readonly chainsClipStarts: boolean;
  /** Whether Clip 2+ frame generation attaches Clip 1's start still as a visual anchor. */
  readonly anchorsFramesToFirstClip: boolean;
  /** Whether each clip has two beats (Start/End scene + startVo/endVo). */
  readonly dualBeat: boolean;
  /** Maximum number of 3x3 background plates planned in Video Locks (1 for single-room directors, 4 otherwise). */
  readonly maxBackgroundSets: number;
  /** How characters and voiceover behave in clips ("narrator" | "lip-sync" | "silent"). */
  readonly speechMode: DirectorSpeechMode;
  /** Whether third-person narration is forbidden (hides VoicePicker in UI). */
  readonly bansNarration: boolean;
  /** Required number of cast characters in the brief (1 or 2). */
  readonly requiredCastCount: 1 | 2;
  /** Talking-head framing mode when part of the talking-head family. */
  readonly talkingHeadShot?: "face" | "full-body";
  /** Whether realistic style switches to modern creator cameras (iPhone 16 Pro / Sony ZV-E1) and skips vintage 35mm film grain grading. */
  readonly selfShotCreatorCamera: boolean;
  /** Whether on-screen scene text is forced ON (e.g., listicle). */
  readonly forcesSceneText: boolean;
  /** Whether short in-world diagram labels in 「」 are still allowed when scene text is OFF. */
  readonly allowsInWorldLabels: boolean;
  /** Whether frame generation attaches the selected text-style reference image. */
  readonly attachesTextStyleReference: boolean;
  /** Bookend role when the director is an opening or ending sting. */
  readonly bookendRole?: "opening" | "ending";
  /** Brief form capabilities: spoken script input, room background upload, opening photo upload, brand logo upload, hidden in picker. */
  readonly requiresSpokenScript: boolean;
  readonly allowsRoomBackgroundUpload: boolean;
  readonly allowsOpeningPhotoUpload: boolean;
  readonly allowsBrandLogoUpload: boolean;
  readonly hiddenInPicker: boolean;
}

export interface IDirector {
  /** Fixed 24-hex ObjectId preserved from system seed for backward compatibility with existing video documents. */
  readonly _id: ObjectId;
  readonly slug: DirectorSlug;
  readonly title: string;
  readonly description: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly previewUrl?: string;
  readonly inputSchema: SkillInputSchema;
  readonly higgsfieldDefaults: HiggsfieldDefaults;
  readonly systemPrompt: string;
  readonly references: SkillReference[];
  readonly profile?: SystemProfile;
  readonly performance?: SystemPerformance;
  readonly behavior: IDirectorBehavior;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

### 2.2 `IStyle` (`src/model/style.ts`)

```ts
import type { StyleId } from "@/model/style-id";

export interface IStyleBehavior {
  /** Enables the 12 de-plastic realistic light/camera rules, 35mm film grading, high/2k character blueprints, and Hailuo-3 2K video routing. */
  readonly realistic: boolean;
  /** Keeps the style's own dark slate drawing surface on character blueprints instead of replacing with a flat light ground. */
  readonly usesDrawingSurface: boolean;
  /** Enforces monochrome white-chalk-on-slate rendering without hair/skin/cloth colour. */
  readonly monochromeChalk: boolean;
}

export interface IStyle {
  readonly id: StyleId;
  readonly name: string;
  readonly description: string;
  readonly canvas: string;
  readonly canvasColor: string;
  readonly look: string;
  readonly palette: string;
  readonly typography: string;
  readonly motion: string;
  readonly negatives: string;
  readonly letteringLayout?: string;
  readonly letteringLine1?: string;
  readonly letteringLine2?: string;
  readonly beatTitleLayout?: string;
  readonly reelLayout?: string;
  readonly previewUrl?: string;
  readonly previewFullUrl?: string;
  readonly behavior: IStyleBehavior;
}
```

---

## 3. File Organization

### 3.1 Directors (`src/service/director/catalog/`)
Each of the 15 system directors is stored in its own `.ts` file under `src/service/director/catalog/`:
1. `cartoon-explainer-video-director.ts`
2. `story-short-director.ts`
3. `product-demo-director.ts`
4. `dialogue-qa-director.ts`
5. `listicle-director.ts`
6. `tutorial-director.ts`
7. `opening-director.ts`
8. `ending-director.ts`
9. `talking-head-director.ts`
10. `full-body-talking-head-director.ts`
11. `comparison-card-director.ts`
12. `talking-broll-director.ts`
13. `surprise-interview-director.ts`
14. `outfit-reel-director.ts`
15. `follow-shot-director.ts`
16. `index.ts` — exports `DIRECTORS`, `DIRECTORS_BY_SLUG`, `DIRECTORS_BY_ID`, `getDirectorBySlug()`, `getDirectorById()`, `resolveDirector()`, and `listSelectableDirectors()`.

### 3.2 Styles (`src/service/style/catalog/`)
Each of the 35 `StyleId` entries is stored in its own `.ts` file under `src/service/style/catalog/`:
- `doodle.ts`, `flat-vector.ts`, `paper-cutout.ts`, `chalkboard.ts`, `chalkboard-color.ts`, `watercolor.ts`, `clay.ts`, `pixel.ts`, `ink-manga.ts`, `realistic.ts`, `low-poly.ts`, `colored-pencil.ts`, `dark-tech.ts`, `cave-painting.ts`, `egyptian-wall.ts`, `attic-black-figure.ts`, `roman-mosaic.ts`, `gothic-illumination.ts`, `high-renaissance.ts`, `ukiyo-e.ts`, `impressionism.ts`, `post-impressionism.ts`, `art-nouveau.ts`, `cubism.ts`, `bauhaus.ts`, `pop-art.ts`, `eight-bit.ts`, `ray-traced.ts`, `flat-illustration.ts`, `cream-poster.ts`, `highlighter-notes.ts`, `grid-icons.ts`, `proof-poster.ts`, `data-ring.ts`, `wireframe-breakdown.ts`.
- `index.ts` — exports `STYLES`, `STYLES_BY_ID`, `getStyleById()`, `resolveStyle()`, and `listSelectableStyles()`.

---

## 4. Data Flow & Legacy Fallback

1. **Director Resolution (`resolveDirector`)**:
   - Looks up by `slug` in `DIRECTORS_BY_SLUG` or by `_id` hex string in `DIRECTORS_BY_ID`.
   - If a legacy video references a deleted/custom director slug or ObjectId not in the catalog, falls back to `cartoon-explainer-video-director`.
   - `loadStoredSkill()`, `listSelectableSkills()`, and `findSelectableSkill()` resolve synchronously/in-memory from `DIRECTORS` without touching MongoDB.
2. **Style Resolution (`resolvedStyle`, `loadStyle`, `loadRenderableStyle`)**:
   - Uses `resolveStyleId(id)` to map any unknown/custom `styleId` to `DEFAULT_STYLE_ID` (`doodle`), then returns the hardcoded `IStyle` from `STYLES_BY_ID` (or the test overlay when unit tests call `replaceStyleOverlay`).
   - `hydrateStyles()` and `ensureCatalogStyles()` become fast in-memory no-ops so existing callers and tests continue to work without MongoDB queries.
3. **Behavior Helper Alignment**:
   - Helpers in `steady-stills.ts`, `clip-continuity.ts`, `skill-rules.ts`, `talking-head.ts`, `dual-beat.ts`, `video-locks.ts`, and `realistic-light.ts` delegate to `director.behavior.*` and `style.behavior.*`.

---

## 5. Removal of Customized Director & Style Features

1. **Routes Removed**:
   - `src/app/app/directors/page.tsx` and `src/app/app/directors/[id]/page.tsx`
   - `src/app/app/styles/page.tsx` and `src/app/app/styles/[id]/page.tsx`
   - `src/app/app/styles/load-style-for-user.ts`
2. **Navigation Updated**:
   - Remove the `Director` (`/app/directors`) and `Style` (`/app/styles`) entries from the app navigation/sidebar while keeping `Text style` (`/app/text-styles`) and all other links intact.
3. **Actions & Components Removed**:
   - Delete custom director/style Server Actions (`src/presentation/actions/directors.ts`, `src/presentation/actions/styles.ts`) and workspace/chat/create/delete UI components under `src/presentation/components/app/directors/**` and `src/presentation/components/app/styles/**`.
   - Simplify `StylePicker` and `SkillPicker` so they render the built-in catalog directly without a "Mine / Custom" section.
4. **Generation Queue Cleanup**:
   - Remove `directorPreview` and `userStyle` preview job kinds/handlers from the background generation queue or turn them into safe no-ops if encountered.

---

## 6. Testing & Verification

1. Unit tests verifying every entry in `DIRECTORS` (15 directors) and `STYLES` (35 styles) satisfies `IDirector` and `IStyle`, has non-empty prompts, valid behavior flags, and expected preview URLs.
2. Existing unit tests for `frame-prompts`, `realistic-light`, `skill-rules`, `talking-head`, `dual-beat`, `video-locks`, and `blueprint-prompt` pass without requiring MongoDB for styles or skills.
3. `npx tsc --noEmit` and `npx eslint src/` pass with zero errors.
