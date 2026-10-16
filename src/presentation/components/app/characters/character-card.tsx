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
export function CharacterCard({
  character,
  selected = false,
  selectMode = false,
  onToggleSelect,
}: {
  character: PublicCharacter;
  selected?: boolean;
  selectMode?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const { t } = useI18n();
  const href = `/app/characters/${character.id}`;
  const showCheckbox = selectMode || selected;

  const body = (
    <>
      <span
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
          <span
            className={`absolute top-2 inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/15 px-2 py-0.5 text-[11px] font-semibold text-[#1f4fb8] ${
              onToggleSelect ? "left-10" : "left-2"
            }`}
          >
            <Spinner className="h-3 w-3" />
            {t("characters.cardGenerating")}
          </span>
        ) : character.failed ? (
          <span
            className={`absolute top-2 rounded-full border border-accent/30 bg-accent/12 px-2 py-0.5 text-[11px] font-semibold text-accent ${
              onToggleSelect ? "left-10" : "left-2"
            }`}
          >
            {t("characters.cardFailed")}
          </span>
        ) : null}
      </span>
      <span className="flex flex-1 flex-col gap-1 px-3 py-2.5 text-left">
        <h3 className="line-clamp-1 text-sm font-medium">{character.name}</h3>
        <p className="mt-auto text-xs text-muted">
          {character.styleIds.length > 1
            ? t("characters.styleCount", { n: character.styleIds.length })
            : localizedStyleName(character.styleId)}
          {" · "}
          {t("characters.versionCount", { n: character.versions.length })}
        </p>
      </span>
    </>
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className={`studio-card group relative flex flex-col overflow-hidden border transition ${
        selected
          ? "border-[var(--studio-ink)] ring-2 ring-[var(--studio-teal)]"
          : character.failed
            ? "border-[#f04444]"
            : "border-[var(--studio-line)]"
      }`}
    >
      {onToggleSelect ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={t("characters.selectCardAria", { name: character.name })}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSelect(character.id);
          }}
          className={`absolute left-2 top-2 z-20 grid h-6 w-6 cursor-pointer place-items-center rounded-md border shadow-sm transition ${
            selected
              ? "border-[var(--studio-ink)] bg-[var(--studio-ink)] text-[var(--studio-teal)] opacity-100"
              : "border-accent-ink/25 bg-white/95 text-transparent hover:border-accent-ink/60"
          } ${showCheckbox ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="m3.5 8.2 3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}

      {selectMode && onToggleSelect ? (
        <button
          type="button"
          onClick={() => onToggleSelect(character.id)}
          className="flex flex-1 cursor-pointer flex-col text-left"
        >
          {body}
        </button>
      ) : (
        <Link href={href} className="flex flex-1 flex-col">
          {body}
        </Link>
      )}
    </motion.article>
  );
}
