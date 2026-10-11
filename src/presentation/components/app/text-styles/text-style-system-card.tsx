"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { CreateFromLookButton } from "@/presentation/components/app/text-styles/create-from-look-modal";
import {
  SYSTEM_TEXT_STYLE_ORDER,
  systemTextStylePreview,
  type SubtitleLook,
} from "@/service/director/subtitle-look";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";

// One reference still. Fork opens a custom copy the user can edit with AI chat.
export function TextStyleSystemCard({ look }: { look: SubtitleLook }) {
  const { t } = useI18n();
  const label = subtitleLookLabel(t, look);

  return (
    <article className="studio-card flex flex-col overflow-hidden border border-[var(--studio-line)]">
      <span className="relative block aspect-video w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={systemTextStylePreview(look)} alt="" className="h-full w-full object-contain" />
      </span>
      <div className="flex flex-1 flex-col gap-0.5 px-3 py-2.5">
        <h3 className="text-xs font-semibold">{label.label}</h3>
        <p className="line-clamp-2 text-[11px] leading-4 text-muted">{label.sublabel}</p>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--studio-line)] px-3 py-2">
        <span className="text-[11px] text-muted">{t("textStyles.systemBadge")}</span>
        <CreateFromLookButton look={look} />
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
        {SYSTEM_TEXT_STYLE_ORDER.map((look) => (
          <TextStyleSystemCard key={look} look={look} />
        ))}
      </div>
    </section>
  );
}
