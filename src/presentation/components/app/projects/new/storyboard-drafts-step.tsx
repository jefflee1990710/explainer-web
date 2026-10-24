"use client";

import { useState } from "react";
import type { AspectRatio, StoryboardClipDraft, VoLanguage } from "@/model/project";
import { StoryboardDraftChatPanel } from "@/presentation/components/app/projects/new/storyboard-draft-chat-panel";
import { StoryboardSketchPad } from "@/presentation/components/app/projects/new/storyboard-sketch-pad";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MAX_CLIP_DRAFTS } from "@/service/director/storyboard-draft-chat";

// Step 04 of the create-video wizard: optional multi-clip sketchpad + explanations on the left,
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
  onChange: (next: StoryboardClipDraft[]) => void;
}) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex =
    drafts.length === 0 ? 0 : Math.min(activeIndex, drafts.length - 1);
  const currentDraft = drafts[safeIndex] ?? null;

  // Add a new empty clip draft and switch to it.
  function addClipDraft() {
    if (drafts.length >= MAX_CLIP_DRAFTS || disabled) return;
    const nextNumber = drafts.length + 1;
    const next: StoryboardClipDraft[] = [
      ...drafts,
      { clipNumber: nextNumber, explanation: "", voDraft: "" },
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

  // Update one field on the active clip draft.
  function updateCurrentDraft(patch: Partial<StoryboardClipDraft>) {
    if (!currentDraft) return;
    const next = drafts.map((item, idx) =>
      idx === safeIndex ? { ...item, ...patch } : item,
    );
    onChange(next);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_440px] lg:items-stretch">
      <div className="flex min-w-0 flex-col space-y-4 rounded-2xl border border-accent-ink/12 bg-white p-5 shadow-[0_2px_10px_rgba(18,20,28,0.03)] sm:p-6">
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

        {/* Clip tabs + Add Clip button */}
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
            <div className="space-y-4 rounded-2xl border border-accent-ink/15 bg-paper/70 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold">
                  {t("brief.drafts.clipTab", { n: currentDraft.clipNumber })}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeClipDraft(safeIndex)}
                  className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold text-muted transition hover:bg-accent/10 hover:text-accent"
                >
                  {t("brief.drafts.removeClip", { n: currentDraft.clipNumber })}
                </button>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-start">
                {/* Remount sketchpad when switching clips or aspect ratio so each clip has its own clean canvas */}
                <StoryboardSketchPad
                  key={`sketch-clip-${currentDraft.clipNumber}-${aspectRatio}`}
                  clipNumber={currentDraft.clipNumber}
                  aspectRatio={aspectRatio}
                  sketchUrl={currentDraft.sketchUrl}
                  disabled={disabled}
                  onSketchChange={(dataUrl) =>
                    updateCurrentDraft({ sketchUrl: dataUrl })
                  }
                />

                <div className="space-y-4">
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
                      rows={5}
                      value={currentDraft.explanation}
                      disabled={disabled}
                      onChange={(event) =>
                        updateCurrentDraft({ explanation: event.target.value })
                      }
                      placeholder={t("brief.drafts.explanationPlaceholder", {
                        n: currentDraft.clipNumber,
                      })}
                      className="mt-1.5 w-full resize-y rounded-xl border border-accent-ink/15 bg-white px-3.5 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
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
                      className="mt-1.5 w-full resize-y rounded-xl border border-accent-ink/15 bg-white px-3.5 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent-ink/15 bg-paper/50 p-6 text-center">
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

      {/* Right column: AI Storyboard Draft Chatroom */}
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
    </div>
  );
}
