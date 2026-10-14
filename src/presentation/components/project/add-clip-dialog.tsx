"use client";

import { useEffect, useId, useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";

export type AddClipAfterOption = {
  clipNumber: number;
  title: string;
};

// Asks for the new clip's content. When afterOptions is set, the user picks
// which clip it follows so generation can start from that clip's ending scene.
export function AddClipDialog({
  place,
  pending,
  error,
  onCancel,
  onConfirm,
  afterOptions,
  defaultAfterClipNumber,
}: {
  place?: string;
  pending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (content: string, afterClipNumber?: number) => void;
  afterOptions?: AddClipAfterOption[];
  defaultAfterClipNumber?: number | null;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [content, setContent] = useState("");
  const fallbackAfter = afterOptions?.at(-1)?.clipNumber;
  const [afterClipNumber, setAfterClipNumber] = useState(
    afterOptions?.some((option) => option.clipNumber === defaultAfterClipNumber)
      ? defaultAfterClipNumber!
      : fallbackAfter,
  );
  const chosen = afterOptions?.find((option) => option.clipNumber === afterClipNumber);
  const following = afterOptions?.find((option) => option.clipNumber === (afterClipNumber ?? 0) + 1);
  const resolvedPlace = chosen
    ? following
      ? t("production.filmstrip.addBetween", { before: chosen.title, after: following.title })
      : t("production.filmstrip.addAfter", { title: chosen.title })
    : (place ?? t("production.filmstrip.addClip"));
  const canConfirm = !pending && content.trim().length > 0 && (afterOptions == null || chosen != null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (pending) return;
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/30 p-4"
      onClick={pending ? undefined : onCancel}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="studio-app w-full max-w-md rounded-lg border border-[var(--studio-line)] bg-[var(--studio-panel)] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (canConfirm) onConfirm(content.trim(), chosen?.clipNumber);
        }}
      >
        <h2 id={titleId} className="text-lg font-bold">
          {t("production.filmstrip.addTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--studio-muted)]">
          {t("production.filmstrip.addBody", { place: resolvedPlace })}
        </p>
        {afterOptions && afterOptions.length > 0 ? (
          <label className="mt-4 block text-sm">
            <span className="font-semibold">{t("production.filmstrip.addAfterLabel")}</span>
            <select
              value={afterClipNumber ?? ""}
              disabled={pending}
              onChange={(event) => setAfterClipNumber(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-[var(--studio-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--studio-ink)]"
            >
              {afterOptions.map((option) => (
                <option key={option.clipNumber} value={option.clipNumber}>
                  {option.title}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[var(--studio-muted)]">
              {t("production.filmstrip.addAfterHint")}
            </span>
          </label>
        ) : null}
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t("production.filmstrip.addPlaceholder")}
          rows={5}
          autoFocus
          disabled={pending}
          className="mt-4 w-full resize-y rounded-lg border border-[var(--studio-line)] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--studio-ink)]"
        />
        {error ? <p className="mt-2 text-xs text-accent">{error}</p> : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <StudioButton variant="ghost" onClick={onCancel} disabled={pending}>
            {t("production.action.cancel")}
          </StudioButton>
          <StudioButton type="submit" disabled={!canConfirm}>
            {pending ? <Spinner className="h-4 w-4" /> : null}
            {pending ? t("production.filmstrip.addPending") : t("production.filmstrip.addConfirm")}
          </StudioButton>
        </div>
      </form>
    </DialogBackdrop>
  );
}
