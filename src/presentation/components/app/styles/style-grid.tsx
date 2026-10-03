"use client";

import { MotionConfig } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicStyle } from "@/presentation/serialize";
import { StyleCard } from "@/presentation/components/app/styles/style-card";

// One titled section of style cards; an empty mine section explains how to start.
export function StyleGrid({
  section,
  styles,
}: {
  section: "system" | "mine";
  styles: PublicStyle[];
}) {
  const { t } = useI18n();
  const title = section === "system" ? t("styles.systemSection") : t("styles.mineSection");

  return (
    <section>
      <h2 className="font-display mb-4 text-lg font-bold">{title}</h2>
      {styles.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-10 text-center">
          <p className="text-sm text-muted">{t("styles.mineEmpty")}</p>
        </div>
      ) : (
        <MotionConfig reducedMotion="user">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {styles.map((style) => (
              <StyleCard key={style.id} style={style} />
            ))}
          </div>
        </MotionConfig>
      )}
    </section>
  );
}
