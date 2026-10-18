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

// Finished life photos. They stay off the character blueprint.
export function LifeShotGrid({ shots }: { shots: PublicLifeShot[] }) {
  const { t } = useI18n();
  if (!shots.length) {
    return <p className="text-sm text-muted">{t("life.emptyShots")}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {shots.map((shot) => (
        <figure key={shot.id} className="overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot.resultUrl} alt="" className="aspect-[9/16] w-full object-cover" />
          <figcaption className="px-2.5 py-2 text-[11px] leading-snug text-muted">
            <span className="font-bold text-foreground">{shot.characterName}</span>
            <span className="mx-1">·</span>
            {t(KIND_KEY[shot.kind as LifeShotKind])}
            <span className="mx-1">·</span>
            {shot.place}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
