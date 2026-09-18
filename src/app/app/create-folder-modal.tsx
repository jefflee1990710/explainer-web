"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { createFolderAction } from "@/lib/actions/projects";
import { Spinner } from "@/components/spinner";

const NAME_MAX = 80;

const DEFAULT_BUTTON_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5";

// Header / empty-state trigger that opens the name-only create-folder dialog.
export function CreateFolderButton({
  className = DEFAULT_BUTTON_CLASS,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const label = children ?? t("folder.create");

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
      {open ? <CreateFolderModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Name-only dialog; success navigates into the new folder workspace.
export function CreateFolderModal({ onClose }: { onClose: () => void }) {
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
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await createFolderAction(name);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    onClose();
    router.push(`/app/projects/${result.folder.id}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {t("folder.createTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("folder.createHint")}</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("folder.nameLabel")}</span>
            <input
              ref={inputRef}
              type="text"
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              placeholder={t("folder.namePlaceholder")}
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
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
              disabled={submitting || !name.trim()}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : null}
              {t("folder.createSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
