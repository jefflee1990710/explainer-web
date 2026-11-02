# Streamlined Quick Setup Form UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streamline the Quick Setup creation form so users can pick video type, style, character, and submit directly from the instruction card without dead whitespace or mismatched director/style defaults.

**Architecture:** Merge `ProjectPicker` into `BriefSetupModeBar`, render a 2-pill toggle in `SkillPicker` when `skills.length === 2` with automatic style matching for Explainer directors, and embed the primary `Start` CTA inside the `QuickScriptCard` footer when in Quick Setup mode.

**Tech Stack:** React Client Components, Tailwind CSS, Node test runner (`npx tsx --test`).

**Spec:** `docs/superpowers/specs/2026-11-02-streamlined-quick-setup-form-design.md`

---

### Task 1: Compact `BriefSetupModeBar` with inline `projectPicker` slot and `QuickScriptCard` inline `actionSlot`

**Files:**
- Modify: `src/presentation/components/app/projects/new/brief-setup-mode-bar.tsx`
- Modify: `src/presentation/components/app/projects/new/quick-script-card.tsx`

- [ ] **Step 1: Add `projectPicker?: React.ReactNode` to `BriefSetupModeBar`**
- [ ] **Step 2: Add `actionSlot?: React.ReactNode` to `QuickScriptCard` footer**

---

### Task 2: 2-Option segmented toggle in `SkillPicker` and style auto-sync in `NewProjectForm`

**Files:**
- Modify: `src/presentation/components/app/projects/[id]/skill-picker.tsx`
- Modify: `src/presentation/components/app/projects/new/new-project-form.tsx`

- [ ] **Step 1: When `skills.length === 2 && !sideBySideGuide`, render a 2-column segmented toggle in `SkillPicker`**
- [ ] **Step 2: Auto-sync default style when switching between `paper-cutout-explainer-video-director` (`paper-cutout`) and `cartoon-explainer-video-director` (`whiteboard`), and wire the inline `Start` CTA + `projectPicker` into `QuickScriptCard` and `BriefSetupModeBar`**
- [ ] **Step 3: Typecheck and lint**
