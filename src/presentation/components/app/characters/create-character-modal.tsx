"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCharacterAction } from "@/presentation/actions/characters";
import { InsufficientCreditsDialog } from "@/presentation/components/app/billing/insufficient-credits-dialog";
import { isCreditGateError } from "@/service/billing/credit-gate";
import { CreateCharacterReferences } from "@/presentation/components/app/characters/create-character-references";
import type { PublicStyle } from "@/presentation/serialize";
import { DEFAULT_STYLE_ID, type StyleId } from "@/service/style";
import { Spinner } from "@/presentation/components/spinner";
import { StylePicker } from "@/presentation/components/style-picker";
import { useI18n } from "@/presentation/components/i18n-provider";
import { FRAME_COST } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 40;
const DEFAULT_BUTTON_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5";

// Header / empty-state trigger for the create-character dialog.
export function CreateCharacterButton({
  credits,
  subscribed,
  styles,
  className = DEFAULT_BUTTON_CLASS,
  children,
}: {
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
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
  const [styleId, setStyleId] = useState<StyleId>(DEFAULT_STYLE_ID);
  const [prompt, setPrompt] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creditGate, setCreditGate] = useState(false);
  const [paidSnap, setPaidSnap] = useState<{ credits: number; subscribed: boolean } | null>(null);
  const walletCredits = paidSnap?.credits ?? credits;
  const walletSubscribed = paidSnap?.subscribed ?? subscribed;

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !creditGate) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creditGate, onClose]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const data = new FormData();
    data.set("name", name);
    data.set("styleId", styleId);
    data.set("prompt", prompt);
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
    !submitting;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
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

          <CreateCharacterReferences
            urls={referenceImageUrls}
            disabled={submitting}
            onChange={setReferenceImageUrls}
            onError={setError}
          />

          {error ? (
            <p role="alert" className="text-sm text-accent">
              {translateAppError(error, t)}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {walletSubscribed
                ? t("characters.costLine", { cost: FRAME_COST, remaining: walletCredits })
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
                {submitting ? <Spinner className="h-4 w-4" /> : null}
                {t("characters.generateBlueprint")}
              </button>
            </div>
          </div>
        </form>
      </div>
      {creditGate ? (
        <InsufficientCreditsDialog
          needed={FRAME_COST}
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
