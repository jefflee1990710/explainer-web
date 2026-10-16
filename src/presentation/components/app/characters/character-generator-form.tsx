"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCharacterAction,
  generateCharacterPoseSheetAction,
  reviseCharacterPoseSheetAction,
} from "@/presentation/actions/characters";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { CharacterLookPicker } from "@/presentation/components/app/characters/character-look-picker";
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
  randomizeCharacterLook,
  type AnyCharacterLookPart,
  type CharacterExaggerationLevel,
  type CharacterGender,
  type CharacterLookSelection,
} from "@/service/character/character-look";
import { BLUEPRINT_COST } from "@/service/production-plan";
import type { PublicStyle } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 40;
const EXAGGERATION_LEVELS: readonly CharacterExaggerationLevel[] = ["1x", "3x", "10x"];
const GENDERS: readonly CharacterGender[] = ["female", "male"];

// Left: picture picks + viral tools. Right: realistic pose preview, then the GPT Image blueprint.
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
      // Attach the generated / revised pose sheet as a reference image so the blueprint
      // preserves the exact exaggerated look and any custom comment revisions.
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

  return (
    <div>
      <Link href="/app/characters" className="text-sm font-semibold text-muted transition hover:text-foreground">
        {t("characters.backToList")}
      </Link>
      <h1 className="font-display mt-2 text-3xl font-bold">{t("characters.generatorTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{t("characters.generatorIntro")}</p>

      {/* Viral Archetype Presets bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold tracking-wide text-muted uppercase">
          {t("characters.look.presetsLabel")}:
        </span>
        {CHARACTER_VIRAL_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={blocked}
            onClick={() => applyPreset(preset.selection)}
            className="cursor-pointer rounded-full border border-accent-ink/15 bg-paper px-3.5 py-1.5 text-xs font-bold text-foreground transition hover:-translate-y-0.5 hover:border-accent-ink/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t(`characters.look.presets.${preset.id}`)}
          </button>
        ))}
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="mt-5 grid items-start gap-6 lg:grid-cols-[26%_minmax(0,1fr)]">
        <div className="space-y-3 rounded-[1.5rem] border border-accent-ink/10 bg-paper/80 p-3.5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("characters.nameLabel")}</span>
            <input
              type="text"
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={blocked}
              placeholder={t("characters.namePlaceholder")}
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          {/* Gender Selector (Female / Male) */}
          <div className="rounded-2xl border border-accent-ink/10 bg-paper p-2.5">
            <span className="mb-1.5 block text-xs font-bold text-muted">
              {t("characters.look.genderLabel")}
            </span>
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t("characters.look.genderLabel")}>
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
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? "bg-accent-ink text-paper"
                        : "border border-accent-ink/10 bg-paper text-muted hover:text-foreground"
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Crazy Mix & Surprise Me dice buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={blocked}
              onClick={() => onRandomize(true)}
              className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-full bg-accent px-3 text-xs font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("characters.look.crazyMix")}
            </button>
            <button
              type="button"
              disabled={blocked}
              onClick={() => onRandomize(false)}
              className="inline-flex min-h-[38px] cursor-pointer items-center justify-center rounded-full border border-accent-ink/20 bg-paper px-3 text-xs font-bold text-foreground transition hover:-translate-y-0.5 hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("characters.look.surpriseMe")}
            </button>
          </div>

          {/* Exaggeration Dial (1x / 3x / 10x) */}
          <div className="rounded-2xl border border-accent-ink/10 bg-paper p-2.5">
            <span className="mb-1.5 block text-xs font-bold text-muted">
              {t("characters.look.exaggerationLabel")}
            </span>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("characters.look.exaggerationLabel")}>
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
                    className={`cursor-pointer rounded-full px-2 py-1.5 text-[11px] font-bold transition ${
                      active
                        ? "bg-accent-ink text-paper"
                        : "border border-accent-ink/10 bg-paper text-muted hover:text-foreground"
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {ALL_CHARACTER_LOOK_PARTS.map((part) => (
            <CharacterLookPicker
              key={part}
              part={part}
              value={look[part] ?? defaultCharacterLook()[part] ?? ""}
              disabled={blocked}
              locked={Boolean(lockedParts[part])}
              onToggleLock={() => toggleLock(part)}
              onChange={(id) => setPart(part, id)}
            />
          ))}
        </div>

        <aside className="flex min-h-[32rem] flex-col gap-4 rounded-[1.5rem] border border-accent-ink/10 bg-paper p-5 lg:sticky lg:top-0">
          <div className="grid min-h-[22rem] flex-1 place-items-center overflow-hidden rounded-2xl bg-zinc-200">
            {poseUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poseUrl} alt="" className="h-full max-h-[70vh] w-full object-contain" />
            ) : (
              <p className="px-6 text-center text-sm text-muted">{t("characters.poseEmpty")}</p>
            )}
          </div>
          <CharacterPoseComment
            value={comment}
            onChange={setComment}
            onSubmit={() => void onRevise()}
            disabled={!poseUrl || blocked}
            busy={busy === "revise"}
          />
          {error ? (
            <p role="alert" className="text-sm text-accent">
              {translateAppError(error, t)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void onPose()}
            disabled={blocked}
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {busy === "generate" ? <Spinner className="h-4 w-4" /> : null}
            {busy === "generate" ? t("characters.poseGenerating") : t("characters.poseGenerate")}
          </button>
          <p className="text-xs text-muted">
            {walletSubscribed
              ? t("characters.costLine", { cost: BLUEPRINT_COST, remaining: walletCredits })
              : t("characters.subscribeRequired")}
          </p>
          <button
            type="submit"
            disabled={blocked || name.trim().length === 0}
            className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 px-5 text-sm font-semibold transition hover:bg-accent-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t("characters.generateBlueprint")}
          </button>
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
