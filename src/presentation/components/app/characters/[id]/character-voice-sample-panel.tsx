"use client";

import { useRef, useState } from "react";
import {
  removeCharacterVoiceSampleAction,
  uploadCharacterVoiceSampleAction,
} from "@/presentation/actions/characters";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import { isVoiceSampleMime, VOICE_SAMPLE_MAX_BYTES } from "@/model/character-voice-sample";
import { translateAppError } from "@/util/i18n/translate-app-error";

const ACCEPT = ".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4";

// Demo voice upload + preview. Clips of a one-character video are re-voiced to it.
export function CharacterVoiceSamplePanel({
  character,
  onSaved,
}: {
  character: PublicCharacter;
  onSaved: (character: PublicCharacter) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const sample = character.voiceSample;

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setSaved(false);
    // Same checks as the server, so a bad file fails before the upload.
    if (!isVoiceSampleMime(file.type)) {
      setError(t("errors.voiceSampleType"));
      return;
    }
    if (file.size > VOICE_SAMPLE_MAX_BYTES) {
      setError(t("errors.voiceSampleTooLarge"));
      return;
    }
    setPending("upload");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await uploadCharacterVoiceSampleAction(character.id, form);
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      onSaved(result.character);
      setSaved(true);
    } catch {
      setError(t("errors.voiceSampleUploadFailed"));
    } finally {
      setPending(null);
    }
  }

  async function onRemove() {
    setError("");
    setSaved(false);
    setPending("remove");
    try {
      const result = await removeCharacterVoiceSampleAction(character.id);
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      onSaved(result.character);
    } catch {
      setError(t("errors.voiceSampleRemoveFailed"));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-accent-ink/10 bg-paper p-4">
      <h3 className="text-sm font-semibold">{t("characters.voiceSampleTitle")}</h3>
      <p className="mt-1 text-sm text-muted">{t("characters.voiceSampleHint")}</p>
      {sample ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <audio controls preload="none" src={sample.url} className="h-10 max-w-full" />
          <span className="text-sm text-muted">
            {t("characters.voiceSampleSeconds", { seconds: Math.round(sample.durationSeconds) })}
          </span>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending !== null}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "upload" ? <Spinner className="h-4 w-4" /> : null}
          {sample ? t("characters.voiceSampleReplace") : t("characters.voiceSampleUpload")}
        </button>
        {sample ? (
          <button
            type="button"
            onClick={() => void onRemove()}
            disabled={pending !== null}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "remove" ? <Spinner className="h-4 w-4" /> : null}
            {t("characters.voiceSampleRemove")}
          </button>
        ) : null}
        {saved ? <p className="text-sm text-muted">{t("characters.voiceSampleSaved")}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => void onPick(event)}
      />
    </div>
  );
}
