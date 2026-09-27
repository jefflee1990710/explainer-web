"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { uploadBrandAssetAction } from "@/presentation/actions/video-edit";
import { checkBrandUpload } from "@/service/video-edit/edit-state";

// Hidden file input behind a studio ghost button; checks type/size before posting.
export function BrandUploadButton({
  label,
  accept,
  disabled = false,
  onUploaded,
  onError,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  onUploaded: (asset: { url: string; kind: "image" | "video" }) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const checked = checkBrandUpload(file);
    if (!checked.ok) {
      onError(checked.error);
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const result = await uploadBrandAssetAction(form);
    setUploading(false);
    if (!result.ok) onError(result.error);
    else onUploaded({ url: result.url, kind: result.kind });
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md bg-[var(--studio-fill)] px-2.5 text-xs font-semibold text-[var(--studio-ink)] hover:bg-[#e7e8eb] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? <Spinner className="h-3.5 w-3.5" /> : null}
        {uploading ? "上傳中…" : label}
      </button>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => void onChange(event)} />
    </>
  );
}
