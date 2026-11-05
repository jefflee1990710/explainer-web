# Explainer Step-by-Step Cartoon & Diagram Control Design (Approach A + B)

## 1. Intent & Why
Give creators granular, intuitive step-by-step control over what the cartoon character and explanation diagram do in each clip before running Phase A and frame generation, while making AI Auto-Draft (`draftStoryboardClipsWithAi`) automatically populate both structured controls and visual wireframe stamps on the sketch canvas.

## 2. Goals & Non-Goals
- **Goals**:
  1. **Approach A — Structured Cartoon & Diagram Controls per Clip**:
     - `diagramLayout`: `"auto" | "split-compare" | "process-flow" | "funnel" | "balance-scale" | "iceberg" | "timeline" | "character-scene"`
     - `characterPosition`: `"auto" | "left" | "right" | "center" | "none"`
     - `characterAction`: preset chips + freeform input describing the character's pose/emotion/action in that clip.
     - `visualNodes`: array of step-by-step cartoon props / labeled diagram pieces (`string[]`) that appear in the clip, editable as interactive chips.
  2. **Approach B — Interactive Visual Stamps & AI Auto-Draft Canvas**:
     - Add 1-click stamp buttons (`+ 角色企位 Person`, `+ 圖表方框 Box`, `+ 圓形節點 Circle`, `+ 指引箭咀 Arrow`, `+ 標題卡 Banner`) and 1-click layout templates to `StoryboardSketchPad` via `AnnotationEditorHandle.addStamp` / `loadSketchElements`.
     - Upgrade `draftStoryboardClipsWithAi` (`src/service/director/storyboard-draft-chat.ts`) so AI Auto-Draft returns `diagramLayout`, `characterPosition`, `characterAction`, `visualNodes`, and `sketchElements` (`0..100` normalized coordinates) and automatically renders them onto each clip's canvas.
  3. **End-to-End Pipeline Wiring (`Phase A` + `Seedream 5.0 Pro` Frame Generation)**:
     - Include `diagramLayout`, `characterPosition`, `characterAction`, and `visualNodes` in `buildStoryboardDraftPhaseABlock`.
     - Wire `clipDraft.sketchUrl` and structured draft rules into `buildFramePrompt` and `frameSubmitPlan` (`src/service/higgsfield/frame-prompts.ts`) so Seedream 5.0 Pro follows the user's spatial sketch and required cartoon elements when generating Clip `start` frames.
- **Non-Goals**:
  - Do not break backward compatibility with existing projects that only have `{ clipNumber, explanation, voDraft, sketchUrl }`.

## 3. Architecture & File Map
- `src/model/project.ts`: Add `STORYBOARD_DIAGRAM_LAYOUTS`, `STORYBOARD_CHARACTER_POSITIONS`, and optional `diagramLayout`, `characterPosition`, `characterAction`, `visualNodes` fields to `StoryboardClipDraft` + `projectSchema`.
- `src/service/director/storyboard-draft-chat.ts`:
  - Expand `draftChatOutputSchema` and `sanitizeClipDraftsInput` to handle `diagramLayout`, `characterPosition`, `characterAction`, `visualNodes`, and `sketchElements`.
  - Add `buildPresetSketchElements(layout, characterPosition, visualNodes)` helper to synthesize clean `0..100` wireframe `StoryboardSketchElement[]` whenever a layout preset is chosen or AI drafts a clip.
  - Expand `buildStoryboardDraftPhaseABlock` so Phase A honors all structured cartoon/diagram controls.
- `src/presentation/components/annotation-editor.tsx` & `src/presentation/components/app/projects/new/storyboard-sketch-pad.tsx`:
  - Extend `AnnotationEditorHandle` with `addStamp(element: StoryboardSketchElement)` and `setSketchElements(elements: StoryboardSketchElement[])` so stamps (`person`, `rect`, `circle`, `arrow`, `line`, `text`) render as selectable, draggable, editable Fabric.js objects on the canvas and auto-export `sketchUrl`.
- `src/presentation/components/app/projects/new/storyboard-drafts-step.tsx`:
  - Add the structured **Cartoon & Diagram Control Panel** (Diagram Layout selector, Character Position & Action selector/chips, and interactive Step-by-Step Cartoon Visual Nodes editor) alongside the upgraded `StoryboardSketchPad`.
- `src/service/higgsfield/frame-prompts.ts`:
  - Add `clipDraftSketchReference(project, clipNumber, position)` and `clipDraftStagingLine(project, clipNumber)` so `frameSubmitPlan` and `buildFramePrompt` pass the user's layout sketch and structured cartoon nodes into Seedream 5.0 Pro.
