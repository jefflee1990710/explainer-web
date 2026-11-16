"use client";

import type { CharacterVoice } from "@/model/character-voice";
import { VoicePicker } from "@/presentation/components/app/projects/new/voice-picker";
import { useI18n } from "@/presentation/components/i18n-provider";
import { characterVoiceGenderLock } from "@/service/director/character-voice";

// Voice lock is only male or female. That choice is the ElevenLabs speaker.
export function CharacterVoiceFields({
  enabled,
  value,
  disabled,
  auto,
  hideEnableCheckbox,
  onEnabled,
  onChange,
}: {
  name: string;
  enabled: boolean;
  value: CharacterVoice;
  disabled?: boolean;
  // Create form: leaving the lock off still runs inference on submit.
  auto?: boolean;
  // Character Voice tab: mode switcher already selects Voice lock vs Demo voice.
  hideEnableCheckbox?: boolean;
  onEnabled: (enabled: boolean) => void;
  onChange: (value: CharacterVoice) => void;
}) {
  const { t } = useI18n();
  const showFields = hideEnableCheckbox ? true : enabled;
  const speaker =
    value.gender === "female"
      ? t("characters.voiceLockSpeakerFemale")
      : t("characters.voiceLockSpeakerMale");

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">{t("characters.voiceTitle")}</legend>
      <p className="text-xs leading-5 text-muted">{t("characters.voiceHint")}</p>
      {!hideEnableCheckbox ? (
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(event) => onEnabled(event.target.checked)}
          />
          {t("characters.voiceEnabled")}
        </label>
      ) : null}
      {showFields ? (
        <>
          <VoicePicker
            value={value.gender}
            disabled={disabled}
            layoutId="character-voice-highlight"
            ariaLabel={t("characters.voiceGender")}
            onChange={(gender) => onChange(characterVoiceGenderLock(gender))}
          />
          <p className="text-xs font-semibold">{t("characters.voicePreview")}</p>
          <p className="rounded-lg border border-accent-ink/10 bg-[var(--studio-fill)] px-3 py-2 text-xs leading-5 text-muted">
            {speaker}
          </p>
        </>
      ) : (
        <p className="text-xs leading-5 text-muted">
          {auto ? t("characters.voiceAutoUnset") : t("characters.voiceUnset")}
        </p>
      )}
    </fieldset>
  );
}
