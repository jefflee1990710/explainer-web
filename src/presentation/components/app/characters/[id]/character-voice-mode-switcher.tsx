"use client";

import { useState } from "react";
import type { CharacterVoiceMode } from "@/model/character";
import { setCharacterVoiceModeAction } from "@/presentation/actions/characters";
import { CharacterVoicePanel } from "@/presentation/components/app/characters/[id]/character-voice-panel";
import { CharacterVoiceSamplePanel } from "@/presentation/components/app/characters/[id]/character-voice-sample-panel";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Mutually exclusive radio selector on the AI Influencer Voice tab:
// User can only select Voice lock OR Demo voice (just one).
export function CharacterVoiceModeSwitcher({
  character,
  onSaved,
}: {
  character: PublicCharacter;
  onSaved: (character: PublicCharacter) => void;
}) {
  const { t, locale } = useI18n();
  const isZh = locale.startsWith("zh");
  const [optimisticMode, setOptimisticMode] = useState<CharacterVoiceMode | null>(null);
  const [switching, setSwitching] = useState<CharacterVoiceMode | null>(null);
  const [error, setError] = useState("");

  const mode: CharacterVoiceMode = optimisticMode ?? character.voiceMode ?? "lock";

  const hasDemoSample = Boolean(
    character.voiceSample?.url ||
      (character.voiceSamples && Object.keys(character.voiceSamples).length > 0),
  );

  async function selectMode(nextMode: CharacterVoiceMode) {
    if (nextMode === mode && switching === null) return;
    setOptimisticMode(nextMode);
    setError("");
    setSwitching(nextMode);
    try {
      const result = await setCharacterVoiceModeAction(character.id, nextMode);
      if (!result.ok) {
        setOptimisticMode(null);
        setError(translateAppError(result.error, t));
        return;
      }
      onSaved(result.character);
      setOptimisticMode(null);
    } catch {
      setOptimisticMode(null);
      setError(t("errors.characterVoiceSaveFailed"));
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-6">
      {/* Exclusive 2-option radio selector */}
      <div
        role="radiogroup"
        aria-label={t("characters.voiceTitle")}
        className="grid gap-3 sm:grid-cols-2"
      >
        {/* Option 1: Voice lock */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === "lock"}
          disabled={switching !== null}
          onClick={() => void selectMode("lock")}
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition ${
            mode === "lock"
              ? "border-accent-ink bg-paper shadow-[3px_3px_0_0_#12141c]"
              : "border-accent-ink/15 bg-paper/60 opacity-75 hover:border-accent-ink/35 hover:opacity-100"
          }`}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
              mode === "lock" ? "border-accent-ink bg-accent-ink" : "border-accent-ink/35 bg-paper"
            }`}
          >
            {switching === "lock" ? (
              <Spinner className="h-3 w-3 text-paper" />
            ) : mode === "lock" ? (
              <span className="h-2 w-2 rounded-full bg-paper" />
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {t("characters.voiceTitle")}
              </span>
              {mode === "lock" ? (
                <span className="rounded-full bg-accent-ink px-2 py-0.5 text-[11px] font-semibold text-paper">
                  {isZh ? "使用中" : "Active"}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              {isZh
                ? "使用性別、年齡、音高與音色描述鎖定 AI 聲線（不額外扣點）"
                : "Lock AI voice timbre by gender, age, pitch, and resonance (included)"}
            </p>
          </div>
        </button>

        {/* Option 2: Demo voice */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === "sample"}
          disabled={switching !== null}
          onClick={() => void selectMode("sample")}
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition ${
            mode === "sample"
              ? "border-accent-ink bg-paper shadow-[3px_3px_0_0_#12141c]"
              : "border-accent-ink/15 bg-paper/60 opacity-75 hover:border-accent-ink/35 hover:opacity-100"
          }`}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
              mode === "sample"
                ? "border-accent-ink bg-accent-ink"
                : "border-accent-ink/35 bg-paper"
            }`}
          >
            {switching === "sample" ? (
              <Spinner className="h-3 w-3 text-paper" />
            ) : mode === "sample" ? (
              <span className="h-2 w-2 rounded-full bg-paper" />
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {t("characters.voiceSampleTitle")}
              </span>
              {mode === "sample" ? (
                <span className="rounded-full bg-accent-ink px-2 py-0.5 text-[11px] font-semibold text-paper">
                  {isZh ? "使用中" : "Active"}
                </span>
              ) : hasDemoSample ? (
                <span className="rounded-full border border-accent-ink/20 px-2 py-0.5 text-[11px] font-medium text-muted">
                  {isZh ? "已上傳樣本" : "Sample uploaded"}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              {isZh
                ? "上傳或錄製 5–120 秒真人說話錄音進行 AI 聲音複製"
                : "Upload or record 5–120s of clean speech to clone this voice"}
            </p>
          </div>
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}

      {/* Render only the selected voice mode panel */}
      {mode === "lock" ? (
        <CharacterVoicePanel character={character} onSaved={onSaved} />
      ) : (
        <div className="[&>div]:mt-0">
          <CharacterVoiceSamplePanel character={character} onSaved={onSaved} />
        </div>
      )}
    </div>
  );
}
