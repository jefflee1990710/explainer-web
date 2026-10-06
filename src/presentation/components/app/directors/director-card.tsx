"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicSkill } from "@/presentation/serialize";
import { localizedVideoBlurb, localizedVideoType } from "@/util/video-type-i18n";
import { CreateDirectorButton } from "@/presentation/components/app/directors/create-director-modal";
import { DirectorPreviewThumb } from "@/presentation/components/director-preview-thumb";

const ease = [0.22, 1, 0.36, 1] as const;

// Library card: name, subtitle, description; system cards add the fork button.
// No transform on the article itself, so the fixed-position modal stays viewport-anchored.
export function DirectorCard({ director }: { director: PublicSkill }) {
  const { t, locale } = useI18n();
  const href = `/app/directors/${director.id}`;
  const name = director.isCustom ? director.title : localizedVideoType(t, director.slug, director.title);
  const description = director.isCustom
    ? director.description
    : localizedVideoBlurb(t, director.slug, director.description || "");
  const subtitle = director.isCustom
    ? localizedVideoType(t, director.behaviorSlug, director.behaviorSlug)
    : "";

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
        <DirectorPreviewThumb previewUrl={director.previewUrl} label={name} size="card" />
        <div className="flex flex-1 flex-col gap-0.5 px-3 py-2.5">
          <h3 className="line-clamp-1 text-xs font-semibold">{name}</h3>
          {director.isCustom ? (
            <p className="line-clamp-1 text-[11px] text-muted">{t("directors.templateBadge", { name: subtitle })}</p>
          ) : subtitle && subtitle !== name ? (
            <p className="line-clamp-1 text-[11px] text-muted">{subtitle}</p>
          ) : null}
          {description ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">{description}</p>
          ) : null}
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--studio-line)] px-3 py-2">
        {director.isCustom ? (
          <p className="text-[11px] text-muted">
            {t("directors.updated", { date: new Date(director.updatedAt).toLocaleDateString(locale) })}
          </p>
        ) : (
          <>
            <span className="text-[11px] text-muted">{t("directors.readOnly")}</span>
            <CreateDirectorButton
              template={director}
              className="inline-flex h-7 cursor-pointer items-center rounded-full border border-accent-ink/15 px-2.5 text-[11px] font-semibold transition hover:border-accent-ink/40"
            />
          </>
        )}
      </div>
    </motion.article>
  );
}
