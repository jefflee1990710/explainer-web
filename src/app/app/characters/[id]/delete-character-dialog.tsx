"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCharacterAction } from "@/lib/actions/characters";
import { Spinner } from "@/components/spinner";
import type { PublicCharacter } from "@/lib/serialize";

// Confirm and delete a character plus all stored images.
export function DeleteCharacterDialog({
  character,
  onClose,
}: {
  character: PublicCharacter;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function onConfirm() {
    setDeleting(true);
    setError("");
    const result = await deleteCharacterAction(character.id);
    if (!result.ok) {
      setDeleting(false);
      setError(result.error);
      return;
    }
    router.push("/app/characters");
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
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
          刪除角色
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          確定要刪除「{character.name}」嗎？這會一併刪除所有版本的藍圖、參考圖與相關儲存檔案，且無法復原。
          {character.pending ? " 目前有版本仍在產生中，刪除後該次產生也會停止。" : null}
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
            取消
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={deleting}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? <Spinner className="h-4 w-4" /> : null}
            永久刪除
          </button>
        </div>
      </div>
    </div>
  );
}
