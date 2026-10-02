"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicSkill } from "@/presentation/serialize";
import { localizedVideoType } from "@/util/video-type-i18n";
import { CreateDirectorButton } from "@/presentation/components/app/directors/create-director-modal";

const ease = [0.22, 1, 0.36, 1] as const;

// Library card: name, subtitle, description; system cards add the fork button.
// No transform on the article itself, so the fixed-position modal stays viewport-anchored.
export function DirectorCard({ director }: { director: PublicSkill }) {
  const { t, locale } = useI18n();
  const href = `/app/directors/${director.id}`;
  const name = director.isCustom ? director.title : localizedVideoType(t, director.behaviorSlug, director.title);
  // System: the other language under the locale name. Custom: the template it was forked from.
  const subtitle = director.isCustom
    ? localizedVideoType(t, director.behaviorSlug, "") || director.behaviorSlug
    : name === director.title
      ? director.titleZh
      : director.title;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className="studio-card group flex flex-col overflow-hidden border border-[var(--studio-line)]"
    >
      <Link
        href={href}
        className="flex flex-1 flex-col gap-1 p-4 transition-colors hover:bg-accent-ink/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <h3 className="line-clamp-1 text-sm font-semibold">{name}</h3>
        {director.isCustom ? (
          <p className="line-clamp-1 text-xs text-muted">{t("directors.templateBadge", { name: subtitle })}</p>
        ) : subtitle && subtitle !== name ? (
          <p className="line-clamp-1 text-xs text-muted">{subtitle}</p>
        ) : null}
        {director.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{director.description}</p>
        ) : null}
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--studio-line)] px-4 py-3">
        {director.isCustom ? (
          <p className="text-xs text-muted">
            {t("directors.updated", { date: new Date(director.updatedAt).toLocaleDateString(locale) })}
          </p>
        ) : (
          <>
            <span className="text-xs text-muted">{t("directors.readOnly")}</span>
            <CreateDirectorButton
              template={director}
              className="inline-flex min-h-[36px] cursor-pointer items-center rounded-full border border-accent-ink/15 px-3 text-xs font-semibold transition hover:border-accent-ink/40"
            />
          </>
        )}
      </div>
    </motion.article>
  );
}
