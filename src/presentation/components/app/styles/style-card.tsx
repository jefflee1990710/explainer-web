"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import { catalogStyleLabel } from "@/presentation/components/app/styles/style-detail";
import { CreateStyleButton } from "@/presentation/components/app/styles/create-style-modal";

const ease = [0.22, 1, 0.36, 1] as const;

// Still for a library card. Falls back to the canvas color when there is no image.
function StyleCardThumb({ style, label }: { style: PublicStyle; label: string }) {
  return (
    <span
      className="relative block aspect-video w-full overflow-hidden"
      style={{ backgroundColor: style.canvasColor }}
    >
      {style.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={style.previewUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center px-2 text-center font-display text-xs font-bold text-accent-ink/60">
          {label}
        </span>
      )}
    </span>
  );
}

// Library card. System cards are view-only plus fork; custom cards show the template and edit time.
export function StyleCard({ style }: { style: PublicStyle }) {
  const { t, locale } = useI18n();
  const href = `/app/styles/${style.id}`;
  const name = style.isCustom ? style.name : catalogStyleLabel(t, style.id, style.name);
  const templateName = style.baseStyleId
    ? catalogStyleLabel(t, style.baseStyleId, style.templateName ?? style.baseStyleId)
    : style.templateName;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className="studio-card group flex flex-col overflow-hidden border border-[var(--studio-line)]"
    >
      <Link
        href={href}
        className="flex flex-1 flex-col transition-colors hover:bg-accent-ink/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <StyleCardThumb style={style} label={name} />
        <div className="flex flex-1 flex-col gap-0.5 px-3 py-2.5">
          <h3 className="line-clamp-1 text-xs font-semibold">{name}</h3>
          {style.isCustom && templateName ? (
            <p className="line-clamp-1 text-[11px] text-muted">{t("styles.templateBadge", { name: templateName })}</p>
          ) : null}
          {style.description ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">{style.description}</p>
          ) : null}
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--studio-line)] px-3 py-2">
        {style.isCustom ? (
          <p className="text-[11px] text-muted">
            {style.updatedAt
              ? t("styles.updated", { date: new Date(style.updatedAt).toLocaleDateString(locale) })
              : null}
          </p>
        ) : (
          <>
            <span className="text-[11px] text-muted">{t("styles.readOnly")}</span>
            <CreateStyleButton
              template={style}
              className="inline-flex h-7 cursor-pointer items-center rounded-full border border-accent-ink/15 px-2.5 text-[11px] font-semibold transition hover:border-accent-ink/40"
            />
          </>
        )}
      </div>
    </motion.article>
  );
}
