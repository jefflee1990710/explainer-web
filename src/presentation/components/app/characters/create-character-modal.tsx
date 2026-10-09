"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCharacterAction } from "@/presentation/actions/characters";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { analyzeCharacterReferencesAction } from "@/presentation/actions/analyze-references";
import { CameraCaptureDialog } from "@/presentation/components/app/characters/camera-capture-dialog";
import { CreateCharacterReferences } from "@/presentation/components/app/characters/create-character-references";
import { ReferenceCoveragePanel } from "@/presentation/components/app/characters/reference-coverage-panel";
import { CharacterVoiceFields } from "@/presentation/components/app/characters/character-voice-fields";
import { MAX_CHARACTER_REFERENCES } from "@/service/character/reference-urls";
import type { ReferenceCoverage } from "@/service/character/reference-coverage";
import type { CharacterVoice } from "@/model/character-voice";
import { DEFAULT_CHARACTER_VOICE } from "@/service/director/character-voice";
import type { PublicStyle } from "@/presentation/serialize";
import { DEFAULT_STYLE_ID } from "@/service/style";
import { Spinner } from "@/presentation/components/spinner";
import { StylePicker } from "@/presentation/components/style-picker";
import { useI18n } from "@/presentation/components/i18n-provider";
import { BLUEPRINT_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 40;
const DEFAULT_BUTTON_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

// Header / empty-state trigger for the create-character dialog.
export function CreateCharacterButton({
  credits,
  subscribed,
  styles,
  atCharacterLimit = false,
  className = DEFAULT_BUTTON_CLASS,
  children,
}: {
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
  atCharacterLimit?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const label = children ?? t("characters.create");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={atCharacterLimit}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open ? (
        <CreateCharacterModal
          credits={credits}
          subscribed={subscribed}
          styles={styles}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

// Name + style + description and/or reference; success opens the workspace.
export function CreateCharacterModal({
  credits,
  subscribed,
  styles,
  onClose,
}: {
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [styleId, setStyleId] = useState<string>(DEFAULT_STYLE_ID);
  const [prompt, setPrompt] = useState("");
  const [voiceOn, setVoiceOn] = useState(false);
  const [voice, setVoice] = useState<CharacterVoice>(DEFAULT_CHARACTER_VOICE);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creditGate, setCreditGate] = useState(false);
  const [paidSnap, setPaidSnap] = useState<{ credits: number; subscribed: boolean } | null>(null);
  // Reference check: result of the last AI read, and whether the user chose to generate anyway.
  const [coverage, setCoverage] = useState<ReferenceCoverage | null>(null);
  const [checking, setChecking] = useState(false);
  const [coverageSkipped, setCoverageSkipped] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const walletCredits = paidSnap?.credits ?? credits;
  const walletSubscribed = paidSnap?.subscribed ?? subscribed;

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !creditGate && !cameraOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creditGate, cameraOpen, onClose]);

  // A changed photo set invalidates the last check.
  function updateReferences(urls: string[]) {
    setReferenceImageUrls(urls);
    setCoverage(null);
    setCoverageSkipped(false);
  }

  // Ask the AI whether the photos cover face, profile, and body. True means go ahead.
  async function referencesSufficient() {
    if (referenceImageUrls.length === 0 || coverageSkipped || coverage?.ok) return true;
    setChecking(true);
    try {
      const result = await analyzeCharacterReferencesAction(referenceImageUrls);
      // A failed check never blocks the user; they can still generate.
      if (!result.ok) return true;
      setCoverage(result.coverage);
      return result.coverage.ok;
    } catch {
      return true;
    } finally {
      setChecking(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!(await referencesSufficient())) return;
    setSubmitting(true);
    const data = new FormData();
    data.set("name", name);
    data.set("styleId", styleId);
    data.set("prompt", prompt);
    if (voiceOn) data.set("voice", JSON.stringify(voice));
    for (const url of referenceImageUrls) data.append("referenceImageUrl", url);
    try {
      const result = await createCharacterAction(data);
      if (!result.ok) {
        setSubmitting(false);
        setError(translateAppError(result.error, t));
        if (isCreditGateError(result.error)) {
          setCreditGate(true);
        }
        return;
      }
      // DB row exists; Higgsfield submit runs in the background after navigation.
      onClose();
      router.push(`/app/characters/${result.character.id}`);
    } catch {
      setError(t("errors.createCharacterFailed"));
      setSubmitting(false);
    }
  }

  const canSubmit =
    name.trim().length > 0 &&
    (prompt.trim().length > 0 || referenceImageUrls.length > 0) &&
    !submitting &&
    !checking;
  const showCoverage = Boolean(coverage && !coverage.ok && !coverageSkipped);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {t("characters.create")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("characters.modalIntro")}</p>
        <form ref={formRef} onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("characters.nameLabel")}</span>
            <input
              ref={inputRef}
              type="text"
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              placeholder={t("characters.namePlaceholder")}
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          {/* Shared style cards; the character is drawn and later cast in this style. */}
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">{t("characters.styleLabel")}</legend>
            <StylePicker
              styles={styles}
              value={styleId}
              onChange={setStyleId}
              disabled={submitting}
              label={t("characters.styleLabel")}
            />
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("characters.describeLabel")}</span>
            <textarea
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={submitting}
              placeholder={t("characters.describePlaceholder")}
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          <CharacterVoiceFields
            name={name}
            enabled={voiceOn}
            value={voice}
            disabled={submitting}
            auto
            onEnabled={setVoiceOn}
            onChange={setVoice}
          />

          <CreateCharacterReferences
            urls={referenceImageUrls}
            disabled={submitting || checking}
            onChange={updateReferences}
            onError={setError}
            onOpenCamera={() => setCameraOpen(true)}
          />

          {showCoverage && coverage ? (
            <ReferenceCoveragePanel
              coverage={coverage}
              disabled={submitting}
              onAddMore={() => setCoverage(null)}
              onOpenCamera={() => setCameraOpen(true)}
              onSkip={() => {
                setCoverageSkipped(true);
                // Generate right away with the photos already uploaded.
                window.setTimeout(() => formRef.current?.requestSubmit(), 0);
              }}
            />
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-accent">
              {translateAppError(error, t)}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {walletSubscribed
                ? t("characters.costLine", { cost: BLUEPRINT_COST, remaining: walletCredits })
                : t("characters.subscribeRequired")}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting || checking ? <Spinner className="h-4 w-4" /> : null}
                {checking ? t("characters.checkingReferences") : t("characters.generateBlueprint")}
              </button>
            </div>
          </div>
        </form>
      </div>
      {cameraOpen ? (
        <CameraCaptureDialog
          remaining={MAX_CHARACTER_REFERENCES - referenceImageUrls.length}
          onClose={() => setCameraOpen(false)}
          onCaptured={(urls) =>
            updateReferences([...referenceImageUrls, ...urls.filter((url) => !referenceImageUrls.includes(url))])
          }
        />
      ) : null}
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
    </DialogBackdrop>
  );
}
