"use client";

import { useRef, useState } from "react";
import { uploadAcademyMediaAction } from "@/presentation/actions/academy";
import { useI18n } from "@/presentation/components/i18n-provider";

// Upload a photo or video to Vercel Blob and insert the Markdown at the caret.
export function MediaUploader({
  onInsert,
}: {
  onInsert: (markdown: string, coverUrl?: string) => void;
}) {
  const { t } = useI18n();
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const [error, setError] = useState("");

  async function onPick(kind: "image" | "video", file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(kind);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAcademyMediaAction(formData);
    setUploading(null);
    if (!result.ok) {
      setError(
        result.error === "forbidden" || result.error === "unauthenticated"
          ? t("scroAdmin.errorForbidden")
          : result.error,
      );
      return;
    }
    onInsert(result.markdown, result.kind === "image" ? result.url : undefined);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => imageRef.current?.click()}
          disabled={Boolean(uploading)}
          className="inline-flex min-h-10 items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50"
        >
          {uploading === "image" ? t("scroAdmin.uploading") : t("scroAdmin.uploadImage")}
        </button>
        <button
          type="button"
          onClick={() => videoRef.current?.click()}
          disabled={Boolean(uploading)}
          className="inline-flex min-h-10 items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50"
        >
          {uploading === "video" ? t("scroAdmin.uploading") : t("scroAdmin.uploadVideo")}
        </button>
      </div>
      <p className="text-xs text-zinc-500">{t("scroAdmin.mediaHint")}</p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <input
        ref={imageRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(event) => {
          void onPick("image", event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => {
          void onPick("video", event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
