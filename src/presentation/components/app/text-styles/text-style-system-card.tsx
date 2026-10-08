"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { SUBTITLE_LOOKS, type SubtitleLook } from "@/service/director/subtitle-look";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";

const SAMPLE: Record<SubtitleLook, string> = {
  handwritten: "font-serif text-2xl italic",
  clean: "bg-white font-sans text-lg font-medium",
  bold: "font-sans text-2xl font-black tracking-tight",
};

// One extracted appearance. These cards are not edited; upload a sample to make your own.
export function TextStyleSystemCard({ look }: { look: SubtitleLook }) {
  const { t } = useI18n();
  const label = subtitleLookLabel(t, look);

  return (
    <article className="studio-card flex flex-col overflow-hidden border border-[var(--studio-line)]">
      <span className={`grid aspect-video place-items-center bg-paper ${SAMPLE[look]}`}>Aa</span>
      <div className="flex flex-1 flex-col gap-0.5 px-3 py-2.5">
        <h3 className="text-xs font-semibold">{label.label}</h3>
        <p className="line-clamp-2 text-[11px] leading-4 text-muted">{label.sublabel}</p>
      </div>
      <div className="border-t border-[var(--studio-line)] px-3 py-2">
        <span className="text-[11px] text-muted">{t("textStyles.systemBadge")}</span>
      </div>
    </article>
  );
}

export function TextStyleSystemGrid() {
  const { t } = useI18n();
  return (
    <section>
      <h2 className="font-display mb-4 text-lg font-bold">{t("textStyles.systemSection")}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {SUBTITLE_LOOKS.map((look) => (
          <TextStyleSystemCard key={look} look={look} />
        ))}
      </div>
    </section>
  );
}
