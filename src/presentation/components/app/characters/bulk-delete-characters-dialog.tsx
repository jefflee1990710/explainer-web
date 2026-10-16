"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCharactersAction } from "@/presentation/actions/characters";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Confirm and bulk-delete selected characters plus all stored images.
export function BulkDeleteCharactersDialog({
  selected,
  onClose,
  onDeleted,
}: {
  selected: PublicCharacter[];
  onClose: () => void;
  onDeleted: (deletedIds: string[]) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const titleId = useId();
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const count = selected.length;
  const anyPending = selected.some((character) => character.pending);

  async function onConfirm() {
    setDeleting(true);
    setError("");
    const ids = selected.map((character) => character.id);
    const result = await deleteCharactersAction(ids);
    if (!result.ok) {
      setDeleting(false);
      setError(translateAppError(result.error, t));
      return;
    }
    onDeleted(ids);
    router.refresh();
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={deleting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {t("characters.bulkDeleteTitle", { n: count })}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t("characters.bulkDeleteBody", { n: count })}
          {anyPending ? t("characters.bulkDeletePendingNote") : null}
        </p>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-accent">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={deleting}
            data-intent="danger"
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? <Spinner className="h-4 w-4" /> : null}
            {t("video.delete.confirm")}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
