"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTextStyleAction } from "@/presentation/actions/text-styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicTextStyle } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

// User lettering sample. Opens the AI workspace; delete stays on the card.
export function TextStyleCard({ style }: { style: PublicTextStyle }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const href = `/app/text-styles/${style.id}`;

  async function onDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
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
      <Link
        href={href}
        className="flex flex-1 flex-col transition-colors hover:bg-accent-ink/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <span className="relative block aspect-video w-full overflow-hidden bg-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={style.imageUrl} alt="" className="h-full w-full object-contain" />
        </span>
        <div className="px-3 py-2.5">
          <h3 className="line-clamp-1 text-xs font-semibold">{style.name}</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            {t("textStyles.updated", { date: new Date(style.updatedAt).toLocaleDateString(locale) })}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--studio-line)] px-3 py-2">
        <Link href={href} className="text-[11px] font-semibold underline-offset-2 hover:underline">
          {t("textStyles.open")}
        </Link>
        <button
          type="button"
          className="cursor-pointer text-[11px] text-muted hover:text-accent-ink disabled:opacity-50"
          disabled={busy}
          onClick={(event) => void onDelete(event)}
        >
          {t("textStyles.delete")}
        </button>
      </div>
      {error ? <p className="px-3 pb-2 text-[11px] text-red-700">{error}</p> : null}
    </article>
  );
}
