"use client";

import { useEffect, useId, useState } from "react";
import { CharacterHistoryDialog } from "@/presentation/components/app/characters/[id]/character-history-dialog";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
} from "@/presentation/serialize";

// Bar of saved presets and a History button (opening the paged history dialog), plus a Save Preset modal.
export function CharacterPresetsBar({
  character,
  activeVersion,
  styleVersions,
  pending,
  onSelectVersion,
  onSavePreset,
  onDeletePreset,
}: {
  character: PublicCharacter;
  activeVersion: PublicCharacterVersion;
  styleVersions: PublicCharacterVersion[];
  pending: string;
  onSelectVersion: (versionId: string) => void;
  onSavePreset: (versionId: string, name: string) => Promise<boolean>;
  onDeletePreset: (presetId: string) => void;
}) {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const stylePresets = (character.presets || []).filter(
    (preset) => preset.styleId === activeVersion.styleId,
  );
  const canSavePreset =
    activeVersion.status === "completed" && Boolean(activeVersion.blueprintUrl);

  return (
    <div className="mt-2.5 flex shrink-0 flex-col gap-2 rounded-xl border border-accent-ink/10 bg-paper/70 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            {t("characters.presetsHeading")}
          </span>
          {stylePresets.length === 0 ? (
            <span className="truncate text-xs text-muted">
              {t("characters.presetsEmpty")}
            </span>
          ) : (
            stylePresets.map((preset) => (
              <PresetChip
                key={preset.id}
                preset={preset}
                selected={preset.versionId === activeVersion.id}
                disabled={pending !== ""}
                onSelect={() => onSelectVersion(preset.versionId)}
                onDelete={() => onDeletePreset(preset.id)}
              />
            ))
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/20 bg-paper px-3 text-xs font-bold text-foreground transition hover:border-accent-ink"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4.8v3.4l2.3 1.4" strokeLinecap="round" />
            </svg>
            <span>
              {t("characters.historyButton", { n: styleVersions.length })}
            </span>
          </button>

          {canSavePreset ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={pending !== ""}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-accent-ink bg-accent-ink px-3 text-xs font-bold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>+</span>
              <span>{t("characters.savePresetButton")}</span>
            </button>
          ) : null}
        </div>
      </div>

      {historyOpen ? (
        <CharacterHistoryDialog
          character={character}
          activeVersion={activeVersion}
          styleVersions={styleVersions}
          pending={pending}
          onSelectVersion={onSelectVersion}
          onSavePreset={onSavePreset}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}

      {dialogOpen ? (
        <SaveCharacterPresetDialog
          defaultSuggestion={activeVersion.editInstruction || ""}
          saving={pending === "save-preset"}
          onClose={() => setDialogOpen(false)}
          onSubmit={async (name) => {
            const ok = await onSavePreset(activeVersion.id, name);
            if (ok) setDialogOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

// Single clickable preset pill with thumbnail and delete button.
function PresetChip({
  preset,
  selected,
  disabled,
  onSelect,
  onDelete,
}: {
  preset: PublicCharacterPreset;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const thumb = preset.portraitUrl || preset.profileUrl || preset.blueprintUrl;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border pl-1 pr-1.5 py-0.5 text-xs transition ${
        selected
          ? "border-accent-ink bg-accent-ink text-paper shadow-[2px_2px_0_0_rgba(18,20,28,0.18)]"
          : "border-accent-ink/15 bg-paper text-foreground hover:border-accent-ink/40"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="inline-flex cursor-pointer items-center gap-1.5 text-left"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-5 w-5 rounded-full object-cover object-top"
          />
        ) : null}
        <span className="max-w-36 truncate font-semibold">{preset.name}</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        aria-label={t("characters.deletePresetAria", { name: preset.name })}
        className={`ml-0.5 grid h-4 w-4 cursor-pointer place-items-center rounded-full text-[11px] leading-none transition ${
          selected
            ? "text-paper/75 hover:bg-paper/20 hover:text-paper"
            : "text-muted hover:bg-accent-ink/10 hover:text-foreground"
        } disabled:opacity-50`}
      >
        ×
      </button>
    </div>
  );
}

// Modal dialog to name and save the current blueprint version as a preset.
function SaveCharacterPresetDialog({
  defaultSuggestion,
  saving,
  onClose,
  onSubmit,
}: {
  defaultSuggestion: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [name, setName] = useState(defaultSuggestion.slice(0, 60));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    void onSubmit(trimmed);
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/45 p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border-2 border-accent-ink bg-paper p-5 shadow-[6px_6px_0_0_#12141c]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id={titleId} className="font-display text-lg font-bold">
              {t("characters.savePresetTitle")}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {t("characters.savePresetHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-xs font-bold text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          value={name}
          maxLength={60}
          autoFocus
          required
          placeholder={t("characters.savePresetPlaceholder")}
          onChange={(event) => setName(event.target.value)}
          className="mt-4 h-10 w-full rounded-xl border border-accent-ink/20 bg-white px-3.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 cursor-pointer items-center rounded-full border border-accent-ink/15 px-4 text-xs font-semibold text-muted hover:text-foreground"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-4 text-xs font-bold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Spinner className="h-3.5 w-3.5" /> : null}
            {saving
              ? t("characters.savePresetSaving")
              : t("characters.savePresetSubmit")}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}
