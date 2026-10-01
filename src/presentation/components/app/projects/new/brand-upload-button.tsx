"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { uploadBrandAssetAction } from "@/presentation/actions/video-edit";
import { useI18n } from "@/presentation/components/i18n-provider";
import { checkBrandUpload } from "@/service/video-edit/edit-state";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Hidden file input behind a studio ghost button; checks type/size before posting.
export function BrandUploadButton({
  label,
  accept,
  disabled = false,
  icon = false,
  onUploaded,
  onError,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  // Square icon instead of a text label. Used on intro / outro rows.
  icon?: boolean;
  onUploaded: (asset: { url: string; kind: "image" | "video" }) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const checked = checkBrandUpload(file);
    if (!checked.ok) {
      onError(translateAppError(checked.error, t));
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const result = await uploadBrandAssetAction(form);
    setUploading(false);
    if (!result.ok) onError(translateAppError(result.error, t));
    else onUploaded({ url: result.url, kind: result.kind });
  }

  return (
    <>
      <button
        type="button"
        aria-label={icon ? (uploading ? t("video.upload.uploading") : label) : undefined}
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className={
          icon
            ? "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[var(--studio-fill)] text-[var(--studio-ink)] hover:bg-[#e7e8eb] disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md bg-[var(--studio-fill)] px-2.5 text-xs font-semibold text-[var(--studio-ink)] hover:bg-[#e7e8eb] disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {uploading ? <Spinner className="h-3.5 w-3.5" /> : icon ? <UploadIcon /> : null}
        {icon ? null : uploading ? t("video.upload.uploading") : label}
      </button>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => void onChange(event)} />
    </>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
