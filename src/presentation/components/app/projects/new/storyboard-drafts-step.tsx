"use client";

import { useState } from "react";
import type {
  AspectRatio,
  StoryboardCharacterPosition,
  StoryboardClipDraft,
  StoryboardDiagramLayout,
  VoLanguage,
} from "@/model/project";
import { StoryboardDraftChatPanel } from "@/presentation/components/app/projects/new/storyboard-draft-chat-panel";
import { StoryboardSketchPad } from "@/presentation/components/app/projects/new/storyboard-sketch-pad";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  buildPresetSketchElements,
  MAX_CLIP_DRAFTS,
  MAX_VISUAL_NODES,
} from "@/service/director/storyboard-draft-chat";

// Step 04 of the create-video wizard: structured cartoon & diagram controls + interactive sketchpad on the left,
// paired with an AI storyboard draft assistant chatroom on the right.
export function StoryboardDraftsStep({
  skillSlug,
  styleId,
  source,
  spokenScript,
  language,
  aspectRatio,
  drafts,
  disabled,
  hideHeader = false,
  onChange,
}: {
  skillSlug: string;
  styleId: string;
  source: string;
  spokenScript?: string;
  language: VoLanguage;
  aspectRatio: AspectRatio;
  drafts: StoryboardClipDraft[];
  disabled?: boolean;
  hideHeader?: boolean;
  onChange: (next: StoryboardClipDraft[]) => void;
}) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const [newNodeInput, setNewNodeInput] = useState("");

  const safeIndex =
    drafts.length === 0 ? 0 : Math.min(activeIndex, drafts.length - 1);
  const currentDraft = drafts[safeIndex] ?? null;

  const diagramLayouts: Array<{ id: StoryboardDiagramLayout; label: string }> = [
    { id: "auto", label: t("brief.drafts.layoutAuto") },
    { id: "split-compare", label: t("brief.drafts.layoutSplitCompare") },
    { id: "process-flow", label: t("brief.drafts.layoutProcessFlow") },
    { id: "funnel", label: t("brief.drafts.layoutFunnel") },
    { id: "balance-scale", label: t("brief.drafts.layoutBalanceScale") },
    { id: "iceberg", label: t("brief.drafts.layoutIceberg") },
    { id: "timeline", label: t("brief.drafts.layoutTimeline") },
    { id: "character-scene", label: t("brief.drafts.layoutCharacterScene") },
  ];

  const characterPositions: Array<{ id: StoryboardCharacterPosition; label: string }> = [
    { id: "auto", label: t("brief.drafts.posAuto") },
    { id: "left", label: t("brief.drafts.posLeft") },
    { id: "right", label: t("brief.drafts.posRight") },
    { id: "center", label: t("brief.drafts.posCenter") },
    { id: "none", label: t("brief.drafts.posNone") },
  ];

  const actionPresets: string[] = [
    t("brief.drafts.actionPresetPoint"),
    t("brief.drafts.actionPresetConfused"),
    t("brief.drafts.actionPresetPush"),
    t("brief.drafts.actionPresetMagnify"),
    t("brief.drafts.actionPresetIdea"),
    t("brief.drafts.actionPresetCelebrate"),
  ];

  // Add a new empty clip draft and switch to it.
  function addClipDraft() {
    if (drafts.length >= MAX_CLIP_DRAFTS || disabled) return;
    const nextNumber = drafts.length + 1;
    const defaultPos: StoryboardCharacterPosition =
      nextNumber % 2 === 1 ? "left" : "right";
    const next: StoryboardClipDraft[] = [
      ...drafts,
      {
        clipNumber: nextNumber,
        explanation: "",
        voDraft: "",
        diagramLayout: "process-flow",
        characterPosition: defaultPos,
      },
    ];
    onChange(next);
    setActiveIndex(next.length - 1);
  }

  // Remove the selected clip draft and renumber remaining drafts sequentially.
  function removeClipDraft(indexToRemove: number) {
    if (disabled) return;
    const next = drafts
      .filter((_, idx) => idx !== indexToRemove)
      .map((item, idx) => ({ ...item, clipNumber: idx + 1 }));
    onChange(next);
    setActiveIndex(Math.max(0, Math.min(safeIndex, next.length - 1)));
  }

  // Update one or more fields on the active clip draft.
  function updateCurrentDraft(patch: Partial<StoryboardClipDraft>) {
    if (!currentDraft) return;
    const next = drafts.map((item, idx) =>
      idx === safeIndex ? { ...item, ...patch } : item,
    );
    onChange(next);
  }

  // Generate wireframe sketchElements from the active clip's structured settings and render onto canvas.
  function handleApplyAutoLayout(override?: Partial<StoryboardClipDraft>) {
    if (!currentDraft || disabled) return;
    const merged = { ...currentDraft, ...override };
    const elements = buildPresetSketchElements({
      diagramLayout: merged.diagramLayout,
      characterPosition: merged.characterPosition,
      characterAction: merged.characterAction,
      visualNodes: merged.visualNodes,
    });
    updateCurrentDraft({ ...override, sketchElements: elements });
  }

  function handleAddVisualNode() {
    if (!currentDraft || disabled) return;
    const trimmed = newNodeInput.trim();
    if (!trimmed) return;
    const existing = currentDraft.visualNodes ?? [];
    if (existing.length >= MAX_VISUAL_NODES) return;
    const nextNodes = [...existing, trimmed];
    setNewNodeInput("");
    updateCurrentDraft({ visualNodes: nextNodes });
  }

  function handleRemoveVisualNode(nodeIndex: number) {
    if (!currentDraft || disabled) return;
    const existing = currentDraft.visualNodes ?? [];
    const nextNodes = existing.filter((_, idx) => idx !== nodeIndex);
    updateCurrentDraft({ visualNodes: nextNodes.length > 0 ? nextNodes : undefined });
  }

  return (
    <div className="space-y-4">
      {!hideHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-display rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-accent-ink">
                01
              </span>
              <h2 className="font-display text-base font-bold">
                {t("brief.drafts.title")}
              </h2>
              <span className="rounded-full border border-accent-ink/20 bg-paper px-2 py-0.5 text-[11px] font-semibold text-muted">
                {t("brief.drafts.optionalBadge")}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{t("brief.drafts.hint")}</p>
          </div>
        </div>
      ) : null}

      {/* Top AI Storyboard Draft Assistant Bar */}
      <StoryboardDraftChatPanel
        skillSlug={skillSlug}
        styleId={styleId}
        source={source}
        spokenScript={spokenScript}
        language={language}
        drafts={drafts}
        disabled={disabled}
        onApplyDrafts={(nextDrafts) => {
          onChange(nextDrafts);
          if (nextDrafts.length > 0 && safeIndex >= nextDrafts.length) {
            setActiveIndex(0);
          }
        }}
      />

      {/* Clip tabs + Add / Remove Clip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {drafts.map((item, idx) => {
            const active = idx === safeIndex;
            return (
              <button
                key={item.clipNumber}
                type="button"
                disabled={disabled}
                onClick={() => setActiveIndex(idx)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  active
                    ? "border-accent-ink bg-accent-ink text-lime shadow-[2px_2px_0_0_rgba(255,77,46,0.9)]"
                    : "border-accent-ink/15 bg-paper text-foreground hover:border-accent-ink/40"
                }`}
              >
                <span>{t("brief.drafts.clipTab", { n: item.clipNumber })}</span>
                {item.sketchUrl ? (
                  <span
                    title={t("brief.drafts.sketchSavedBadge")}
                    className="h-1.5 w-1.5 rounded-full bg-accent"
                  />
                ) : null}
              </button>
            );
          })}

          {drafts.length < MAX_CLIP_DRAFTS ? (
            <button
              type="button"
              disabled={disabled}
              onClick={addClipDraft}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-accent-ink/30 bg-paper/70 px-3.5 py-1.5 text-xs font-bold text-foreground transition hover:border-accent-ink hover:bg-lime/25 disabled:opacity-50"
            >
              {t("brief.drafts.addClip", { n: drafts.length + 1 })}
            </button>
          ) : null}
        </div>

        {currentDraft ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => removeClipDraft(safeIndex)}
            className="cursor-pointer rounded-full border border-accent-ink/10 bg-paper px-3 py-1 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
          >
            {t("brief.drafts.removeClip", { n: currentDraft.clipNumber })}
          </button>
        ) : null}
      </div>

      {currentDraft ? (
        <div className="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)] lg:items-start">
          {/* Left Column: Interactive Scene Sketchpad */}
          <div className="rounded-2xl border border-accent-ink/12 bg-paper/60 p-4">
            <StoryboardSketchPad
              key={`sketch-clip-${currentDraft.clipNumber}-${aspectRatio}`}
              clipNumber={currentDraft.clipNumber}
              aspectRatio={aspectRatio}
              sketchUrl={currentDraft.sketchUrl}
              sketchElements={currentDraft.sketchElements}
              disabled={disabled}
              onSketchChange={(dataUrl) =>
                updateCurrentDraft({ sketchUrl: dataUrl })
              }
              onAutoLayoutRequest={() => handleApplyAutoLayout()}
            />
          </div>

          {/* Right Column: Script Notes + Structured Diagram & Character Controls */}
          <div className="space-y-4 rounded-2xl border border-accent-ink/12 bg-paper/40 p-4 sm:p-5">
            {/* Visual Explanation + Voiceover Draft side-by-side */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`clip-draft-explanation-${currentDraft.clipNumber}`}
                  className="block text-xs font-bold text-foreground"
                >
                  {t("brief.drafts.explanationLabel", {
                    n: currentDraft.clipNumber,
                  })}
                </label>
                <textarea
                  id={`clip-draft-explanation-${currentDraft.clipNumber}`}
                  rows={3}
                  value={currentDraft.explanation}
                  disabled={disabled}
                  onChange={(event) =>
                    updateCurrentDraft({ explanation: event.target.value })
                  }
                  placeholder={t("brief.drafts.explanationPlaceholder", {
                    n: currentDraft.clipNumber,
                  })}
                  className="mt-1.5 w-full resize-y rounded-xl border border-accent-ink/15 bg-white px-3.5 py-2 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor={`clip-draft-vo-${currentDraft.clipNumber}`}
                  className="block text-xs font-bold text-foreground"
                >
                  {t("brief.drafts.voLabel")}
                </label>
                <textarea
                  id={`clip-draft-vo-${currentDraft.clipNumber}`}
                  rows={3}
                  value={currentDraft.voDraft ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    updateCurrentDraft({ voDraft: event.target.value })
                  }
                  placeholder={t("brief.drafts.voPlaceholder", {
                    n: currentDraft.clipNumber,
                  })}
                  className="mt-1.5 w-full resize-y rounded-xl border border-accent-ink/15 bg-white px-3.5 py-2 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60"
                />
              </div>
            </div>

            {/* Structured Cartoon & Diagram Controls */}
            <div className="space-y-4 rounded-2xl border border-accent-ink/10 bg-white p-4">
              {/* 1. Diagram Layout Archetype */}
              <div>
                <p className="text-xs font-bold text-foreground">
                  {t("brief.drafts.diagramLayoutLabel")}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {diagramLayouts.map((opt) => {
                    const active = (currentDraft.diagramLayout ?? "auto") === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (opt.id === "auto") {
                            updateCurrentDraft({ diagramLayout: "auto" });
                          } else {
                            handleApplyAutoLayout({ diagramLayout: opt.id });
                          }
                        }}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-accent-ink bg-accent-ink text-lime"
                            : "border-accent-ink/15 bg-paper text-foreground hover:border-accent-ink/40"
                        } disabled:opacity-50`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Cartoon Character Position */}
              <div>
                <p className="text-xs font-bold text-foreground">
                  {t("brief.drafts.characterPositionLabel")}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {characterPositions.map((opt) => {
                    const active = (currentDraft.characterPosition ?? "auto") === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (opt.id === "auto") {
                            updateCurrentDraft({ characterPosition: "auto" });
                          } else {
                            handleApplyAutoLayout({ characterPosition: opt.id });
                          }
                        }}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-accent-ink bg-accent-ink text-lime"
                            : "border-accent-ink/15 bg-paper text-foreground hover:border-accent-ink/40"
                        } disabled:opacity-50`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Cartoon Character Action & Expression */}
              <div>
                <label
                  htmlFor={`clip-draft-char-action-${currentDraft.clipNumber}`}
                  className="block text-xs font-bold text-foreground"
                >
                  {t("brief.drafts.characterActionLabel")}
                </label>
                <input
                  id={`clip-draft-char-action-${currentDraft.clipNumber}`}
                  type="text"
                  value={currentDraft.characterAction ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    updateCurrentDraft({ characterAction: e.target.value })
                  }
                  placeholder={t("brief.drafts.characterActionPlaceholder")}
                  className="mt-1.5 w-full rounded-xl border border-accent-ink/15 bg-paper/40 px-3 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60"
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {actionPresets.map((preset) => {
                    const cleanPreset = preset.replace(/^[^\s]+\s+/, "");
                    const active = currentDraft.characterAction === cleanPreset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          updateCurrentDraft({ characterAction: cleanPreset })
                        }
                        className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                          active
                            ? "border-accent-ink bg-lime/40 font-bold text-accent-ink"
                            : "border-accent-ink/10 bg-paper text-muted hover:text-foreground"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Step-by-Step Cartoon Objects & Labels on Board */}
              <div>
                <p className="text-xs font-bold text-foreground">
                  {t("brief.drafts.visualNodesLabel")}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {t("brief.drafts.visualNodesHint")}
                </p>

                {(currentDraft.visualNodes?.length ?? 0) > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(currentDraft.visualNodes ?? []).map((node, nodeIdx) => (
                      <span
                        key={`${node}-${nodeIdx}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-accent-ink/20 bg-lime/25 px-3 py-1 text-xs font-semibold text-accent-ink"
                      >
                        <span className="rounded-full bg-accent-ink px-1.5 py-0.2 font-mono text-[10px] font-bold text-lime">
                          #{nodeIdx + 1}
                        </span>
                        <span>{node}</span>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleRemoveVisualNode(nodeIdx)}
                          className="ml-0.5 cursor-pointer text-accent-ink/60 hover:text-accent"
                          aria-label="Remove object"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newNodeInput}
                    disabled={
                      disabled ||
                      (currentDraft.visualNodes?.length ?? 0) >= MAX_VISUAL_NODES
                    }
                    onChange={(e) => setNewNodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddVisualNode();
                      }
                    }}
                    placeholder={t("brief.drafts.visualNodesInputPlaceholder")}
                    className="min-w-0 flex-1 rounded-xl border border-accent-ink/15 bg-paper/40 px-3 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={
                      disabled ||
                      !newNodeInput.trim() ||
                      (currentDraft.visualNodes?.length ?? 0) >= MAX_VISUAL_NODES
                    }
                    onClick={handleAddVisualNode}
                    className="shrink-0 cursor-pointer rounded-xl bg-accent-ink px-3.5 py-1.5 text-xs font-bold text-lime transition hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    {t("brief.drafts.visualNodesAddBtn")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent-ink/15 bg-paper/50 p-6 text-center">
          <p className="font-display text-sm font-bold text-foreground">
            {t("brief.drafts.emptyStateTitle")}
          </p>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted">
            {t("brief.drafts.emptyStateBody")}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={addClipDraft}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-4 py-2 text-xs font-bold text-lime shadow-[3px_3px_0_0_rgba(255,77,46,0.9)] transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {t("brief.drafts.addClip", { n: 1 })}
          </button>
        </div>
      )}
    </div>
  );
}
