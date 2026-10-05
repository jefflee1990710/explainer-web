"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserStyleAction } from "@/presentation/actions/styles";
import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import { catalogStyleLabel } from "@/presentation/components/app/styles/style-detail";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;
const DEFAULT_BUTTON_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5";

// Trigger for forking a system style into the user's own copy.
export function CreateStyleButton({
  template,
  className = DEFAULT_BUTTON_CLASS,
  children,
}: {
  template: PublicStyle;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const label = children ?? t("styles.useTemplate");
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
      {open ? <CreateStyleModal template={template} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Name + description for a new style; success opens its detail page.
export function CreateStyleModal({
  template,
  onClose,
}: {
  template: PublicStyle;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const templateName = template.isCustom
    ? template.name
    : catalogStyleLabel(t, template.id, template.name);
  const [name, setName] = useState(() => templateName.slice(0, NAME_MAX));
  const [description, setDescription] = useState("");
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
      const result = await createUserStyleAction({
        baseStyleId: template.id,
        name,
        description,
      });
      if (!result.ok) {
        setSubmitting(false);
        setError(translateAppError(result.error, t));
        return;
      }
      onClose();
      router.push(`/app/styles/${result.id}`);
    } catch {
      setError(t("errors.styleCreateFailed"));
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
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {t("styles.createTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("styles.createIntro", { name: templateName })}</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("styles.nameLabel")}</span>
            <input
              ref={inputRef}
              type="text"
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              placeholder={t("styles.namePlaceholder")}
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("styles.descriptionLabel")}</span>
            <textarea
              rows={3}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={submitting}
              placeholder={t("styles.descriptionPlaceholder")}
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          {error ? (
            <p role="alert" className="text-sm text-accent">
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
              {t("styles.createSubmit")}
            </button>
          </div>
        </form>
      </div>
    </DialogBackdrop>
  );
}
