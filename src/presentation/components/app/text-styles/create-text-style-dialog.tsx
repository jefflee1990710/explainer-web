"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { Spinner } from "@/presentation/components/spinner";
import { createTextStyleAction } from "@/presentation/actions/text-styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 40;

// Opens the upload dialog for a new lettering sample.
export function CreateTextStyleButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {t("textStyles.create")}
      </button>
      {open ? <CreateTextStyleDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function CreateTextStyleDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
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
    const form = event.currentTarget;
    const result = await createTextStyleAction(new FormData(form));
    setSubmitting(false);
    if (!result.ok) {
      setError(translateAppError(result.error, t));
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[1.5rem] border border-[var(--studio-line)] bg-paper p-6 shadow-[6px_6px_0_0_#12141c]"
      >
        <h2 id={titleId} className="font-display text-xl font-bold">
          {t("textStyles.create")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("textStyles.imageHint")}</p>
        <label className="mt-4 block text-sm font-semibold" htmlFor={`${titleId}-name`}>
          {t("textStyles.name")}
        </label>
        <input
          ref={inputRef}
          id={`${titleId}-name`}
          name="name"
          value={name}
          maxLength={NAME_MAX}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("textStyles.namePlaceholder")}
          className="mt-2 w-full rounded-xl border border-accent-ink/15 bg-white px-3 py-2 text-sm"
          required
        />
        <label className="mt-4 block text-sm font-semibold" htmlFor={`${titleId}-file`}>
          {t("textStyles.image")}
        </label>
        <input
          id={`${titleId}-file`}
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="mt-2 block w-full text-sm"
          required
        />
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold"
            onClick={onClose}
            disabled={submitting}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? <Spinner /> : null}
            {submitting ? t("textStyles.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}
