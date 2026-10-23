"use client";

import { useRef, useState } from "react";
import {
  removeCharacterVoiceSampleAction,
  uploadCharacterVoiceSampleAction,
} from "@/presentation/actions/characters";
import { CharacterVoiceRecorder } from "@/presentation/components/app/characters/[id]/character-voice-recorder";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import {
  isVoiceSampleMime,
  VOICE_SAMPLE_LANGUAGES,
  VOICE_SAMPLE_MAX_BYTES,
  type VoiceSampleLanguage,
} from "@/model/character-voice-sample";
import { translateAppError } from "@/util/i18n/translate-app-error";

const ACCEPT = ".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4";

const LANGUAGE_LABELS: Record<VoiceSampleLanguage, string> = {
  yue: "廣東話",
  zh: "普通話 / 國語",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  id: "Bahasa Indonesia",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  ru: "Русский",
  vi: "Tiếng Việt",
  th: "ไทย",
  ms: "Bahasa Melayu",
  fil: "Filipino",
  hi: "हिन्दी",
  ar: "العربية",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  tr: "Türkçe",
};

const PRIMARY_SAMPLE_LANGUAGES: readonly VoiceSampleLanguage[] = [
  "yue",
  "zh",
  "en",
  "ja",
  "ko",
];

// Demo voice upload + preview. Clips of a one-character video are re-voiced to it.
export function CharacterVoiceSamplePanel({
  character,
  onSaved,
}: {
  character: PublicCharacter;
  onSaved: (character: PublicCharacter) => void;
}) {
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<"append" | "replace">("replace");
  const [selectedLang, setSelectedLang] = useState<VoiceSampleLanguage>(
    character.voiceSample?.language ?? "yue",
  );
  const [showAllLangs, setShowAllLangs] = useState(
    () => !PRIMARY_SAMPLE_LANGUAGES.includes(character.voiceSample?.language ?? "yue"),
  );
  const [recorderOpen, setRecorderOpen] = useState(
    () => !character.voiceSample && !character.voiceSamples,
  );
  const [pending, setPending] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const sample =
    character.voiceSamples?.[selectedLang] ??
    ((character.voiceSample?.language ?? "yue") === selectedLang
      ? character.voiceSample
      : null);
  const clips =
    sample?.clips && sample.clips.length > 0
      ? sample.clips
      : sample
        ? [{ url: sample.url, durationSeconds: sample.durationSeconds }]
        : [];

  function openPicker(mode: "append" | "replace") {
    modeRef.current = mode;
    inputRef.current?.click();
  }

  async function uploadFiles(picked: File[], mode: "append" | "replace") {
    if (picked.length === 0) return;
    setError("");
    setSaved(false);
    for (const file of picked) {
      if (!isVoiceSampleMime(file.type)) {
        setError(t("errors.voiceSampleType"));
        return;
      }
      if (file.size > VOICE_SAMPLE_MAX_BYTES) {
        setError(t("errors.voiceSampleTooLarge"));
        return;
      }
    }
    setPending("upload");
    try {
      const form = new FormData();
      form.append("mode", mode);
      form.append("language", selectedLang);
      for (const file of picked) {
        form.append("files", file);
      }
      const result = await uploadCharacterVoiceSampleAction(character.id, form);
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      onSaved(result.character);
      setSaved(true);
      setRecorderOpen(false);
    } catch {
      setError(t("errors.voiceSampleUploadFailed"));
    } finally {
      setPending(null);
    }
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    await uploadFiles(picked, modeRef.current);
  }

  async function onRemove(clipUrl?: string) {
    setError("");
    setSaved(false);
    setPending("remove");
    try {
      const result = await removeCharacterVoiceSampleAction(
        character.id,
        clipUrl,
        selectedLang,
      );
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
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {VOICE_SAMPLE_LANGUAGES.filter((lang) => {
          if (showAllLangs) return true;
          if (PRIMARY_SAMPLE_LANGUAGES.includes(lang)) return true;
          if (selectedLang === lang) return true;
          const hasSample = Boolean(
            character.voiceSamples?.[lang] ||
              (!character.voiceSamples &&
                character.voiceSample &&
                (character.voiceSample.language ?? "yue") === lang),
          );
          return hasSample;
        }).map((lang) => {
          const active = selectedLang === lang;
          const hasLangSample = Boolean(
            character.voiceSamples?.[lang] ||
              (!character.voiceSamples &&
                character.voiceSample &&
                (character.voiceSample.language ?? "yue") === lang),
          );
          return (
            <button
              key={lang}
              type="button"
              onClick={() => {
                setSelectedLang(lang);
                setError("");
                setSaved(false);
              }}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-accent-ink text-white"
                  : "border border-accent-ink/15 bg-paper text-accent-ink hover:bg-accent-ink/5"
              }`}
            >
              <span>{LANGUAGE_LABELS[lang]}</span>
              {hasLangSample ? (
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-emerald-500"}`}
                />
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowAllLangs((prev) => !prev)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-accent-ink/25 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-accent-ink/50 hover:text-accent-ink"
        >
          {showAllLangs
            ? locale.startsWith("zh")
              ? "收起語言 ↑"
              : "Fewer ↑"
            : locale.startsWith("zh")
              ? `+ 更多語言 (${VOICE_SAMPLE_LANGUAGES.length - PRIMARY_SAMPLE_LANGUAGES.length})`
              : `+ More (${VOICE_SAMPLE_LANGUAGES.length - PRIMARY_SAMPLE_LANGUAGES.length})`}
        </button>
      </div>
      {clips.length > 0 ? (
        <div className="mt-3 space-y-2">
          {clips.map((clip, index) => (
            <div key={clip.url} className="flex flex-wrap items-center gap-3">
              <audio controls preload="none" src={clip.url} className="h-10 max-w-full" />
              <span className="text-sm text-muted">
                {clip.name ? `${clip.name} · ` : `#${index + 1} · `}
                {t("characters.voiceSampleSeconds", {
                  seconds: Math.round(clip.durationSeconds),
                })}
              </span>
              {clips.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void onRemove(clip.url)}
                  disabled={pending !== null}
                  className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-1 text-xs font-semibold text-muted transition hover:text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("characters.voiceSampleRemove")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setError("");
            setSaved(false);
            setRecorderOpen((prev) => !prev);
          }}
          disabled={pending !== null}
          className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
            recorderOpen
              ? "bg-accent-ink text-paper shadow-[3px_3px_0_0_#12141c]"
              : "bg-accent text-white shadow-[3px_3px_0_0_#12141c]"
          }`}
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="7" y="2.5" width="6" height="9.5" rx="3" />
            <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0" />
            <path d="M10 15v2.5" />
            <path d="M7 17.5h6" />
          </svg>
          {locale.startsWith("zh") ? "用麥克風錄音" : "Record with mic"}
        </button>
        <button
          type="button"
          onClick={() => openPicker(sample ? "append" : "replace")}
          disabled={pending !== null}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "upload" && !recorderOpen ? <Spinner className="h-4 w-4" /> : null}
          {sample ? `+ ${t("characters.voiceSampleUpload")}` : t("characters.voiceSampleUpload")}
        </button>
        {sample ? (
          <>
            <button
              type="button"
              onClick={() => openPicker("replace")}
              disabled={pending !== null}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("characters.voiceSampleReplace")}
            </button>
            <button
              type="button"
              onClick={() => void onRemove()}
              disabled={pending !== null}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "remove" ? <Spinner className="h-4 w-4" /> : null}
              {t("characters.voiceSampleRemove")}
            </button>
          </>
        ) : null}
        {saved ? <p className="text-sm text-muted">{t("characters.voiceSampleSaved")}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        ) : null}
      </div>
      {recorderOpen ? (
        <CharacterVoiceRecorder
          key={selectedLang}
          language={selectedLang}
          hasExistingSample={Boolean(sample)}
          uploading={pending === "upload"}
          onUploadFile={(file, mode) => void uploadFiles([file], mode)}
          onClose={() => setRecorderOpen(false)}
        />
      ) : null}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => void onPick(event)}
      />
    </div>
  );
}
