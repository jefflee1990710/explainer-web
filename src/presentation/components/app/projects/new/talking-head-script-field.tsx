"use client";

import type { VoLanguage } from "@/model/project";
import { VoAudioRecorderControls } from "@/presentation/components/app/projects/new/vo-audio-recorder-controls";
import { useI18n } from "@/presentation/components/i18n-provider";

// Talking-head only: the exact lines the character reads on camera, plus optional direct VO upload / mic recording.
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
  return (
    <div className={compact ? "" : "mt-5"}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{t("brief.talkingHead.scriptTitle")}</p>
        <span className="rounded-full bg-accent-ink/5 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted">
          {t("brief.source.charCount", { n: value.length.toLocaleString() })}
        </span>
      </div>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted">
        {uploadedVoUrl
          ? isEn
            ? "Using your uploaded/recorded VO audio. Edit the transcript below to refine subtitles."
            : "已套用你上傳／錄製嘅 VO 語音。下方文字為自動識別嘅字幕稿，可自由微調字眼。"
          : t("brief.talkingHead.scriptHint")}
      </p>

      {onUploadedVoChange ? (
        <div className="mt-2">
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
            onClear={() => onUploadedVoChange({ url: undefined, durationSeconds: undefined })}
            onError={onError}
          />
        </div>
      ) : null}

      <label htmlFor="spokenScript" className="sr-only">
        {t("brief.talkingHead.scriptLabel")}
      </label>
      <textarea
        id="spokenScript"
        name="spokenScript"
        required={!uploadedVoUrl}
        rows={compact ? 3 : 6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`mt-2 w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-2.5 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
          compact ? "min-h-[5.5rem]" : "min-h-[9rem]"
        }`}
        placeholder={t("brief.talkingHead.scriptPlaceholder")}
      />
    </div>
  );
}
