"use client";

import { useState } from "react";
import { AddCharacterStyleDialog } from "@/presentation/components/app/characters/[id]/add-character-style-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicCharacter, PublicStyle } from "@/presentation/serialize";
import { localizedStyleName } from "@/util/style-i18n";
import { isStyleId, type StyleId } from "@/model/style-id";

function labelFor(styleId: string, styles: PublicStyle[]) {
  const style = styles.find((item) => item.id === styleId);
  if (style?.isCustom) return style.name;
  if (isStyleId(styleId)) return localizedStyleName(styleId as StyleId);
  return style?.name || styleId;
}

// Left of the version list: one row per style already on this character.
export function CharacterStyleColumn({
  character,
  styles,
  styleLimit,
  activeStyleId,
  onSelect,
  onAdded,
  onNeedCredits,
}: {
  character: PublicCharacter;
  styles: PublicStyle[];
  styleLimit: number;
  activeStyleId: string;
  onSelect: (styleId: string) => void;
  onAdded: (character: PublicCharacter, styleId: string) => void;
  onNeedCredits: (styleId: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const atLimit = character.styleIds.length >= styleLimit;

  return (
    <div className="flex h-full max-h-80 min-h-0 flex-col rounded-[1.5rem] border border-accent-ink/10 bg-paper/85 p-3 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)] md:max-h-none">
      <div className="flex shrink-0 items-center justify-between gap-2 px-1 pb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {t("characters.stylesHeading")}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={atLimit}
          className="inline-flex h-7 cursor-pointer items-center rounded-full bg-accent-ink px-2.5 text-[11px] font-semibold text-paper transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("characters.addStyle")}
        </button>
      </div>
      <p className="shrink-0 px-1 pb-2 text-[11px] leading-4 text-muted">
        {atLimit
          ? styleLimit <= 1
            ? t("characters.addStyleNeedSubscribe")
            : t("characters.addStyleAtLimit", { limit: styleLimit })
          : t("characters.styleUsage", { used: character.styleIds.length, limit: styleLimit })}
      </p>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {character.styleIds.map((styleId) => {
          const selected = styleId === activeStyleId;
          const name = labelFor(styleId, styles);
          const catalog = styles.find((style) => style.id === styleId);
          const portrait = character.versions.find(
            (version) => version.id === character.defaultByStyle[styleId],
          )?.profileUrl;
          const thumb = portrait || catalog?.previewUrl;
          return (
            <li key={styleId}>
              <button
                type="button"
                onClick={() => onSelect(styleId)}
                aria-label={name}
                title={name}
                aria-current={selected ? "true" : undefined}
                className={`block w-full cursor-pointer overflow-hidden rounded-lg border-2 transition ${
                  selected ? "border-accent-ink" : "border-transparent hover:border-accent-ink/25"
                }`}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className={`aspect-video w-full bg-white ${portrait ? "object-contain object-center" : "object-cover"}`}
                  />
                ) : (
                  <span
                    aria-hidden
                    className="block aspect-video w-full border border-dashed border-accent-ink/20"
                    style={{ backgroundColor: catalog?.canvasColor || "#f4f1ea" }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {open ? (
        <AddCharacterStyleDialog
          character={character}
          styles={styles}
          onClose={() => setOpen(false)}
          onAdded={(next, styleId) => {
            setOpen(false);
            onAdded(next, styleId);
          }}
          onNeedCredits={(styleId) => {
            setOpen(false);
            onNeedCredits(styleId);
          }}
        />
      ) : null}
    </div>
  );
}
