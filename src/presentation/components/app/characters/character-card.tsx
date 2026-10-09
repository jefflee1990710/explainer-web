"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter } from "@/presentation/serialize";
import { BLUEPRINT_BOARD_HEIGHT, BLUEPRINT_BOARD_WIDTH } from "@/service/character/blueprint-board-size";
import { localizedStyleName } from "@/util/style-i18n";

const ease = [0.22, 1, 0.36, 1] as const;

// Library card. The preview is the current blueprint (portrait and full body on one board).
export function CharacterCard({ character }: { character: PublicCharacter }) {
  const { t } = useI18n();
  const href = `/app/characters/${character.id}`;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className={`studio-card flex flex-col overflow-hidden border ${
        character.failed ? "border-[#f04444]" : "border-[var(--studio-line)]"
      }`}
    >
      <Link
        href={href}
        className={`relative block overflow-hidden bg-white ${character.previewIsProfile ? "aspect-[3/4]" : ""}`}
        style={
          character.previewIsProfile
            ? undefined
            : { aspectRatio: `${BLUEPRINT_BOARD_WIDTH} / ${BLUEPRINT_BOARD_HEIGHT}` }
        }
      >
        {character.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.previewUrl}
            alt={t(character.previewIsProfile ? "characters.profileAlt" : "characters.blueprintAlt", {
              name: character.name,
            })}
            loading="lazy"
            className={`h-full w-full object-center ${
              character.previewIsProfile ? "object-cover" : "object-contain"
            }`}
          />
        ) : (
          <div className="studio-grid grid h-full w-full place-items-center">
            <span className="h-16 w-9 rounded-md border-2 border-dashed border-accent-ink/25" />
          </div>
        )}
        {character.pending ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/15 px-2 py-0.5 text-[11px] font-semibold text-[#1f4fb8]">
            <Spinner className="h-3 w-3" />
            {t("characters.cardGenerating")}
          </span>
        ) : character.failed ? (
          <span className="absolute left-2 top-2 rounded-full border border-accent/30 bg-accent/12 px-2 py-0.5 text-[11px] font-semibold text-accent">
            {t("characters.cardFailed")}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
        <Link href={href} className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-medium">{character.name}</h3>
        </Link>
        <p className="mt-auto text-xs text-muted">
          {character.styleIds.length > 1
            ? t("characters.styleCount", { n: character.styleIds.length })
            : localizedStyleName(character.styleId)}
          {" · "}
          {t("characters.versionCount", { n: character.versions.length })}
        </p>
      </div>
    </motion.article>
  );
}
