"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicDirector } from "@/presentation/serialize";
import { DirectorSpecRow } from "@/presentation/components/app/directors/[id]/director-spec-row";
import { PERFORMANCE_FIELD_PREFIX, PERFORMANCE_KEYS } from "@/model/director-performance";
import type { DirectorDraft, DraftField } from "@/service/director/director-edits";

// Read-only on-camera performance slots (talking-head family). Edits go through AI chat.
// Renders nothing for directors without slots.
export function DirectorPerformanceSection({
  director,
  draft,
  changedFields,
}: {
  director: PublicDirector;
  draft: DirectorDraft;
  changedFields: DraftField[];
}) {
  const { t } = useI18n();
  const slots = director.isCustom ? draft.customPerformance : director.performance;
  if (!slots) return null;

  return (
    <>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {t("directors.performanceTitle")}
        </h2>
      </div>
      <dl className="mt-1">
        {PERFORMANCE_KEYS.map((key) => (
          <DirectorSpecRow
            key={key}
            label={t(`directors.performanceLabels.${key}`)}
            value={slots[key]}
            modified={changedFields.includes(`${PERFORMANCE_FIELD_PREFIX}${key}`)}
          />
        ))}
      </dl>
    </>
  );
}
