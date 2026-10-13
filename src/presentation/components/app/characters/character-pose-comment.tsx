"use client";

import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";

const COMMENT_MAX = 400;

// Comment under the pose sheet. The parent sends it with the current picture.
export function CharacterPoseComment({
  value,
  onChange,
  onSubmit,
  disabled,
  busy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  const { t } = useI18n();
  const ready = value.trim().length > 0 && !disabled && !busy;

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">{t("characters.poseCommentLabel")}</span>
        <textarea
          rows={3}
          maxLength={COMMENT_MAX}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || busy}
          placeholder={t("characters.poseCommentPlaceholder")}
          className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        />
      </label>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!ready}
        className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {busy ? <Spinner className="h-4 w-4" /> : null}
        {busy ? t("characters.poseUpdating") : t("characters.poseUpdate")}
      </button>
    </div>
  );
}
