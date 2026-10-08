"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { TextStyleCard } from "@/presentation/components/app/text-styles/text-style-card";
import type { PublicTextStyle } from "@/presentation/serialize";

// The user's uploaded lettering samples.
export function TextStyleGrid({ styles }: { styles: PublicTextStyle[] }) {
  const { t } = useI18n();

  return (
    <section>
      <h2 className="font-display mb-4 text-lg font-bold">{t("textStyles.mineSection")}</h2>
      {styles.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-accent-ink/20 bg-paper/60 p-10 text-center">
          <p className="text-sm text-muted">{t("textStyles.mineEmpty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {styles.map((style) => (
            <TextStyleCard key={style.id} style={style} />
          ))}
        </div>
      )}
    </section>
  );
}
