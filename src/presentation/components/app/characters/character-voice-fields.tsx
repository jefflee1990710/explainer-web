"use client";

import type { ReactNode } from "react";
import {
  CHARACTER_VOICE_AGES,
  CHARACTER_VOICE_PITCHES,
  CHARACTER_VOICE_RESONANCES,
  CHARACTER_VOICE_TEXTURES,
  CHARACTER_VOICE_WEIGHTS,
  VOICE_NOTE_MAX,
  type CharacterVoice,
  type CharacterVoiceAge,
  type CharacterVoicePitch,
  type CharacterVoiceResonance,
  type CharacterVoiceTexture,
  type CharacterVoiceWeight,
} from "@/model/character-voice";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  characterVoiceFingerprint,
} from "@/service/director/character-voice";
import { VOICE_IDS } from "@/service/director/voice";
import type { VoiceGender } from "@/model/project";

const SELECT_CLASS =
  "min-h-[44px] w-full border border-accent-ink/15 bg-paper px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

// Acoustic picks that compile into one sentence. The sentence is what the video model hears.
export function CharacterVoiceFields({
  name,
  enabled,
  value,
  disabled,
  auto,
  onEnabled,
  onChange,
}: {
  name: string;
  enabled: boolean;
  value: CharacterVoice;
  disabled?: boolean;
  // Create form: leaving the lock off still runs inference on submit.
  auto?: boolean;
  onEnabled: (enabled: boolean) => void;
  onChange: (value: CharacterVoice) => void;
}) {
  const { t } = useI18n();
  const previewName = name.trim() || "NAME";

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">{t("characters.voiceTitle")}</legend>
      <p className="text-xs leading-5 text-muted">{t("characters.voiceHint")}</p>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onEnabled(event.target.checked)}
        />
        {t("characters.voiceEnabled")}
      </label>
      {enabled ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("characters.voiceGender")}>
              <select
                className={SELECT_CLASS}
                value={value.gender}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, gender: event.target.value as VoiceGender })}
              >
                {VOICE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {t(`characters.voiceGender${id === "male" ? "Male" : "Female"}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("characters.voiceAge")}>
              <select
                className={SELECT_CLASS}
                value={value.age}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, age: event.target.value as CharacterVoiceAge })}
              >
                {CHARACTER_VOICE_AGES.map((id) => (
                  <option key={id} value={id}>
                    {t(`characters.voiceAge${ageKey(id)}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("characters.voicePitch")} hint={t("characters.voicePitchHint")}>
              <select
                className={SELECT_CLASS}
                value={value.pitch}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, pitch: event.target.value as CharacterVoicePitch })}
              >
                {CHARACTER_VOICE_PITCHES.map((id) => (
                  <option key={id} value={id}>
                    {t(`characters.voicePitch${pitchKey(id)}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("characters.voiceResonance")} hint={t("characters.voiceResonanceHint")}>
              <select
                className={SELECT_CLASS}
                value={value.resonance}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ ...value, resonance: event.target.value as CharacterVoiceResonance })
                }
              >
                {CHARACTER_VOICE_RESONANCES.map((id) => (
                  <option key={id} value={id}>
                    {t(`characters.voiceResonance${resonanceKey(id)}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("characters.voiceTexture")} hint={t("characters.voiceTextureHint")}>
              <select
                className={SELECT_CLASS}
                value={value.texture}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ ...value, texture: event.target.value as CharacterVoiceTexture })
                }
              >
                {CHARACTER_VOICE_TEXTURES.map((id) => (
                  <option key={id} value={id}>
                    {t(`characters.voiceTexture${textureKey(id)}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("characters.voiceWeight")} hint={t("characters.voiceWeightHint")}>
              <select
                className={SELECT_CLASS}
                value={value.weight ?? "medium"}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ ...value, weight: event.target.value as CharacterVoiceWeight })
                }
              >
                {CHARACTER_VOICE_WEIGHTS.map((id) => (
                  <option key={id} value={id}>
                    {t(`characters.voiceWeight${weightKey(id)}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              {t("characters.voiceNote")}
              <span className="font-normal text-muted">
                {(value.note ?? "").length}/{VOICE_NOTE_MAX}
              </span>
            </span>
            <input
              type="text"
              maxLength={VOICE_NOTE_MAX}
              value={value.note ?? ""}
              disabled={disabled}
              placeholder={t("characters.voiceNotePlaceholder")}
              onChange={(event) =>
                onChange({ ...value, note: event.target.value.slice(0, VOICE_NOTE_MAX) })
              }
              className="min-h-[44px] w-full border border-accent-ink/15 bg-paper px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
            <span className="mt-1 block text-xs leading-5 text-muted">{t("characters.voiceNoteHint")}</span>
          </label>
          <p className="text-xs font-semibold">{t("characters.voicePreview")}</p>
          <p className="rounded-lg border border-accent-ink/10 bg-[var(--studio-fill)] px-3 py-2 text-xs leading-5 text-muted">
            {characterVoiceFingerprint(previewName, value)}
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}

function weightKey(id: CharacterVoiceWeight) {
  if (id === "light") return "Light";
  if (id === "heavy") return "Heavy";
  return "Medium";
}

function ageKey(id: CharacterVoiceAge) {
  if (id === "young-adult") return "YoungAdult";
  if (id === "older") return "Older";
  return "Adult";
}

function pitchKey(id: CharacterVoicePitch) {
  if (id === "mid-low") return "MidLow";
  if (id === "mid-high") return "MidHigh";
  if (id === "low") return "Low";
  if (id === "high") return "High";
  return "Mid";
}

function resonanceKey(id: CharacterVoiceResonance) {
  if (id === "chesty") return "Chesty";
  if (id === "bright") return "Bright";
  return "Mixed";
}

function textureKey(id: CharacterVoiceTexture) {
  if (id === "dry") return "Dry";
  if (id === "soft") return "Soft";
  if (id === "crisp") return "Crisp";
  return "Warm";
}
