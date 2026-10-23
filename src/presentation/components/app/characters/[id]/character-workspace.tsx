"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  addCharacterStyleAction,
  deleteCharacterPresetAction,
  editCharacterVersionAction,
  getCharacterAction,
  renameCharacterAction,
  retryCharacterVersionAction,
  saveCharacterPresetAction,
  type CharacterResult,
} from "@/presentation/actions/characters";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import { useCharacterPoll } from "@/presentation/components/app/characters/[id]/use-character-poll";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { BLUEPRINT_COST } from "@/service/production-plan";
import { DeleteCharacterDialog } from "@/presentation/components/app/characters/[id]/delete-character-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { localizedStyleName } from "@/util/style-i18n";
import { isStyleId, type StyleId } from "@/model/style-id";
import { CharacterPersonaPanel } from "@/presentation/components/app/characters/[id]/character-persona-panel";
import { CharacterStyleColumn } from "@/presentation/components/app/characters/[id]/character-style-column";
import { CharacterVoicePanel } from "@/presentation/components/app/characters/[id]/character-voice-panel";
import { CharacterVoiceSamplePanel } from "@/presentation/components/app/characters/[id]/character-voice-sample-panel";
import { VersionDetail } from "@/presentation/components/app/characters/[id]/version-detail";
import type { PlanId } from "@/model/subscription";
import { characterStyleLimit } from "@/service/character/style-limit";
import { isPlanId } from "@/service/billing/plans";

function styleLabel(styleId: string, styles: PublicStyle[]) {
  const style = styles.find((item) => item.id === styleId);
  if (style?.isCustom || !isStyleId(styleId)) return style?.name || styleId;
  return localizedStyleName(styleId as StyleId);
}

