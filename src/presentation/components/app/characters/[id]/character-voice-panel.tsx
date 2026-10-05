"use client";

import { useState } from "react";
import type { CharacterVoice } from "@/model/character-voice";
import {
  saveCharacterVoiceAction,
  suggestCharacterVoiceAction,
} from "@/presentation/actions/characters";
import { CharacterVoiceFields } from "@/presentation/components/app/characters/character-voice-fields";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import { DEFAULT_CHARACTER_VOICE } from "@/service/director/character-voice";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Voice is stored on the character, not on a blueprint version.
export function CharacterVoicePanel({
  character,
  onSaved,
}: {
  character: PublicCharacter;
  onSaved: (character: PublicCharacter) => void;
}) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(Boolean(character.voice));
  const [voice, setVoice] = useState<CharacterVoice>(
    character.voice
      ? { ...DEFAULT_CHARACTER_VOICE, ...character.voice, weight: character.voice.weight ?? "medium" }
      : DEFAULT_CHARACTER_VOICE,
  );
  const [pending, setPending] = useState(false);
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [filled, setFilled] = useState(false);
  const busy = pending || filling;

  async function onSave() {
    setPending(true);
    setError("");
    setSaved(false);
    setFilled(false);
    try {
      const result = await saveCharacterVoiceAction(character.id, enabled ? voice : null);
      setPending(false);
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      onSaved(result.character);
      setSaved(true);
    } catch {
      setError(t("errors.characterVoiceSaveFailed"));
      setPending(false);
    }
  }

  // Infers from the blueprint and stores the lock. Manual Save voice is unchanged.
  async function onFill() {
    setFilling(true);
    setError("");
    setSaved(false);
    setFilled(false);
    try {
      const result = await suggestCharacterVoiceAction(character.id);
      setFilling(false);
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      const savedVoice = result.character.voice ?? DEFAULT_CHARACTER_VOICE;
      setEnabled(Boolean(result.character.voice));
      setVoice({
        ...DEFAULT_CHARACTER_VOICE,
        ...savedVoice,
        weight: savedVoice.weight ?? "medium",
      });
      onSaved(result.character);
      setFilled(true);
    } catch {
      setError(t("errors.characterVoiceFillFailed"));
      setFilling(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent-ink/10 bg-paper p-4">
      <CharacterVoiceFields
        name={character.name}
        enabled={enabled}
        value={voice}
        disabled={busy}
        onEnabled={(next) => {
          setEnabled(next);
          setSaved(false);
          setFilled(false);
        }}
        onChange={(next) => {
          setVoice(next);
          setSaved(false);
          setFilled(false);
        }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onFill()}
          disabled={busy || !character.previewUrl}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {filling ? <Spinner className="h-4 w-4" /> : null}
          {t("characters.voiceFill")}
        </button>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={busy}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Spinner className="h-4 w-4" /> : null}
          {t("characters.voiceSave")}
        </button>
        {!character.previewUrl ? (
          <p className="text-sm text-muted">{t("characters.voiceFillNeedsBlueprint")}</p>
        ) : null}
        {filled ? <p className="text-sm text-muted">{t("characters.voiceFilled")}</p> : null}
        {saved ? <p className="text-sm text-muted">{t("characters.voiceSaved")}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
