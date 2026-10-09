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

// Style column, then versions of that style, then the selected blueprint.
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
  // This account can add styles past the plan cap.
  unlimitedStyles?: boolean;
  styles: PublicStyle[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [character, setCharacter] = useState(initial);
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

  // SSR gives a first paint; refresh in the background after navigation.
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
  }, [initial.id]);

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
    // Jump to the new version so the user watches it generate.
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/app/characters" className="text-sm font-semibold text-muted transition hover:text-foreground">
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
            className="font-display mt-2 block w-full max-w-md rounded-lg border border-transparent bg-transparent text-3xl font-bold hover:border-accent-ink/15 focus-visible:border-accent-ink/30 focus-visible:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">
            {character.styleIds.length > 1
              ? t("characters.styleCount", { n: character.styleIds.length })
              : styleLabel(character.styleIds[0] || character.styleId, styles)}
            {" · "}
            {t("characters.versionCount", { n: character.versions.length })}
          </p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={pending !== ""}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent/30 px-4 text-sm font-semibold text-accent transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {t("characters.deleteCharacter")}
          </button>
        </div>
      </header>

      {deleteOpen ? (
        <DeleteCharacterDialog character={character} onClose={() => setDeleteOpen(false)} />
      ) : null}

      <section
        aria-label={t("characters.outlookHeading")}
        className="flex min-h-[28rem] flex-col md:h-[min(40rem,calc(100dvh-9rem))]"
      >
      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[11rem_17.5rem_minmax(0,1fr)] md:items-stretch">
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

      <section aria-label={t("characters.voiceTitle")}>
        <CharacterVoicePanel character={character} onSaved={setCharacter} />
      </section>
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
