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
import { VersionDetail } from "@/presentation/components/app/characters/[id]/version-detail";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { BLUEPRINT_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { localizedStyleName } from "@/util/style-i18n";
import { isStyleId, type StyleId } from "@/model/style-id";

function styleLabel(styleId: string, styles: PublicStyle[]) {
  const style = styles.find((item) => item.id === styleId);
  if (style?.isCustom || !isStyleId(styleId)) return style?.name || styleId;
  return localizedStyleName(styleId as StyleId);
}

// Single-screen My Room studio: Left column selects AI Influencer; Right column updates & stores hair, top, pants, shoes, and fashion accessories.
export function RoomDesk({
  characters: initialCharacters,
  initialCharacterId,
  credits: initialCredits,
  subscribed: initialSubscribed,
  styles,
}: {
  characters: PublicCharacter[];
  initialCharacterId?: string;
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
}) {
  const { t } = useI18n();
  const [characters, setCharacters] = useState(initialCharacters);
  const first =
    characters.find((item) => item.id === initialCharacterId) || characters[0];
  const [selectedCharId, setSelectedCharId] = useState(first?.id || "");
  const [activeStyleId, setActiveStyleId] = useState<string>(
    first?.styleIds[0] || first?.styleId || "",
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [walletCredits, setWalletCredits] = useState(initialCredits);
  const [walletSubscribed, setWalletSubscribed] = useState(initialSubscribed);
  const [creditGate, setCreditGate] = useState<{
    needed: number;
    resume: () => void;
  } | null>(null);

  const character = useMemo(
    () => characters.find((item) => item.id === selectedCharId) || null,
    [characters, selectedCharId],
  );

  const updateCharacter = useCallback((next: PublicCharacter) => {
    setCharacters((prev) =>
      prev.map((item) => (item.id === next.id ? next : item)),
    );
  }, []);

  const activeCharId = character?.id;
  useEffect(() => {
    if (!activeCharId) return;
    let cancelled = false;
    void getCharacterAction(activeCharId).then((result) => {
      if (cancelled) return;
      if (result.ok) updateCharacter(result.character);
    });
    return () => {
      cancelled = true;
    };
  }, [activeCharId, updateCharacter]);

  const onPollError = useCallback(
    (message: string) => setError(translateAppError(message, t)),
    [t],
  );

  // Poll the currently selected character while any of its versions are generating.
  useCharacterPoll(
    character ?? initialCharacters[0]!,
    updateCharacter,
    onPollError,
  );

  function selectCharacter(id: string) {
    const next = characters.find((item) => item.id === id);
    setSelectedCharId(id);
    setActiveStyleId(next?.styleIds[0] || next?.styleId || "");
    setSelectedVersionId(null);
    setError("");
  }

  const currentStyleId =
    character &&
    activeStyleId &&
    character.styleIds.includes(activeStyleId)
      ? activeStyleId
      : character?.styleIds[0] || character?.styleId || "";

  const styleVersions = useMemo(
    () =>
      (character?.versions || []).filter(
        (ver) => ver.styleId === currentStyleId,
      ),
    [character?.versions, currentStyleId],
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
      updateCharacter(result.character);
      return result.character;
    } catch {
      setError(t("errors.characterActionFailed"));
      setPending("");
      return undefined;
    }
  }

  async function onEdit(instruction: string) {
    if (!character || !selectedVersion) return;
    const next = await run("edit", () =>
      editCharacterVersionAction(character.id, selectedVersion.id, instruction),
    );
    if (next) {
      setSelectedVersionId(null);
    }
  }

  async function onSavePreset(versionId: string, presetName: string) {
    if (!character) return false;
    const next = await run("save-preset", () =>
      saveCharacterPresetAction(character.id, versionId, presetName),
    );
    return Boolean(next);
  }

  function onDeletePreset(presetId: string) {
    if (!character) return;
    void run("delete-preset", () =>
      deleteCharacterPresetAction(character.id, presetId),
    );
  }

  if (!characters.length) {
    return (
      <div className="flex flex-col gap-3 lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-accent-ink/10 bg-paper/90 px-4 py-2.5">
          <div>
            <h1 className="font-display text-lg font-bold">
              {t("characters.roomTitle")}
            </h1>
            <p className="text-xs text-muted">{t("characters.roomSubtitle")}</p>
          </div>
          <Link
            href="/app/characters"
            className="inline-flex h-8 items-center rounded-full bg-accent-ink px-3.5 text-xs font-bold text-lime"
          >
            {t("characters.create")}
          </Link>
        </header>
        <div className="grid flex-1 place-items-center rounded-2xl border border-accent-ink/10 bg-paper/80 p-6">
          <p className="text-sm text-muted">{t("life.emptyCharacters")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-accent-ink/10 bg-paper/90 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-display text-lg font-bold">
            {t("characters.roomTitle")}
          </h1>
          <span className="hidden text-xs text-muted sm:inline">
            {t("characters.roomSubtitle")}
          </span>
        </div>

        {/* Style selector pills if the selected character has multiple styles */}
        {character && character.styleIds.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {character.styleIds.map((sId) => {
              const isSelected = sId === currentStyleId;
              return (
                <button
                  key={sId}
                  type="button"
                  onClick={() => {
                    setActiveStyleId(sId);
                    setSelectedVersionId(null);
                  }}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                    isSelected
                      ? "bg-accent-ink text-paper"
                      : "border border-accent-ink/15 bg-paper text-muted hover:text-foreground"
                  }`}
                >
                  {styleLabel(sId, styles)}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      {/* Main Layout: Left Character Rail + Right Wardrobe & Preset Studio */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-stretch">
        {/* Left Column: AI Influencer Selector */}
        <aside
          aria-label={t("life.character")}
          className="flex flex-col gap-2 overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/80 p-3"
        >
          <div className="flex shrink-0 items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
              {t("life.character")}
            </span>
            <span className="rounded-full bg-accent-ink/8 px-2 py-0.5 text-[10px] font-bold text-muted">
              {characters.length}
            </span>
          </div>
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
            {characters.map((item) => {
              const active = item.id === character?.id;
              const presetCount = (item.presets || []).length;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectCharacter(item.id)}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border p-2 text-left transition ${
                      active
                        ? "border-accent-ink bg-accent-ink text-paper shadow-[2px_2px_0_0_rgba(18,20,28,0.16)]"
                        : "border-accent-ink/10 bg-paper hover:border-accent-ink/30"
                    }`}
                  >
                    {item.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-lg border border-accent-ink/10 bg-white object-cover object-top"
                      />
                    ) : (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-zinc-200 text-xs text-muted">
                        —
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">
                        {item.name}
                      </span>
                      <span
                        className={`block truncate text-[10px] ${
                          active ? "text-paper/75" : "text-muted"
                        }`}
                      >
                        {t("brief.castPicker.availablePresetsTitle", {
                          n: presetCount,
                        })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right Column: Wardrobe & Presets Studio */}
        {character && selectedVersion ? (
          <VersionDetail
            key={selectedVersion.id}
            character={character}
            version={selectedVersion}
            styleVersions={styleVersions}
            credits={walletCredits}
            subscribed={walletSubscribed}
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
          <div className="grid place-items-center rounded-2xl border border-accent-ink/10 bg-paper/90 p-6">
            <p className="text-sm text-muted">{t("characters.noVersions")}</p>
          </div>
        )}
      </div>

      {creditGate ? (
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
      ) : null}
    </div>
  );
}
