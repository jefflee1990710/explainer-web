"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteCharacterPresetAction,
  editCharacterVersionAction,
  getCharacterAction,
  retryCharacterVersionAction,
  saveCharacterPresetAction,
  type CharacterResult,
} from "@/presentation/actions/characters";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { useCharacterPoll } from "@/presentation/components/app/characters/[id]/use-character-poll";
import { RoomCharacterSwitcher } from "@/presentation/components/app/room/room-character-switcher";
import { RoomColumns } from "@/presentation/components/app/room/room-columns";
import { RoomHistoryPanel } from "@/presentation/components/app/room/room-history-panel";
import { RoomPreviewPanel } from "@/presentation/components/app/room/room-preview-panel";
import { RoomWardrobePanel } from "@/presentation/components/app/room/room-wardrobe-panel";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { BLUEPRINT_COST, FRAME_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { localizedStyleName } from "@/util/style-i18n";
import { isStyleId, type StyleId } from "@/model/style-id";

function styleLabel(styleId: string, styles: PublicStyle[]) {
  const style = styles.find((item) => item.id === styleId);
  if (style?.isCustom || !isStyleId(styleId)) return style?.name || styleId;
  return localizedStyleName(styleId as StyleId);
}

// Fitting room for one character (/app/room/[characterId]).
// Left: wardrobe pickers and Generate. Center: face + full-body preview. Right: presets and recent history.
export function RoomDesk({
  characters: initialCharacters,
  characterId,
  credits: initialCredits,
  subscribed: initialSubscribed,
  styles,
}: {
  characters: PublicCharacter[];
  characterId: string;
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
}) {
  const { t } = useI18n();
  const [characters, setCharacters] = useState(initialCharacters);
  const character = characters.find((item) => item.id === characterId) || null;
  const [activeStyleId, setActiveStyleId] = useState<string>(
    character?.styleIds[0] || character?.styleId || "",
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [walletCredits, setWalletCredits] = useState(initialCredits);
  const [walletSubscribed, setWalletSubscribed] = useState(initialSubscribed);
  const [creditGate, setCreditGate] = useState<{ needed: number; resume: () => void } | null>(null);

  const updateCharacter = useCallback((next: PublicCharacter) => {
    setCharacters((prev) => prev.map((item) => (item.id === next.id ? next : item)));
  }, []);

  // Refresh the opened character once so presets and versions are current.
  useEffect(() => {
    if (!characterId) return;
    let cancelled = false;
    void getCharacterAction(characterId).then((result) => {
      if (!cancelled && result.ok) updateCharacter(result.character);
    });
    return () => {
      cancelled = true;
    };
  }, [characterId, updateCharacter]);

  const onPollError = useCallback((message: string) => setError(translateAppError(message, t)), [t]);

  if (!character) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--studio-line)] px-3 py-2">
          <div>
            <h1 className="font-display text-lg font-bold">{t("characters.roomTitle")}</h1>
            <p className="text-xs text-muted">{t("characters.roomSubtitle")}</p>
          </div>
          <Link
            href="/app/characters"
            className="inline-flex h-8 items-center rounded-full bg-accent-ink px-3.5 text-xs font-bold text-lime"
          >
            {t("characters.create")}
          </Link>
        </header>
        <div className="grid min-h-0 flex-1 place-items-center p-6">
          <p className="text-sm text-muted">{t("life.emptyCharacters")}</p>
        </div>
      </div>
    );
  }

  return (
    <RoomStudio
      characters={characters}
      character={character}
      styles={styles}
      activeStyleId={activeStyleId}
      onStyleChange={(id) => {
        setActiveStyleId(id);
        setSelectedVersionId(null);
      }}
      selectedVersionId={selectedVersionId}
      onSelectVersion={setSelectedVersionId}
      pending={pending}
      error={error}
      credits={walletCredits}
      subscribed={walletSubscribed}
      onPollUpdate={updateCharacter}
      onPollError={onPollError}
      run={run}
      creditGate={
        creditGate ? (
          <InsufficientCreditsDialog
            needed={creditGate.needed}
            subscribed={walletSubscribed}
            onClose={() => setCreditGate(null)}
            onPaid={(snap) => {
              setWalletCredits(snap.credits);
              setWalletSubscribed(snap.subscribed);
              const resume = creditGate.resume;
              setCreditGate(null);
              resume();
            }}
          />
        ) : null
      }
    />
  );

  // Runs one character action, tracking pending state and opening the credit gate when short.
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
      updateCharacter(result.character);
      return result.character;
    } catch {
      setError(t("errors.characterActionFailed"));
      setPending("");
      return undefined;
    }
  }
}

