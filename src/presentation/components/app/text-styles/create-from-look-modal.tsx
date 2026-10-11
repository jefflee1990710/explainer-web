"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { Spinner } from "@/presentation/components/spinner";
import { createTextStyleFromLookAction } from "@/presentation/actions/text-styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { SubtitleLook } from "@/service/director/subtitle-look";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 40;
const DEFAULT_BUTTON_CLASS =
  "inline-flex h-7 cursor-pointer items-center rounded-full border border-accent-ink/15 px-2.5 text-[11px] font-semibold transition hover:border-accent-ink/40";

// Fork a system lettering look into the user's own editable copy.
export function CreateFromLookButton({
  look,
  className = DEFAULT_BUTTON_CLASS,
  children,
}: {
  look: SubtitleLook;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
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
        {children ?? t("textStyles.useTemplate")}
      </button>
      {open ? <CreateFromLookModal look={look} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function CreateFromLookModal({
  look,
  onClose,
}: {
  look: SubtitleLook;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const lookName = subtitleLookLabel(t, look).label;
  const [name, setName] = useState(() => lookName.slice(0, NAME_MAX));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.select();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await createTextStyleFromLookAction({ baseLookId: look, name });
      if (!result.ok) {
        setSubmitting(false);
        setError(translateAppError(result.error, t));
        return;
      }
      onClose();
      router.push(`/app/text-styles/${result.id}`);
    } catch {
      setError(t("errors.textStyleCreateFailed"));
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.5rem] border border-[var(--studio-line)] bg-paper p-6 shadow-[6px_6px_0_0_#12141c]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-xl font-bold">
          {t("textStyles.createFromLookTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("textStyles.createFromLookIntro", { name: lookName })}</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("textStyles.name")}</span>
            <input
              ref={inputRef}
              type="text"
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              placeholder={t("textStyles.namePlaceholder")}
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2">
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
              {t("textStyles.createSubmit")}
            </button>
          </div>
        </form>
      </div>
    </DialogBackdrop>
  );
}
