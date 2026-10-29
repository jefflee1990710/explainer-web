"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicDirector } from "@/presentation/serialize";
import { DirectorProfileField } from "@/presentation/components/app/directors/[id]/director-profile-field";
import {
  PERFORMANCE_FIELD_PREFIX,
  PERFORMANCE_KEYS,
  type PerformanceKey,
} from "@/model/director-performance";
import type { DirectorDraft, DraftField } from "@/service/director/director-edits";
import { PERFORMANCE_FIELD_MAX } from "@/service/director/performance";

// Directly editable on-camera performance slots for custom lip-sync directors; read-only for system ones.
export function DirectorPerformanceSection({
  director,
  draft,
  changedFields,
  onChangeSlot,
}: {
  director: PublicDirector;
  draft: DirectorDraft;
  changedFields: DraftField[];
  onChangeSlot?: (key: PerformanceKey, value: string) => void;
}) {
  const { t } = useI18n();
  const editable = director.isCustom;
  const slots = editable ? draft.customPerformance : director.performance;
  if (!slots) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-accent-ink/10 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
          {t("directors.performanceTitle")}
        </h2>
      </div>
      <div className="space-y-2">
        {PERFORMANCE_KEYS.map((key) => (
          <DirectorProfileField
            key={key}
            label={t(`directors.performanceLabels.${key}`)}
            value={slots[key]}
            editable={editable}
            modified={changedFields.includes(`${PERFORMANCE_FIELD_PREFIX}${key}`)}
            maxLength={PERFORMANCE_FIELD_MAX}
            rows={2}
            onChange={(value) => onChangeSlot?.(key, value)}
          />
        ))}
      </div>
    </div>
  );
}
