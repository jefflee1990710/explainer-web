"use client";

import type { LifeShotKind } from "@/model/life-shot-kind";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicLifeShot } from "@/service/character/life";

const KIND_KEY = {
  selfie: "life.selfie",
  food: "life.food",
  street: "life.street",
  hobby: "life.hobby",
} as const;

// Finished life photos grid in an Instagram-style 3-column grid view.
export function LifeShotGrid({
  shots,
  selectedId,
  onSelect,
  compact = false,
}: {
  shots: PublicLifeShot[];
  selectedId?: string;
  onSelect?: (shot: PublicLifeShot) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (!shots.length) {
    return <p className="text-xs text-muted">{t("life.emptyShots")}</p>;
  }
  return (
    <div
      className={
        compact
          ? "grid grid-cols-3 gap-1.5"
          : "grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      }
    >
      {shots.map((shot) => {
        const active = selectedId === shot.id;
        return (
          <figure
            key={shot.id}
            onClick={onSelect ? () => onSelect(shot) : undefined}
            className={`group relative overflow-hidden rounded-xl border bg-paper transition ${
              onSelect ? "cursor-pointer" : ""
            } ${
              active
                ? "border-accent ring-2 ring-accent/40 shadow-[2px_2px_0_0_#12141c]"
                : "border-accent-ink/10 hover:border-accent-ink/30"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot.resultUrl}
              alt={shot.place || shot.characterName}
              className="aspect-square w-full object-cover transition duration-150 group-hover:scale-[1.03]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 via-black/35 to-transparent px-1.5 pt-4 pb-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
              {shot.place || shot.characterName || t(KIND_KEY[shot.kind as LifeShotKind])}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
