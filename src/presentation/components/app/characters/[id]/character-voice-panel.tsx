"use client";

import { useState } from "react";
import type { CharacterVoice } from "@/model/character-voice";
import { saveCharacterVoiceAction } from "@/presentation/actions/characters";
import { CharacterVoiceFields } from "@/presentation/components/app/characters/character-voice-fields";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import { characterVoiceGenderLock } from "@/service/director/character-voice";
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
  const [enabled, setEnabled] = useState(true);
  const [voice, setVoice] = useState<CharacterVoice>(
    characterVoiceGenderLock(character.voice?.gender === "female" ? "female" : "male"),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onSave() {
    setPending(true);
    setError("");
    setSaved(false);
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

  return (
    <div className="rounded-2xl border border-accent-ink/10 bg-paper p-4">
      <CharacterVoiceFields
        name={character.name}
        enabled={enabled}
        hideEnableCheckbox
        value={voice}
        disabled={pending}
        onEnabled={(next) => {
          setEnabled(next);
          setSaved(false);
        }}
        onChange={(next) => {
          setVoice(next);
          setSaved(false);
        }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={pending}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Spinner className="h-4 w-4" /> : null}
          {t("characters.voiceSave")}
        </button>
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
