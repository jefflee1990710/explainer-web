"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicDirector } from "@/presentation/serialize";
import { DirectorSpecRow } from "@/presentation/components/app/directors/[id]/director-spec-row";
import { PROFILE_KEYS } from "@/model/director-profile";
import type { DirectorDraft, DraftField } from "@/service/director/director-edits";
import { emptyProfile } from "@/service/director/profile";

// Read-only profile sheet. Edits go through AI chat, not these rows.
export function DirectorProfileSection({
  director,
  draft,
  changedFields,
}: {
  director: PublicDirector;
  draft: DirectorDraft;
  changedFields: DraftField[];
}) {
  const { t } = useI18n();
  const editable = director.isCustom;
  const profile = editable ? draft.customProfile : director.profile ?? emptyProfile();

  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {t("directors.profileTitle")}
        </h2>
        {editable ? <p className="text-[11px] text-muted">{t("directors.fieldsHint")}</p> : null}
      </div>
      <dl className="mt-1">
        {PROFILE_KEYS.map((key) => (
          <DirectorSpecRow
            key={key}
            label={t(`directors.profileLabels.${key}`)}
            value={profile[key]}
            modified={changedFields.includes(key)}
          />
        ))}
        {editable ? (
          <DirectorSpecRow
            label={t("directors.extraInstructions")}
            value={draft.extraInstructions}
            modified={changedFields.includes("extraInstructions")}
          />
        ) : null}
      </dl>
    </>
  );
}
