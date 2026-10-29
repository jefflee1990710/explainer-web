"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicDirector } from "@/presentation/serialize";
import { DirectorProfileField } from "@/presentation/components/app/directors/[id]/director-profile-field";
import { PROFILE_KEYS, type ProfileKey } from "@/model/director-profile";
import type { DirectorDraft, DraftField } from "@/service/director/director-edits";
import { emptyProfile, EXTRA_INSTRUCTIONS_MAX, PROFILE_FIELD_MAX } from "@/service/director/profile";

// Directly editable profile fields for custom directors; read-only for system directors.
export function DirectorProfileSection({
  director,
  draft,
  changedFields,
  onChangeField,
  onChangeExtra,
}: {
  director: PublicDirector;
  draft: DirectorDraft;
  changedFields: DraftField[];
  onChangeField?: (key: ProfileKey, value: string) => void;
  onChangeExtra?: (value: string) => void;
}) {
  const { t, locale } = useI18n();
  const editable = director.isCustom;
  const profile = editable ? draft.customProfile : director.profile ?? emptyProfile();
  const isZh = locale.startsWith("zh");

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
          {t("directors.profileTitle")}
        </h2>
        {editable ? (
          <p className="text-[11px] text-muted">
            {isZh ? "可直接修改文字或用右側 AI 協助" : "Edit directly or ask AI on the right"}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        {PROFILE_KEYS.map((key) => (
          <DirectorProfileField
            key={key}
            label={t(`directors.profileLabels.${key}`)}
            value={profile[key]}
            editable={editable}
            modified={changedFields.includes(key)}
            maxLength={PROFILE_FIELD_MAX}
            rows={2}
            onChange={(value) => onChangeField?.(key, value)}
          />
        ))}
        {editable ? (
          <DirectorProfileField
            label={t("directors.extraInstructions")}
            hint={t("directors.extraInstructionsHint")}
            value={draft.extraInstructions}
            editable={editable}
            modified={changedFields.includes("extraInstructions")}
            maxLength={EXTRA_INSTRUCTIONS_MAX}
            rows={4}
            onChange={(value) => onChangeExtra?.(value)}
          />
        ) : null}
      </div>
    </div>
  );
}
