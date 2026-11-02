"use client";

import { useState } from "react";
import type { VoLanguage } from "@/model/project";
import { VoAudioRecorderControls } from "@/presentation/components/app/projects/new/vo-audio-recorder-controls";
import { useI18n } from "@/presentation/components/i18n-provider";

type ReadMode = "text" | "audio";

// Talking-head only: tabbed switcher between "Text to read" and "Audio to read" (upload/record VO).
export function TalkingHeadScriptField({
  value,
  onChange,
  disabled,
  compact = false,
  language,
  uploadedVoUrl,
  uploadedVoDurationSeconds,
  onUploadedVoChange,
  onError,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  language?: VoLanguage;
  uploadedVoUrl?: string;
  uploadedVoDurationSeconds?: number;
  onUploadedVoChange?: (next: {
    url?: string;
    durationSeconds?: number;
    transcript?: string;
  }) => void;
  onError?: (message: string) => void;
}) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const [readMode, setReadMode] = useState<ReadMode>(
    uploadedVoUrl ? "audio" : "text",
  );

  const textTabLabel =
    locale === "zh-Hant"
      ? "文字讀稿 Text to read"
      : locale === "zh-Hans"
        ? "文字读稿 Text to read"
        : "Text to read";
  const audioTabLabel =
    locale === "zh-Hant"
      ? "音訊跟讀 Audio to read"
      : locale === "zh-Hans"
        ? "音频跟读 Audio to read"
        : "Audio to read";

  return (
    <div className={compact ? "" : "mt-5"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t("brief.talkingHead.scriptTitle")}</p>
        <span className="rounded-full bg-accent-ink/5 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted">
          {t("brief.source.charCount", { n: value.length.toLocaleString() })}
        </span>
      </div>

      {/* Mode Tabs: Text to read | Audio to read */}
      {onUploadedVoChange ? (
        <div
          role="tablist"
          aria-label={t("brief.talkingHead.scriptTitle")}
          className="mt-2 inline-flex rounded-full border border-accent-ink/15 bg-paper p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={readMode === "text"}
            disabled={disabled}
            onClick={() => setReadMode("text")}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
              readMode === "text"
                ? "bg-accent-ink text-lime shadow-xs"
                : "text-muted hover:text-foreground"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {textTabLabel}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={readMode === "audio"}
            disabled={disabled}
            onClick={() => setReadMode("audio")}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
              readMode === "audio"
                ? "bg-accent-ink text-lime shadow-xs"
                : "text-muted hover:text-foreground"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {audioTabLabel}
          </button>
        </div>
      ) : null}

      {readMode === "audio" && onUploadedVoChange ? (
        <div className="mt-2.5 space-y-2">
          <VoAudioRecorderControls
            voUrl={uploadedVoUrl}
            voDurationSeconds={uploadedVoDurationSeconds}
            language={language}
            disabled={disabled}
            onUploaded={({ url, durationSeconds, transcript }) => {
              onUploadedVoChange({ url, durationSeconds, transcript });
              if (transcript.trim()) {
                onChange(transcript);
              }
            }}
            onClear={() =>
              onUploadedVoChange({ url: undefined, durationSeconds: undefined })
            }
            onError={onError}
          />
          {uploadedVoUrl ? (
            <div>
              <p className="text-xs text-muted">
                {isEn
                  ? "Auto-transcribed subtitle lines (editable):"
                  : "自動辨識字幕稿（可微調）："}
              </p>
              <label htmlFor="spokenScript" className="sr-only">
                {t("brief.talkingHead.scriptLabel")}
              </label>
              <textarea
                id="spokenScript"
                name="spokenScript"
                rows={compact ? 3 : 4}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                className="mt-1.5 w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-2 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                placeholder={t("brief.talkingHead.scriptPlaceholder")}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2">
          <p className="line-clamp-1 text-xs text-muted">
            {t("brief.talkingHead.scriptHint")}
          </p>
          <label htmlFor="spokenScript" className="sr-only">
            {t("brief.talkingHead.scriptLabel")}
          </label>
          <textarea
            id="spokenScript"
            name="spokenScript"
            required={!uploadedVoUrl}
            rows={compact ? 4 : 6}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className={`mt-1.5 w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
              compact ? "min-h-[6.5rem]" : "min-h-[9rem]"
            }`}
            placeholder={t("brief.talkingHead.scriptPlaceholder")}
          />
        </div>
      )}
    </div>
  );
}
