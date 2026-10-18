"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCharacterAction,
  generateCharacterPoseSheetAction,
  reviseCharacterPoseSheetAction,
} from "@/presentation/actions/characters";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { CharacterLookArt } from "@/presentation/components/app/characters/character-look-art";
import { CharacterPoseComment } from "@/presentation/components/app/characters/character-pose-comment";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { isCreditGateError } from "@/service/billing/credit-gate";
import {
  ALL_CHARACTER_LOOK_PARTS,
  CHARACTER_VIRAL_PRESETS,
  characterLookPrompt,
  defaultCharacterLook,
  isCharacterLookId,
  isExaggeratedLookOption,
  lookOptionCategory,
  optionsForLookPart,
  randomizeCharacterLook,
  type AnyCharacterLookPart,
  type CharacterExaggerationLevel,
  type CharacterGender,
  type CharacterLookCategory,
  type CharacterLookSelection,
} from "@/service/character/character-look";
import { BLUEPRINT_COST } from "@/service/production-plan";
import type { PublicStyle } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 40;
const EXAGGERATION_LEVELS: readonly CharacterExaggerationLevel[] = ["1x", "3x", "10x"];
const GENDERS: readonly CharacterGender[] = ["female", "male"];
const CATEGORIES: readonly CharacterLookCategory[] = ["all", "extreme", "stylized", "classic"];
const ORDERED_PARTS: readonly AnyCharacterLookPart[] = [
  "face",
  "expression",
  "hair",
  "body",
  "top",
  "pants",
  "shoes",
  "accessory",
];

