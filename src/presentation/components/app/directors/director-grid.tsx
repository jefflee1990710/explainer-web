"use client";

import { MotionConfig } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicSkill } from "@/presentation/serialize";
import { DirectorCard } from "@/presentation/components/app/directors/director-card";

// One titled section of director cards; the "mine" section shows an empty state.
export function DirectorGrid({
  section,
  directors,
}: {
  section: "system" | "mine";
  directors: PublicSkill[];
}) {
  const { t } = useI18n();
  const title = section === "system" ? t("directors.systemSection") : t("directors.mineSection");

  return (
    <section>
      <h2 className="font-display mb-4 text-lg font-bold">{title}</h2>
      {directors.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-10 text-center">
          <p className="text-sm text-muted">{t("directors.mineEmpty")}</p>
        </div>
      ) : (
        <MotionConfig reducedMotion="user">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {directors.map((director) => (
              <DirectorCard key={director.id} director={director} />
            ))}
          </div>
        </MotionConfig>
      )}
    </section>
  );
}
