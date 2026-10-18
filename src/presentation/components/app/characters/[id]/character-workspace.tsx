"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  addCharacterStyleAction,
  editCharacterVersionAction,
  getCharacterAction,
  renameCharacterAction,
  retryCharacterVersionAction,
  setDefaultVersionAction,
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
import { CharacterStyleColumn } from "@/presentation/components/app/characters/[id]/character-style-column";
import { CharacterVoicePanel } from "@/presentation/components/app/characters/[id]/character-voice-panel";
import { CharacterVoiceSamplePanel } from "@/presentation/components/app/characters/[id]/character-voice-sample-panel";
import { VersionDetail } from "@/presentation/components/app/characters/[id]/version-detail";
import { VersionList } from "@/presentation/components/app/characters/[id]/version-list";
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
  const [activeTab, setActiveTab] = useState<"look" | "voice">("look");
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

  const versionParam = searchParams.get("version");
  const styleParam = searchParams.get("style");
  const requestedVersion = character.versions.find((version) => version.id === versionParam);
  const activeStyleId =
    (styleParam && character.styleIds.includes(styleParam) && styleParam) ||
    requestedVersion?.styleId ||
    character.styleIds[0] ||
    character.styleId;
  const styleVersions = character.versions.filter((version) => version.styleId === activeStyleId);
  const selected =
    styleVersions.find((version) => version.id === versionParam) ||
    styleVersions.find((version) => version.id === character.defaultByStyle[activeStyleId]) ||
    styleVersions[0];

  function select(id: string) {
    router.replace(`${pathname}?style=${activeStyleId}&version=${id}`);
  }

  function selectStyle(styleId: string) {
    const versions = character.versions.filter((version) => version.styleId === styleId);
    const next =
      versions.find((version) => version.id === character.defaultByStyle[styleId]) || versions[0];
    router.replace(`${pathname}?style=${styleId}${next ? `&version=${next.id}` : ""}`);
  }

  function showAdded(next: PublicCharacter, styleId: string) {
    setCharacter(next);
    const versions = next.versions.filter((version) => version.styleId === styleId);
    const added = versions[0];
    router.replace(`${pathname}?style=${styleId}${added ? `&version=${added.id}` : ""}`);
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
    if (next) select(next.versions[0].id);
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
            {" · "}
            {t("characters.versionCount", { n: character.versions.length })}
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
              className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-bold transition ${
                activeTab === "voice"
                  ? "bg-accent-ink text-paper"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t("characters.voiceTitle")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={pending !== ""}
            className="inline-flex h-8 cursor-pointer items-center rounded-full border border-accent/30 px-3 text-xs font-semibold text-accent transition hover:bg-accent/5 disabled:opacity-60"
          >
            {t("characters.deleteCharacter")}
          </button>
        </div>
      </header>

      {deleteOpen ? (
        <DeleteCharacterDialog character={character} onClose={() => setDeleteOpen(false)} />
      ) : null}

      {activeTab === "look" ? (
        <section
          aria-label={t("characters.outlookHeading")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[10.5rem_15.5rem_minmax(0,1fr)] md:items-stretch">
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
            <VersionList
              character={character}
              styleId={activeStyleId}
              selectedId={selected?.id ?? null}
              onSelect={select}
            />
            {selected ? (
              <VersionDetail
                key={selected.id}
                character={character}
                version={selected}
                credits={walletCredits}
                subscribed={walletSubscribed}
                pending={pending}
                error={error}
                onSetDefault={() =>
                  void run("default", () => setDefaultVersionAction(character.id, selected.id))
                }
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
