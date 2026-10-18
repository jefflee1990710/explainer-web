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

// Finished life photos grid, with optional active selection for the right-hand preview dock.
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
          ? "grid grid-cols-3 gap-2"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      }
    >
      {shots.map((shot) => {
        const active = selectedId === shot.id;
        return (
          <figure
            key={shot.id}
            onClick={onSelect ? () => onSelect(shot) : undefined}
            className={`overflow-hidden rounded-xl border bg-paper transition ${
              onSelect ? "cursor-pointer" : ""
            } ${
              active
                ? "border-accent ring-2 ring-accent/30 shadow-[2px_2px_0_0_#12141c]"
                : "border-accent-ink/10 hover:border-accent-ink/30"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot.resultUrl}
              alt=""
              className="aspect-[9/16] w-full object-cover"
            />
            {!compact ? (
              <figcaption className="px-2.5 py-2 text-[11px] leading-snug text-muted">
                <span className="font-bold text-foreground">
                  {shot.characterName}
                </span>
                <span className="mx-1">·</span>
                {t(KIND_KEY[shot.kind as LifeShotKind])}
                <span className="mx-1">·</span>
                {shot.place}
              </figcaption>
            ) : (
              <figcaption className="truncate px-1.5 py-1 text-[10px] font-semibold text-muted">
                {shot.place || shot.characterName}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