// Three-column studio for a resolved character. Split out so the poll hook always has a character.
function RoomStudio({
  characters,
  character,
  styles,
  activeStyleId,
  onStyleChange,
  selectedVersionId,
  onSelectVersion,
  pending,
  error,
  credits,
  subscribed,
  onPollUpdate,
  onPollError,
  run,
  creditGate,
}: {
  characters: PublicCharacter[];
  character: PublicCharacter;
  styles: PublicStyle[];
  activeStyleId: string;
  onStyleChange: (styleId: string) => void;
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string | null) => void;
  pending: string;
  error: string;
  credits: number;
  subscribed: boolean;
  onPollUpdate: (next: PublicCharacter) => void;
  onPollError: (message: string) => void;
  run: (key: string, action: () => Promise<CharacterResult>) => Promise<PublicCharacter | undefined>;
  creditGate: React.ReactNode;
}) {
  const { t } = useI18n();
  useCharacterPoll(character, onPollUpdate, onPollError);

  const currentStyleId =
    activeStyleId && character.styleIds.includes(activeStyleId)
      ? activeStyleId
      : character.styleIds[0] || character.styleId;
  const styleVersions = useMemo(
    () => character.versions.filter((ver) => ver.styleId === currentStyleId),
    [character.versions, currentStyleId],
  );
  const version = styleVersions.find((ver) => ver.id === selectedVersionId) || styleVersions[0] || null;
  const cost = version?.blueprintKind === "board" ? BLUEPRINT_COST : FRAME_COST;

  async function onEdit(instruction: string) {
    if (!version) return;
    const next = await run("edit", () => editCharacterVersionAction(character.id, version.id, instruction));
    if (next) onSelectVersion(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--studio-line)] px-3 py-2">
        <RoomCharacterSwitcher characters={characters} current={character} />
        {character.styleIds.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {character.styleIds.map((styleId) => (
              <button
                key={styleId}
                type="button"
                onClick={() => onStyleChange(styleId)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                  styleId === currentStyleId
                    ? "bg-accent-ink text-paper"
                    : "border border-accent-ink/15 bg-paper text-muted hover:text-foreground"
                }`}
              >
                {styleLabel(styleId, styles)}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {version ? (
        <RoomColumns
          left={
            <RoomWardrobePanel
              key={version.id}
              version={version}
              cost={cost}
              credits={credits}
              subscribed={subscribed}
              pending={pending}
              onEdit={(instruction) => void onEdit(instruction)}
            />
          }
          center={
            <RoomPreviewPanel
              character={character}
              version={version}
              cost={cost}
              pending={pending}
              error={error}
              onRetry={() => void run("retry", () => retryCharacterVersionAction(character.id, version.id))}
            />
          }
          right={
            <RoomHistoryPanel
              character={character}
              activeVersion={version}
              styleVersions={styleVersions}
              pending={pending}
              onSelectVersion={onSelectVersion}
              onSavePreset={async (versionId, name) =>
                Boolean(await run("save-preset", () => saveCharacterPresetAction(character.id, versionId, name)))
              }
              onDeletePreset={(presetId) =>
                void run("delete-preset", () => deleteCharacterPresetAction(character.id, presetId))
              }
            />
          }
        />
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center p-6">
          <p className="text-sm text-muted">{t("characters.noVersions")}</p>
        </div>
      )}

      {creditGate}
    </div>
  );
}
