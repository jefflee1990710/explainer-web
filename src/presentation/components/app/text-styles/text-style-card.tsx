"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTextStyleAction, replaceTextStyleImageAction } from "@/presentation/actions/text-styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicTextStyle } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

// User lettering sample. Replacing the image updates the style used by later videos.
export function TextStyleCard({ style }: { style: PublicTextStyle }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onReplace(file: File) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("file", file);
    const result = await replaceTextStyleImageAction(style.id, form);
    setBusy(false);
    if (!result.ok) {
      setError(translateAppError(result.error, t));
      return;
    }
    router.refresh();
  }

  async function onDelete() {
    if (!window.confirm(t("textStyles.deleteConfirm", { name: style.name }))) return;
    setBusy(true);
    setError("");
    const result = await deleteTextStyleAction(style.id);
    setBusy(false);
    if (!result.ok) {
      setError(translateAppError(result.error, t));
      return;
    }
    router.refresh();
  }

  return (
    <article className="studio-card flex flex-col overflow-hidden border border-[var(--studio-line)]">
      <span className="relative block aspect-video w-full overflow-hidden bg-paper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={style.imageUrl} alt="" className="h-full w-full object-contain" />
      </span>
      <div className="px-3 py-2.5">
        <h3 className="line-clamp-1 text-xs font-semibold">{style.name}</h3>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--studio-line)] px-3 py-2">
        <label className="cursor-pointer text-[11px] font-semibold underline-offset-2 hover:underline">
          {t("textStyles.replaceImage")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onReplace(file);
            }}
          />
        </label>
        <button
          type="button"
          className="cursor-pointer text-[11px] text-muted hover:text-accent-ink"
          disabled={busy}
          onClick={() => void onDelete()}
        >
          {t("textStyles.delete")}
        </button>
      </div>
      {error ? <p className="px-3 pb-2 text-[11px] text-red-700">{error}</p> : null}
    </article>
  );
}
