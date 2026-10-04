"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicDirector } from "@/presentation/serialize";
import { DirectorProfileField } from "@/presentation/components/app/directors/[id]/director-profile-field";
import { PROFILE_KEYS } from "@/model/director-profile";
import type { DirectorDraft, DraftField } from "@/service/director/director-edits";
import { EXTRA_INSTRUCTIONS_MAX, PROFILE_FIELD_MAX, emptyProfile } from "@/service/director/profile";

// Profile cards: system directors show the English profile, custom ones edit the draft.
export function DirectorProfileSection({
  director,
  draft,
  changedFields,
  onChange,
}: {
  director: PublicDirector;
  draft: DirectorDraft;
  changedFields: DraftField[];
  onChange: (next: DirectorDraft) => void;
}) {
  const { t } = useI18n();
  const editable = director.isCustom;
  const profile = editable ? draft.customProfile : director.profile ?? emptyProfile();

  return (
    <>
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{t("directors.profileTitle")}</h2>
      <div className="mt-2 grid gap-2">
        {PROFILE_KEYS.map((key) => (
          <DirectorProfileField
            key={key}
            label={t(`directors.profileLabels.${key}`)}
            value={profile[key]}
            editable={editable}
            modified={changedFields.includes(key)}
            maxLength={PROFILE_FIELD_MAX}
            onChange={(value) => onChange({ ...draft, customProfile: { ...draft.customProfile, [key]: value } })}
          />
        ))}
      </div>
      {editable ? (
        <div className="mt-2">
          <DirectorProfileField
            label={t("directors.extraInstructions")}
            hint={t("directors.extraInstructionsHint")}
            value={draft.extraInstructions}
            editable
            modified={changedFields.includes("extraInstructions")}
            maxLength={EXTRA_INSTRUCTIONS_MAX}
            rows={4}
            onChange={(extraInstructions) => onChange({ ...draft, extraInstructions })}
          />
        </div>
      ) : null}
    </>
  );
}
