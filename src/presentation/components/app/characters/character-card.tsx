"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter } from "@/presentation/serialize";
import { localizedStyleName } from "@/util/style-i18n";

const ease = [0.22, 1, 0.36, 1] as const;

// Library card: default blueprint, name, style, version count, generation state.
export function CharacterCard({ character }: { character: PublicCharacter }) {
  const { t } = useI18n();
  const href = `/app/characters/${character.id}`;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className={`studio-card group flex flex-col overflow-hidden border ${
        character.failed ? "border-[#f04444]" : "border-[var(--studio-line)]"
      }`}
    >
      <Link href={href} className="relative block aspect-video overflow-hidden bg-white">
        {character.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.previewUrl}
            alt={t("characters.blueprintAlt", { name: character.name })}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="studio-grid grid h-full w-full place-items-center">
            <span className="h-9 w-16 rounded-md border-2 border-dashed border-accent-ink/25" />
          </div>
        )}
        {character.pending ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/15 px-2.5 py-1 text-xs font-semibold text-[#1f4fb8]">
            <Spinner className="h-3 w-3" />
            {t("characters.cardGenerating")}
          </span>
        ) : character.failed ? (
          <span className="absolute left-3 top-3 rounded-full border border-accent/30 bg-accent/12 px-2.5 py-1 text-xs font-semibold text-accent">
            {t("characters.cardFailed")}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-medium">{character.name}</h3>
        </Link>
        <p className="mt-auto text-xs text-muted">
          {localizedStyleName(character.styleId)} · {t("characters.versionCount", { n: character.versions.length })}
        </p>
      </div>
    </motion.article>
  );
}
