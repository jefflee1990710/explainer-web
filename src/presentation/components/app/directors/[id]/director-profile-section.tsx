"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicDirector } from "@/presentation/serialize";
import { DirectorProfileField } from "@/presentation/components/app/directors/[id]/director-profile-field";
import { PROFILE_KEYS } from "@/model/skill";
import type { DirectorDraft, DraftField } from "@/service/director/director-edits";
import { EXTRA_INSTRUCTIONS_MAX, PROFILE_FIELD_MAX, emptyProfile, profileLocale } from "@/service/director/profile";

// Profile cards: system directors show their localized profile, custom ones edit the draft.
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
  const { t, locale } = useI18n();
  const editable = director.isCustom;
  const profile = editable ? draft.customProfile : director.profile?.[profileLocale(locale)] ?? emptyProfile();

  return (
    <>
      <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{t("directors.profileTitle")}</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
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
        <div className="mt-3">
          <DirectorProfileField
            label={t("directors.extraInstructions")}
            hint={t("directors.extraInstructionsHint")}
            value={draft.extraInstructions}
            editable
            modified={changedFields.includes("extraInstructions")}
            maxLength={EXTRA_INSTRUCTIONS_MAX}
            rows={6}
            onChange={(extraInstructions) => onChange({ ...draft, extraInstructions })}
          />
        </div>
      ) : null}
    </>
  );
}
