"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  deleteCharacterPresetAction,
  editCharacterVersionAction,
  loadCharacterWorkspaceAction,
  retryCharacterVersionAction,
  saveCharacterPresetAction,
  type CharacterResult,
} from "@/presentation/actions/characters";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { useCharacterPoll } from "@/presentation/components/app/characters/[id]/use-character-poll";
import { VersionDetail } from "@/presentation/components/app/characters/[id]/version-detail";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter } from "@/presentation/serialize";
import { isCreditGateError } from "@/service/billing/credit-gate";
import type { CharacterPresetSelection } from "@/service/character/character-presets";
import { BLUEPRINT_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Large modal dialog opened from CharacterSelectDialog ("Manage") so the user can change clothes,
// test/generate a new look, or pick/save a preset without leaving the video creation page.
export function CharacterManageDialog({
  character: initialCharacter,
  styleId,
  initialSelection,
  onCharacterUpdated,
  onSelectAndClose,
  onClose,
}: {
  character: PublicCharacter;
  styleId?: string;
  initialSelection?: CharacterPresetSelection;
  onCharacterUpdated: (next: PublicCharacter) => void;
  onSelectAndClose: (selection: CharacterPresetSelection) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [character, setCharacter] = useState<PublicCharacter>(initialCharacter);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    initialSelection?.versionId ?? null,
  );
  const [credits, setCredits] = useState(100);
  const [subscribed, setSubscribed] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [creditGate, setCreditGate] = useState<{
    needed: number;
    resume: () => void;
  } | null>(null);

  const syncCharacter = useCallback(
    (next: PublicCharacter) => {
      setCharacter(next);
      onCharacterUpdated(next);
    },
    [onCharacterUpdated],
  );

  useEffect(() => {
    let cancelled = false;
    void loadCharacterWorkspaceAction(initialCharacter.id).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        syncCharacter(res.character);
        setCredits(res.credits);
        setSubscribed(res.subscribed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialCharacter.id, syncCharacter]);

  const onPollError = useCallback(
    (message: string) => setError(translateAppError(message, t)),
    [t],
  );
  useCharacterPoll(character, syncCharacter, onPollError);

  const activeStyleId =
    (styleId && character.styleIds.includes(styleId) && styleId) ||
    character.styleIds[0] ||
    character.styleId;

  const styleVersions = useMemo(
    () =>
      character.versions.filter((ver) => ver.styleId === activeStyleId),
    [character.versions, activeStyleId],
  );

  const selectedVersion =
    styleVersions.find((ver) => ver.id === selectedVersionId) ||
    styleVersions[0] ||
    null;

  async function run(key: string, action: () => Promise<CharacterResult>) {
    setPending(key);
    setError("");
    try {
      const result = await action();
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) {
          setCreditGate({
            needed: BLUEPRINT_COST,
            resume: () => {
              void run(key, action);
            },
          });
        }
        return undefined;
      }
      syncCharacter(result.character);
      return result.character;
    } catch {
      setError(t("errors.characterActionFailed"));
      setPending("");
      return undefined;
    }
  }

  async function onEdit(instruction: string) {
    if (!selectedVersion) return;
    const next = await run("edit", () =>
      editCharacterVersionAction(character.id, selectedVersion.id, instruction),
    );
    if (next) {
      setSelectedVersionId(null);
    }
  }

  async function onSavePreset(versionId: string, presetName: string) {
    const next = await run("save-preset", () =>
      saveCharacterPresetAction(character.id, versionId, presetName),
    );
    return Boolean(next);
  }

  function onDeletePreset(presetId: string) {
    void run("delete-preset", () =>
      deleteCharacterPresetAction(character.id, presetId),
    );
  }

  function handleSelectCurrentAndBack() {
    if (!selectedVersion) {
      onClose();
      return;
    }
    const matchingPreset = (character.presets || []).find(
      (preset) => preset.versionId === selectedVersion.id,
    );
    onSelectAndClose({
      versionId: selectedVersion.id,
      ...(matchingPreset
        ? { presetId: matchingPreset.id, presetName: matchingPreset.name }
        : {}),
    });
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/55 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper shadow-[8px_8px_0_0_#12141c]"
      >
        {/* Top Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-accent-ink/10 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 cursor-pointer items-center rounded-full border border-accent-ink/15 bg-white px-3 text-xs font-semibold text-muted transition hover:text-foreground"
            >
              {t("characters.backToList")}
            </button>
            <h2 id={titleId} className="font-display text-lg font-bold">
              {character.name} · {t("characters.roomTitle")}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {selectedVersion?.status === "completed" &&
            Boolean(selectedVersion.blueprintUrl) ? (
              <button
                type="button"
                onClick={handleSelectCurrentAndBack}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-4 text-xs font-bold text-lime transition hover:-translate-y-0.5"
              >
                ✓ {t("characters.roomSelectAndBack")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Wardrobe & Preset Editor Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {selectedVersion ? (
            <VersionDetail
              key={selectedVersion.id}
              character={character}
              version={selectedVersion}
              styleVersions={styleVersions}
              credits={credits}
              subscribed={subscribed}
              pending={pending}
              error={error}
              onSelectVersion={setSelectedVersionId}
              onSavePreset={onSavePreset}
              onDeletePreset={onDeletePreset}
              onEdit={(instruction) => void onEdit(instruction)}
              onRetry={() =>
                void run("retry", () =>
                  retryCharacterVersionAction(character.id, selectedVersion.id),
                )
              }
            />
          ) : (
            <p className="p-6 text-center text-sm text-muted">
              {t("characters.noVersions")}
            </p>
          )}
        </div>

        {creditGate ? (
          <InsufficientCreditsDialog
            needed={creditGate.needed}
            subscribed={subscribed}
            onClose={() => setCreditGate(null)}
            onPaid={(snap) => {
              setCredits(snap.credits);
              setSubscribed(snap.subscribed);
              const resume = creditGate.resume;
              setCreditGate(null);
              resume();
            }}
          />
        ) : null}
      </div>
    </DialogBackdrop>
  );
}
