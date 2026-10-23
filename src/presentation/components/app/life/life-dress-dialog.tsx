"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
import { RoomHistoryPanel } from "@/presentation/components/app/room/room-history-panel";
import { RoomPreviewPanel } from "@/presentation/components/app/room/room-preview-panel";
import { RoomWardrobePanel } from "@/presentation/components/app/room/room-wardrobe-panel";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { BLUEPRINT_COST, FRAME_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { localizedStyleName } from "@/util/style-i18n";
import { isStyleId, type StyleId } from "@/model/style-id";

type Workspace = Extract<Awaited<ReturnType<typeof loadCharacterWorkspaceAction>>, { ok: true }>;

function styleLabel(styleId: string, styles: PublicStyle[]) {
  const style = styles.find((item) => item.id === styleId);
  if (style?.isCustom || !isStyleId(styleId)) return style?.name || styleId;
  return localizedStyleName(styleId as StyleId);
}

// Large fitting-room dialog for the life page. Same wardrobe, preview, and preset history as My Room.
export function LifeDressDialog({
  characterId,
  initialVersionId,
  initialPresetId,
  onUpdated,
  onUseLook,
  onClose,
}: {
  characterId: string;
  initialVersionId: string | null;
  initialPresetId: string | null;
  onUpdated: (character: PublicCharacter) => void;
  onUseLook: (selection: { versionId: string; presetId?: string; thumbUrl: string | null }) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void loadCharacterWorkspaceAction(characterId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(translateAppError(result.error, t));
        return;
      }
      setWorkspace(result);
      onUpdated(result.character);
    });
    return () => {
      cancelled = true;
    };
  }, [characterId, onUpdated, t]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const dialogs = document.querySelectorAll("[role='dialog']");
      const top = dialogs[dialogs.length - 1];
      if (panelRef.current && top && top !== panelRef.current) return;
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/55 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex h-[min(92dvh,56rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-accent-ink/10 bg-[#fafafa] shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
      >
        {workspace ? (
          <LifeDressStudio
            titleId={titleId}
            workspace={workspace}
            initialVersionId={initialVersionId}
            initialPresetId={initialPresetId}
            onUpdated={onUpdated}
            onUseLook={onUseLook}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-accent-ink/10 bg-paper px-4 py-3">
              <h2 id={titleId} className="font-display text-lg font-bold">
                {t("characters.roomTitle")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="grid flex-1 place-items-center p-6">
              {loadError ? (
                <p className="text-sm font-semibold text-red-600">{loadError}</p>
              ) : (
                <Spinner className="h-6 w-6" />
              )}
            </div>
          </>
        )}
      </div>
    </DialogBackdrop>
  );
}

function LifeDressStudio({
  titleId,
  workspace,
  initialVersionId,
  initialPresetId,
  onUpdated,
  onUseLook,
  onClose,
}: {
  titleId: string;
  workspace: Workspace;
  initialVersionId: string | null;
  initialPresetId: string | null;
  onUpdated: (character: PublicCharacter) => void;
  onUseLook: (selection: { versionId: string; presetId?: string; thumbUrl: string | null }) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const seed = workspace.character.versions.find((version) => version.id === initialVersionId);
  const [character, setCharacter] = useState(workspace.character);
  const [activeStyleId, setActiveStyleId] = useState(
    seed?.styleId || workspace.character.styleIds[0] || workspace.character.styleId,
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(initialVersionId);
  const [credits, setCredits] = useState(workspace.credits);
  const [subscribed, setSubscribed] = useState(workspace.subscribed);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [creditGate, setCreditGate] = useState<{ needed: number; resume: () => void } | null>(null);

  const syncCharacter = useCallback(
    (next: PublicCharacter) => {
      setCharacter(next);
      onUpdated(next);
    },
    [onUpdated],
  );
  const onPollError = useCallback((message: string) => setError(translateAppError(message, t)), [t]);
  useCharacterPoll(character, syncCharacter, onPollError);

  const currentStyleId =
    activeStyleId && character.styleIds.includes(activeStyleId)
      ? activeStyleId
      : character.styleIds[0] || character.styleId;
  const styleVersions = useMemo(
    () => character.versions.filter((version) => version.styleId === currentStyleId),
    [character.versions, currentStyleId],
  );
  const version = styleVersions.find((item) => item.id === selectedVersionId) || styleVersions[0] || null;
  const cost = version?.blueprintKind === "board" ? BLUEPRINT_COST : FRAME_COST;

  async function run(key: string, action: () => Promise<CharacterResult>) {
    setPending(key);
    setError("");
    try {
      const result = await action();
      setPending("");
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) {
          setCreditGate({ needed: BLUEPRINT_COST, resume: () => void run(key, action) });
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
    if (!version) return;
    const next = await run("edit", () => editCharacterVersionAction(character.id, version.id, instruction));
    if (next) setSelectedVersionId(null);
  }

  function useCurrentLook() {
    if (!version || version.status !== "completed" || !version.blueprintUrl) return;
    const named = (character.presets || []).find(
      (preset) => preset.id === initialPresetId && preset.versionId === version.id,
    );
    const matchingPreset =
      named || (character.presets || []).find((preset) => preset.versionId === version.id);
    const thumb =
      version.portraitUrl || version.profileUrl || version.blueprintUrl || matchingPreset?.portraitUrl || null;
    onUseLook({
      versionId: version.id,
      ...(matchingPreset ? { presetId: matchingPreset.id } : {}),
      thumbUrl: matchingPreset?.portraitUrl || matchingPreset?.profileUrl || matchingPreset?.blueprintUrl || thumb,
    });
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-accent-ink/10 bg-paper px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h2 id={titleId} className="truncate font-display text-lg font-bold">
            {character.name} · {t("characters.roomTitle")}
          </h2>
          {character.styleIds.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {character.styleIds.map((styleId) => (
                <button
                  key={styleId}
                  type="button"
                  onClick={() => {
                    setActiveStyleId(styleId);
                    setSelectedVersionId(null);
                  }}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                    styleId === currentStyleId
                      ? "bg-accent-ink text-paper"
                      : "border border-accent-ink/15 bg-paper text-muted hover:text-foreground"
                  }`}
                >
                  {styleLabel(styleId, workspace.styles)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {version?.status === "completed" && version.blueprintUrl ? (
            <button
              type="button"
              onClick={useCurrentLook}
              className="inline-flex h-9 cursor-pointer items-center rounded-full bg-accent-ink px-4 text-xs font-bold text-lime transition hover:-translate-y-0.5"
            >
              {t("characters.roomSelectAndBack")}
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

      {version ? (
        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[16rem_minmax(0,1fr)_18rem] lg:overflow-hidden">
          <RoomWardrobePanel
            key={version.id}
            version={version}
            cost={cost}
            credits={credits}
            subscribed={subscribed}
            pending={pending}
            onEdit={(instruction) => void onEdit(instruction)}
          />
          <RoomPreviewPanel
            character={character}
            version={version}
            cost={cost}
            pending={pending}
            error={error}
            onRetry={() => void run("retry", () => retryCharacterVersionAction(character.id, version.id))}
          />
          <RoomHistoryPanel
            character={character}
            activeVersion={version}
            styleVersions={styleVersions}
            pending={pending}
            onSelectVersion={setSelectedVersionId}
            onSavePreset={async (versionId, name) =>
              Boolean(await run("save-preset", () => saveCharacterPresetAction(character.id, versionId, name)))
            }
            onDeletePreset={(presetId) =>
              void run("delete-preset", () => deleteCharacterPresetAction(character.id, presetId))
            }
          />
        </div>
      ) : (
        <div className="grid flex-1 place-items-center p-6">
          <p className="text-sm text-muted">{t("characters.noVersions")}</p>
        </div>
      )}

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
    </>
  );
}
