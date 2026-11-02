# Life Quick Generate + Advanced Settings

**Date:** 2026-11-02  
**Status:** Approved for planning  
**Surface:** `/app/life` (`LifeDesk`)

## Goal

Make Life photo creation easier by default. Keep LOOK selection as-is. Under it, show two studio modes:

1. **Quick Generate** (default) — one-click generate with a fixed post type, plus a random post-type generate.
2. **Advanced settings** — existing three create modes (Post Type & Pose, Replace Person, Add to Scene) and their full forms.

## Non-goals

- No backend / `generateLifeShotAction` API changes.
- No changes to LOOK / preset tree behavior.
- No new credit pricing; both Quick buttons use existing `FRAME_COST`.
- Quick mode does not add post-type picker, pose picker, scene upload, or wardrobe UI (those stay in Advanced).

## UI structure

Main column order:

1. Character picker header (unchanged)
2. LOOK strip (`LifePresetTree`, unchanged)
3. **Outer tabs:** Quick Generate | Advanced settings (default: Quick Generate)
4. Recent shots rail (unchanged)

### Quick Generate panel

- Short bilingual helper copy (e.g. use current look to generate a street OOTD / random post).
- Primary button **Generate** — always uses template id `street-ootd-full` (`createMode: "post-template"`).
- Secondary button **Random** — picks a uniform random id from `LIFE_POST_TEMPLATES` and generates immediately.
- Both show cost with existing `FRAME_COST` and share the desk `pending` / disabled state.

### Advanced settings panel

- Existing `LifeCreateTabs` and the three mode forms, including the current bottom Generate control.
- Tab order remains: Post Type & Pose → Replace Person → Add to Scene (from prior change; `LIFE_CREATE_MODES` starts with `post-template`).

## Behavior & data flow

| Action | `createMode` | `templateId` | Scene / remarks / composition / custom instruction |
| --- | --- | --- | --- |
| Quick Generate | `post-template` | `street-ootd-full` | Not sent |
| Quick Random | `post-template` | random from `LIFE_POST_TEMPLATES` | Not sent |
| Advanced Generate | current tab mode | as today | as today |

Shared inputs on Quick paths:

- Current character
- Current LOOK (`versionId` / style)
- Quick calls omit scene, composition ref, custom instruction, remarks, pose, and wardrobe overrides so one-click stays reliable. Those fields remain available only in Advanced.

After success:

- Prepend shot to recent list / open recent on small screens (same as today).
- Quick does not clear LOOK.
- Advanced keeps existing `resetCreateForm()` behavior.

Errors:

- Reuse existing error toast / credit-gate dialog paths.
- Character not ready → same `life.needBlueprint` gate.

Mode switch:

- Switching Quick ↔ Advanced preserves character, LOOK, wardrobe, pose, template, and scene state (no hard reset).

## Components

New files under `src/presentation/components/app/life/`:

- `life-studio-mode-tabs.tsx` — outer Quick / Advanced tablist.
- `life-quick-generate.tsx` — Quick copy + Generate + Random buttons.

Desk changes:

- `life-desk.tsx` mounts outer tabs; Quick handlers call a shared generate path with an explicit `templateId` override for post-template.

Helpers / constants:

- `QUICK_LIFE_TEMPLATE_ID = "street-ootd-full"`
- `pickRandomLifePostTemplateId()` over `LIFE_POST_TEMPLATES`

Copy:

- Follow Life bilingual pattern: Chinese title + English badge / short English support where tabs already do so.

## Testing

- Unit test for `pickRandomLifePostTemplateId` (returns a known catalog id; optionally assert coverage over many draws).
- No live image generation in tests.
- Manual: default lands on Quick; Generate uses OOTD; Random varies templates; Advanced still exposes three modes.

## Open decisions (resolved)

- Quick contents: Generate + Random only (no template picker).
- Fixed Generate template: `street-ootd-full`.
- Layout: outer Quick / Advanced tabs under LOOK (not inline expand, not always-visible Quick buttons).