// Single-screen 3-column Studio: Left part rail, Center inline option grid, Right live preview & actions.
export function CharacterGeneratorForm({
  credits,
  subscribed,
  styles,
  atCharacterLimit,
}: {
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
  atCharacterLimit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const realistic = styles.find((style) => style.id === "realistic" || style.baseStyleId === "realistic");
  const styleId = realistic?.id ?? "realistic";
  const [name, setName] = useState("");
  const [look, setLook] = useState<CharacterLookSelection>(defaultCharacterLook);
  const [activePart, setActivePart] = useState<AnyCharacterLookPart>("face");
  const [categoryTab, setCategoryTab] = useState<CharacterLookCategory>("all");
  const [lockedParts, setLockedParts] = useState<Partial<Record<AnyCharacterLookPart, boolean>>>({});
  const [poseUrl, setPoseUrl] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<"" | "generate" | "revise">("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creditGate, setCreditGate] = useState(false);
  const [paidSnap, setPaidSnap] = useState<{ credits: number; subscribed: boolean } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const walletCredits = paidSnap?.credits ?? credits;
  const walletSubscribed = paidSnap?.subscribed ?? subscribed;
  const blocked = atCharacterLimit || submitting || busy !== "";

  async function onPose() {
    setError("");
    setBusy("generate");
    try {
      const result = await generateCharacterPoseSheetAction(look);
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      setPoseUrl(result.image);
    } catch {
      setError(t("errors.createCharacterFailed"));
    } finally {
      setBusy("");
    }
  }

  async function onRevise() {
    const note = comment.trim();
    if (!poseUrl || !note) return;
    setError("");
    setBusy("revise");
    try {
      const result = await reviseCharacterPoseSheetAction({ selection: look, image: poseUrl, comment: note });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      setPoseUrl(result.image);
    } catch {
      setError(t("errors.poseUpdateFailed"));
    } finally {
      setBusy("");
    }
  }

  function setPart(part: AnyCharacterLookPart, id: string) {
    if (!isCharacterLookId(part, id)) return;
    setLook((current) => ({ ...current, [part]: id }));
  }

  function toggleLock(part: AnyCharacterLookPart) {
    setLockedParts((current) => ({ ...current, [part]: !current[part] }));
  }

  function onRandomize(extremeOnly: boolean) {
    setLook((current) =>
      randomizeCharacterLook(current, {
        locked: lockedParts,
        extremeOnly,
      }),
    );
  }

  function applyPreset(presetSelection: CharacterLookSelection) {
    setLook((current) => {
      const next: CharacterLookSelection = { ...presetSelection };
      for (const part of ALL_CHARACTER_LOOK_PARTS) {
        if (lockedParts[part] && current[part]) {
          (next as Record<string, string>)[part] = current[part] as string;
        }
      }
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (atCharacterLimit) return;
    setError("");
    setSubmitting(true);
    const data = new FormData();
    data.set("name", name);
    data.set("styleId", styleId);
    data.set("prompt", characterLookPrompt(look));
    try {
      if (poseUrl.startsWith("data:image/")) {
        const res = await fetch(poseUrl);
        const blob = await res.blob();
        const uploadForm = new FormData();
        uploadForm.set("file", new File([blob], "pose-sheet.webp", { type: blob.type || "image/webp" }));
        const uploaded = await uploadCharacterImageAction(uploadForm);
        if (uploaded.ok && uploaded.url) {
          data.append("referenceImageUrl", uploaded.url);
        }
      }
      const result = await createCharacterAction(data);
      if (!result.ok) {
        setSubmitting(false);
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) setCreditGate(true);
        return;
      }
      router.push(`/app/characters/${result.character.id}`);
    } catch {
      setError(t("errors.createCharacterFailed"));
      setSubmitting(false);
    }
  }

  const exaggeration = look.exaggeration ?? "1x";
  const gender = look.gender ?? "female";
  const activeValue = look[activePart] ?? defaultCharacterLook()[activePart] ?? "";
  const activePartLabel = t(`characters.look.${activePart}`);
  const allOptions = optionsForLookPart(activePart);
  const visibleOptions = useMemo(() => {
    if (categoryTab === "all") return allOptions;
    return allOptions.filter((option) => lookOptionCategory(activePart, option.id) === categoryTab);
  }, [activePart, allOptions, categoryTab]);

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden">
      {/* Compact Top Control Bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-accent-ink/10 bg-paper/90 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/characters"
            className="text-xs font-semibold text-muted transition hover:text-foreground"
          >
            {t("characters.backToList")}
          </Link>
          <h1 className="font-display text-lg font-bold">{t("characters.generatorTitle")}</h1>
          <input
            type="text"
            required
            form="character-generator-form"
            maxLength={NAME_MAX}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={blocked}
            placeholder={t("characters.namePlaceholder")}
            aria-label={t("characters.nameLabel")}
            className="h-9 w-48 rounded-full border border-accent-ink/15 bg-paper px-3.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 sm:w-56"
          />
        </div>

        {/* Gender + Exaggeration + Randomize Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-full border border-accent-ink/10 bg-paper p-0.5"
            role="radiogroup"
            aria-label={t("characters.look.genderLabel")}
          >
            {GENDERS.map((g) => {
              const active = gender === g;
              const labelKey = g === "female" ? "characters.look.genderFemale" : "characters.look.genderMale";
              return (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={blocked}
                  onClick={() => setLook((current) => ({ ...current, gender: g }))}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                    active ? "bg-accent-ink text-paper" : "text-muted hover:text-foreground"
                  }`}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>

          <div
            className="inline-flex rounded-full border border-accent-ink/10 bg-paper p-0.5"
            role="radiogroup"
            aria-label={t("characters.look.exaggerationLabel")}
          >
            {EXAGGERATION_LEVELS.map((level) => {
              const active = exaggeration === level;
              const labelKey =
                level === "1x"
                  ? "characters.look.exaggeration1x"
                  : level === "3x"
                    ? "characters.look.exaggeration3x"
                    : "characters.look.exaggeration10x";
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={blocked}
                  onClick={() => setLook((current) => ({ ...current, exaggeration: level }))}
                  className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    active ? "bg-accent-ink text-paper" : "text-muted hover:text-foreground"
                  }`}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={blocked}
            onClick={() => onRandomize(true)}
            className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full bg-accent px-3 text-xs font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("characters.look.crazyMix")}
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => onRandomize(false)}
            className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-accent-ink/20 bg-paper px-3 text-xs font-bold text-foreground transition hover:-translate-y-0.5 hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("characters.look.surpriseMe")}
          </button>
        </div>
      </div>

      {/* Presets Strip */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5">
        <span className="shrink-0 text-[11px] font-bold tracking-wide text-muted uppercase">
          {t("characters.look.presetsLabel")}:
        </span>
        {CHARACTER_VIRAL_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={blocked}
            onClick={() => applyPreset(preset.selection)}
            className="shrink-0 cursor-pointer rounded-full border border-accent-ink/15 bg-paper px-3 py-1 text-xs font-semibold text-foreground transition hover:border-accent-ink/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t(`characters.look.presets.${preset.id}`)}
          </button>
        ))}
      </div>

      {/* 3-Column Single-Screen Studio */}
      <form
        id="character-generator-form"
        ref={formRef}
        onSubmit={onSubmit}
        className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[14.5rem_minmax(0,1fr)_21rem] lg:items-stretch"
      >
        {/* Left Column: Compact Part Rail (all 8 parts visible at once) */}
        <nav
          aria-label={t("characters.generatorTitle")}
          className="flex flex-col gap-1.5 overflow-y-auto rounded-2xl border border-accent-ink/10 bg-paper/80 p-2.5"
        >
          {ORDERED_PARTS.map((part) => {
            const value = look[part] ?? defaultCharacterLook()[part] ?? "";
            const partLabel = t(`characters.look.${part}`);
            const optionName = t(`characters.look.options.${part}.${value}`);
            const isSelected = activePart === part;
            const isLocked = Boolean(lockedParts[part]);
            const extreme = isExaggeratedLookOption(part, value);
            return (
              <div key={part} className="relative flex items-center">
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => setActivePart(part)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-left transition ${
                    isSelected
                      ? "border-accent bg-accent/8 shadow-[2px_2px_0_0_#12141c]"
                      : "border-accent-ink/10 bg-paper hover:border-accent-ink/30"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-200">
                    <CharacterLookArt part={part} id={value} />
                    {extreme ? (
                      <span className="absolute top-0.5 left-0.5 rounded bg-accent-ink px-1 py-0.2 text-[8px] font-extrabold text-paper">
                        !
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 pr-6">
                    <span className="block text-[11px] font-semibold text-muted">{partLabel}</span>
                    <span className="block truncate text-xs font-bold">{optionName}</span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => toggleLock(part)}
                  aria-pressed={isLocked}
                  aria-label={
                    isLocked
                      ? t("characters.look.unlockPart", { part: partLabel })
                      : t("characters.look.lockPart", { part: partLabel })
                  }
                  title={
                    isLocked
                      ? t("characters.look.unlockPart", { part: partLabel })
                      : t("characters.look.lockPart", { part: partLabel })
                  }
                  className={`absolute right-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full border text-xs transition ${
                    isLocked
                      ? "border-accent-ink bg-accent-ink text-paper"
                      : "border-transparent text-muted hover:bg-accent-ink/5 hover:text-foreground"
                  }`}
                >
                  <LockIcon locked={isLocked} />
                </button>
              </div>
            );
          })}
        </nav>

        {/* Center Column: Inline Visual Option Grid (no modal jumping!) */}
        <section
          aria-label={activePartLabel}
          className="flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper/90"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-accent-ink/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold">{activePartLabel}</h2>
              <span className="rounded-full bg-accent-ink/8 px-2.5 py-0.5 text-xs font-semibold text-muted">
                {t(`characters.look.options.${activePart}.${activeValue}`)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1" role="tablist">
              {CATEGORIES.map((category) => {
                const active = categoryTab === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategoryTab(category)}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold transition ${
                      active
                        ? "bg-accent-ink text-paper"
                        : "border border-accent-ink/15 bg-paper text-muted hover:border-accent-ink/40 hover:text-foreground"
                    }`}
                  >
                    {t(`characters.look.tabs.${category}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label={activePartLabel}
            className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 overflow-y-auto p-3.5 sm:grid-cols-3 xl:grid-cols-4"
          >
            {visibleOptions.map((option) => {
              const active = option.id === activeValue;
              const extreme = isExaggeratedLookOption(activePart, option.id);
              const optionName = t(`characters.look.options.${activePart}.${option.id}`);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={blocked}
                  onClick={() => setPart(activePart, option.id)}
                  className={`flex cursor-pointer flex-col rounded-2xl border bg-paper p-2 text-center transition ${
                    active
                      ? "border-accent ring-2 ring-accent/30 shadow-[3px_3px_0_0_#12141c]"
                      : "border-accent-ink/10 hover:border-accent-ink/30"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-zinc-200">
                    <CharacterLookArt part={activePart} id={option.id} />
                    {extreme ? (
                      <span className="absolute top-1.5 right-1.5 rounded-full bg-accent-ink px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-paper shadow-sm">
                        {t("characters.look.extremeBadge")}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1.5 line-clamp-2 text-xs font-semibold leading-4">{optionName}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right Column: Live Pose Preview + Revision + Create Blueprint Dock */}
        <aside className="flex min-h-[26rem] flex-col gap-2.5 rounded-2xl border border-accent-ink/10 bg-paper p-3.5">
          <div className="relative grid min-h-[14rem] flex-1 place-items-center overflow-hidden rounded-xl bg-zinc-200">
            {poseUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poseUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <p className="px-5 text-center text-xs leading-5 text-muted">{t("characters.poseEmpty")}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void onPose()}
            disabled={blocked}
            className="inline-flex min-h-[40px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-accent-ink/20 bg-paper px-4 text-xs font-bold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "generate" ? <Spinner className="h-3.5 w-3.5" /> : null}
            {busy === "generate" ? t("characters.poseGenerating") : t("characters.poseGenerate")}
          </button>

          <div className="shrink-0">
            <CharacterPoseComment
              value={comment}
              onChange={setComment}
              onSubmit={() => void onRevise()}
              disabled={!poseUrl || blocked}
              busy={busy === "revise"}
            />
          </div>

          {error ? (
            <p role="alert" className="shrink-0 text-xs font-medium text-accent">
              {translateAppError(error, t)}
            </p>
          ) : null}

          <div className="shrink-0 space-y-2 border-t border-accent-ink/10 pt-2.5">
            <p className="text-[11px] text-muted">
              {walletSubscribed
                ? t("characters.costLine", { cost: BLUEPRINT_COST, remaining: walletCredits })
                : t("characters.subscribeRequired")}
            </p>
            <button
              type="submit"
              disabled={blocked || name.trim().length === 0}
              className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {submitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {t("characters.generateBlueprint")}
            </button>
          </div>
        </aside>
      </form>

      {creditGate ? (
        <InsufficientCreditsDialog
          needed={BLUEPRINT_COST}
          subscribed={walletSubscribed}
          onClose={() => setCreditGate(false)}
          onPaid={(snap) => {
            setPaidSnap(snap);
            setCreditGate(false);
            formRef.current?.requestSubmit();
          }}
        />
      ) : null}
    </div>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
        <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="currentColor" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 4.6-1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
