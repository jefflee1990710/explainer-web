"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
} from "@/presentation/serialize";

export const HISTORY_PAGE_SIZE = 4;

export function paginateHistoryVersions<T>(
  items: readonly T[],
  page: number,
  pageSize = HISTORY_PAGE_SIZE,
): {
  items: T[];
  page: number;
  totalPages: number;
} {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: clamped,
    totalPages,
  };
}

// Modal dialog showing all blueprint history for the active style with paging and per-item preset saving.
export function CharacterHistoryDialog({
  character,
  activeVersion,
  styleVersions,
  pending,
  onSelectVersion,
  onSavePreset,
  onClose,
}: {
  character: PublicCharacter;
  activeVersion: PublicCharacterVersion;
  styleVersions: PublicCharacterVersion[];
  pending: string;
  onSelectVersion: (versionId: string) => void;
  onSavePreset: (versionId: string, name: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const [page, setPage] = useState(1);
  const [savingVersionId, setSavingVersionId] = useState<string | null>(null);
  const [presetDraftName, setPresetDraftName] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const orderedVersions = useMemo(
    () =>
      [...styleVersions].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [styleVersions],
  );

  const paged = useMemo(
    () => paginateHistoryVersions(orderedVersions, page, HISTORY_PAGE_SIZE),
    [orderedVersions, page],
  );

  const presetsByVersion = useMemo(() => {
    const map = new Map<string, PublicCharacterPreset[]>();
    for (const preset of character.presets || []) {
      const list = map.get(preset.versionId) || [];
      list.push(preset);
      map.set(preset.versionId, list);
    }
    return map;
  }, [character.presets]);

  function openSaveForVersion(version: PublicCharacterVersion) {
    setSavingVersionId(version.id);
    setPresetDraftName((version.editInstruction || "").slice(0, 60));
  }

  async function submitSavePreset(
    event: React.FormEvent<HTMLFormElement>,
    versionId: string,
  ) {
    event.preventDefault();
    const trimmed = presetDraftName.trim();
    if (!trimmed || pending === "save-preset") return;
    const ok = await onSavePreset(versionId, trimmed);
    if (ok) {
      setSavingVersionId(null);
      setPresetDraftName("");
    }
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper shadow-[8px_8px_0_0_#12141c]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {t("characters.historyTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {t("characters.historySubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Paged History Items */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {paged.items.map((ver) => {
            const isCurrent = ver.id === activeVersion.id;
            const isDefault = character.defaultByStyle[ver.styleId] === ver.id;
            const verPresets = presetsByVersion.get(ver.id) || [];
            const thumb =
              ver.portraitUrl || ver.profileUrl || ver.blueprintUrl || "";
            const canSave =
              ver.status === "completed" && Boolean(ver.blueprintUrl);
            const busy =
              ver.status === "queued" || ver.status === "in_progress";
            const isEditingPreset = savingVersionId === ver.id;

            return (
              <div
                key={ver.id}
                className={`rounded-2xl border p-3.5 transition ${
                  isCurrent
                    ? "border-accent-ink bg-accent-ink/[0.04] shadow-[3px_3px_0_0_rgba(18,20,28,0.12)]"
                    : "border-accent-ink/15 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start gap-3.5">
                  {/* Thumbnail */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVersion(ver.id);
                      onClose();
                    }}
                    className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-accent-ink/10 bg-zinc-100"
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-xs text-muted">
                        {busy ? <Spinner className="h-4 w-4" /> : "—"}
                      </span>
                    )}
                  </button>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-muted">
                        {new Date(ver.createdAt).toLocaleString(locale)}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-full bg-accent-ink px-2 py-0.5 text-[10px] font-bold text-paper">
                          {t("characters.historyActiveBadge")}
                        </span>
                      ) : null}
                      {isDefault ? (
                        <span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold text-accent-ink">
                          {t("characters.defaultBadge")}
                        </span>
                      ) : null}
                      {verPresets.map((preset) => (
                        <span
                          key={preset.id}
                          className="rounded-full border border-accent-ink/20 bg-paper px-2 py-0.5 text-[10px] font-bold text-foreground"
                        >
                          ★ {preset.name}
                        </span>
                      ))}
                    </div>

                    <p className="mt-1.5 line-clamp-2 text-xs font-medium text-foreground">
                      {ver.editInstruction?.trim() ||
                        t("characters.versionOriginal")}
                    </p>

                    {/* Actions */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVersion(ver.id);
                          onClose();
                        }}
                        className={`inline-flex h-7 cursor-pointer items-center rounded-full px-3 text-xs font-bold transition ${
                          isCurrent
                            ? "border border-accent-ink/20 bg-paper text-foreground"
                            : "bg-accent-ink text-paper hover:opacity-90"
                        }`}
                      >
                        {t("characters.historyUseButton")}
                      </button>

                      {canSave ? (
                        <button
                          type="button"
                          disabled={pending !== ""}
                          onClick={() =>
                            isEditingPreset
                              ? setSavingVersionId(null)
                              : openSaveForVersion(ver)
                          }
                          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-accent-ink/25 bg-paper px-3 text-xs font-bold text-foreground transition hover:border-accent-ink disabled:opacity-50"
                        >
                          <span>+</span>
                          <span>{t("characters.savePresetButton")}</span>
                        </button>
                      ) : null}
                    </div>

                    {/* Inline Save Preset Form for this History Item */}
                    {isEditingPreset ? (
                      <form
                        onSubmit={(e) => void submitSavePreset(e, ver.id)}
                        className="mt-2.5 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={presetDraftName}
                          maxLength={60}
                          autoFocus
                          required
                          placeholder={t("characters.savePresetPlaceholder")}
                          onChange={(event) =>
                            setPresetDraftName(event.target.value)
                          }
                          className="h-8 min-w-0 flex-1 rounded-full border border-accent-ink/25 bg-paper px-3 text-xs focus-visible:outline-2 focus-visible:outline-accent"
                        />
                        <button
                          type="submit"
                          disabled={
                            !presetDraftName.trim() || pending === "save-preset"
                          }
                          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-accent-ink px-3.5 text-xs font-bold text-lime disabled:opacity-50"
                        >
                          {pending === "save-preset" ? (
                            <Spinner className="h-3 w-3" />
                          ) : null}
                          {t("characters.savePresetSubmit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSavingVersionId(null)}
                          className="inline-flex h-8 cursor-pointer items-center rounded-full border border-accent-ink/15 px-2.5 text-xs font-semibold text-muted hover:text-foreground"
                        >
                          {t("common.cancel")}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Pagination */}
        <div className="flex shrink-0 items-center justify-between border-t border-accent-ink/10 bg-paper px-6 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={paged.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 cursor-pointer items-center rounded-full border border-accent-ink/20 bg-white px-3 text-xs font-semibold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("characters.historyPrevPage")}
            </button>
            <span className="px-2 text-xs font-semibold text-muted">
              {t("characters.historyPageLabel", {
                page: paged.page,
                total: paged.totalPages,
              })}
            </span>
            <button
              type="button"
              disabled={paged.page >= paged.totalPages}
              onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
              className="inline-flex h-8 cursor-pointer items-center rounded-full border border-accent-ink/20 bg-white px-3 text-xs font-semibold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("characters.historyNextPage")}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 cursor-pointer items-center rounded-full bg-accent-ink px-4 text-xs font-bold text-paper"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