// Single-screen Studio workspace: top bar with Look / Voice tabs, zero full-page scrolling.
export function CharacterWorkspace({
  character: initial,
  credits,
  subscribed,
  planId,
  unlimitedStyles = false,
  styles,
}: {
  character: PublicCharacter;
  credits: number;
  subscribed: boolean;
  planId: PlanId | null;
  unlimitedStyles?: boolean;
  styles: PublicStyle[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [character, setCharacter] = useState(initial);
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"look" | "voice" | "persona">(
    initialTab === "voice" || initialTab === "persona" ? initialTab : "look",
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState(initial.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [creditGate, setCreditGate] = useState<{
    needed: number;
    resume: () => void;
  } | null>(null);
  const [paidSnap, setPaidSnap] = useState<{
    credits: number;
    subscribed: boolean;
    planId: PlanId | null;
  } | null>(null);
  const walletCredits = paidSnap?.credits ?? credits;
  const walletSubscribed = paidSnap?.subscribed ?? subscribed;
  const walletPlanId = paidSnap?.planId ?? planId;
  const styleLimit = unlimitedStyles ? null : characterStyleLimit(walletPlanId);

  useEffect(() => {
    let cancelled = false;
    void getCharacterAction(initial.id).then((result) => {
      if (cancelled) return;
      if (result.ok) setCharacter(result.character);
      else setError(translateAppError(result.error, t));
    });
    return () => {
      cancelled = true;
    };
  }, [initial.id, t]);

  const onPoll = useCallback((next: PublicCharacter) => setCharacter(next), []);
  const onPollError = useCallback(
    (message: string) => setError(translateAppError(message, t)),
    [t],
  );
  useCharacterPoll(character, onPoll, onPollError);

  const styleParam = searchParams.get("style");
  const activeStyleId =
    (styleParam && character.styleIds.includes(styleParam) && styleParam) ||
    character.styleIds[0] ||
    character.styleId;
  const styleVersions = character.versions.filter((version) => version.styleId === activeStyleId);
  const selected =
    styleVersions.find((version) => version.id === selectedVersionId) || styleVersions[0];

  function selectStyle(styleId: string) {
    setSelectedVersionId(null);
    router.replace(`${pathname}?style=${styleId}`);
  }

  function showAdded(next: PublicCharacter, styleId: string) {
    setCharacter(next);
    setSelectedVersionId(null);
    router.replace(`${pathname}?style=${styleId}`);
  }

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
        return;
      }
      setCharacter(result.character);
      return result.character;
    } catch {
      setError(t("errors.characterActionFailed"));
      setPending("");
      return undefined;
    }
  }

  async function onEdit(instruction: string) {
    if (!selected) return;
    const next = await run("edit", () =>
      editCharacterVersionAction(character.id, selected.id, instruction),
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

  function onRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === character.name) {
      setName(character.name);
      return;
    }
    void run("rename", () => renameCharacterAction(character.id, trimmed));
  }

  return (
    <div className="flex flex-col gap-3 md:h-[calc(100dvh-4.5rem)] md:overflow-hidden">
      {/* Compact Single-Row Studio Header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-accent-ink/10 bg-paper/90 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link
            href="/app/characters"
            className="shrink-0 text-xs font-semibold text-muted transition hover:text-foreground"
          >
            {t("characters.backToList")}
          </Link>
          <input
            type="text"
            value={name}
            maxLength={40}
            aria-label={t("characters.nameAria")}
            onChange={(event) => setName(event.target.value)}
            onBlur={onRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") (event.target as HTMLInputElement).blur();
            }}
            className="font-display w-44 rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-xl font-bold hover:border-accent-ink/15 focus-visible:border-accent-ink/30 focus-visible:outline-none sm:w-60"
          />
          <span className="rounded-full bg-accent-ink/8 px-2.5 py-0.5 text-xs font-medium text-muted">
            {character.styleIds.length > 1
              ? t("characters.styleCount", { n: character.styleIds.length })
              : styleLabel(character.styleIds[0] || character.styleId, styles)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Look vs Voice Studio Tab Switcher */}
          <div className="inline-flex rounded-full border border-accent-ink/15 bg-paper p-0.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "look"}
              onClick={() => setActiveTab("look")}
              className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-bold transition ${
                activeTab === "look"
                  ? "bg-accent-ink text-paper"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t("characters.outlookHeading")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "voice"}
              onClick={() => setActiveTab("voice")}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition ${
                activeTab === "voice"
                  ? "bg-accent-ink text-paper"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="7" y="2.5" width="6" height="9.5" rx="3" />
                <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0" />
                <path d="M10 15v2.5" />
                <path d="M7 17.5h6" />
              </svg>
              {t("characters.voiceTitle")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "persona"}
              onClick={() => setActiveTab("persona")}
              className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-bold transition ${
                activeTab === "persona"
                  ? "bg-accent-ink text-paper"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t("persona.title")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={pending !== ""}
            aria-label={t("characters.deleteCharacter")}
            title={t("characters.deleteCharacter")}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-red-600/30 bg-red-50/70 text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3.5 5.5h13" />
              <path d="M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" />
              <path d="M5.5 5.5l.7 10.1a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4l.7-10.1" />
              <path d="M8.5 9v4.5" />
              <path d="M11.5 9v4.5" />
            </svg>
          </button>
        </div>
      </header>

      {deleteOpen ? (
        <DeleteCharacterDialog character={character} onClose={() => setDeleteOpen(false)} />
      ) : null}

      {activeTab === "persona" ? (
        <section aria-label={t("persona.title")} className="min-h-0 flex-1 overflow-y-auto">
          <CharacterPersonaPanel character={character} onSaved={setCharacter} />
        </section>
      ) : activeTab === "look" ? (
        <section
          aria-label={t("characters.outlookHeading")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[10.5rem_minmax(0,1fr)] md:items-stretch">
            <CharacterStyleColumn
              character={character}
              styles={styles}
              styleLimit={styleLimit}
              activeStyleId={activeStyleId}
              onSelect={selectStyle}
              onAdded={showAdded}
              onNeedCredits={(styleId) => {
                setCreditGate({
                  needed: BLUEPRINT_COST,
                  resume: () => {
                    void addCharacterStyleAction(character.id, styleId).then((result) => {
                      if (result.ok) showAdded(result.character, styleId);
                      else setError(translateAppError(result.error, t));
                    });
                  },
                });
              }}
            />
            {selected ? (
              <VersionDetail
                key={selected.id}
                character={character}
                version={selected}
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
                  void run("retry", () => retryCharacterVersionAction(character.id, selected.id))
                }
              />
            ) : (
              <p className="text-sm text-muted">{t("characters.noVersions")}</p>
            )}
          </div>
        </section>
      ) : (
        <section
          aria-label={t("characters.voiceTitle")}
          className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-2 md:items-start"
        >
          <CharacterVoicePanel character={character} onSaved={setCharacter} />
          <div className="[&>div]:mt-0">
            <CharacterVoiceSamplePanel character={character} onSaved={setCharacter} />
          </div>
        </section>
      )}

      {creditGate ? (
        <InsufficientCreditsDialog
          needed={creditGate.needed}
          subscribed={walletSubscribed}
          onClose={() => setCreditGate(null)}
          onPaid={(snap) => {
            const rawPlan = snap.planId ?? undefined;
            setPaidSnap({
              credits: snap.credits,
              subscribed: snap.subscribed,
              planId: isPlanId(rawPlan) ? rawPlan : walletPlanId,
            });
            const resume = creditGate.resume;
            setCreditGate(null);
            resume();
          }}
        />
      ) : null}
    </div>
  );
}
