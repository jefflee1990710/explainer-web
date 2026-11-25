"use client";

// Dialog field: pick an image / video from the canvas or library, or upload a new file.

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { CanvasMediaKind } from "@/model/canvas";
import { uploadCanvasMediaAction } from "@/presentation/actions/canvas";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";
import { DIALOG_FIELD, DIALOG_LABEL } from "./scro-dialog-shell";
import type { MediaPickOption } from "./scro-group-options";

type Props = {
  label: string;
  isZh: boolean;
  kind: CanvasMediaKind;
  options: readonly MediaPickOption[];
  value: MediaPickOption | null;
  onChange: (value: MediaPickOption | null) => void;
  allowUpload?: boolean;
};

const GROUP_LABELS: Record<MediaPickOption["source"], { zh: string; en: string }> = {
  canvas: { zh: "畫布上的節點", en: "On this canvas" },
  character: { zh: "角色", en: "Characters" },
  product: { zh: "產品", en: "Products" },
  library: { zh: "最近輸出", en: "Recent outputs" },
  upload: { zh: "剛上傳", en: "Uploaded" },
};

export function MediaPickField({ label, isZh, kind, options, value, onChange, allowUpload = true }: Props) {
  const [uploaded, setUploaded] = useState<MediaPickOption[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const all = [...uploaded, ...options];

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadCanvasMediaAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.mediaKind !== kind) {
        toast.error(isZh ? "檔案類型不符" : "Wrong file type");
        return;
      }
      const option: MediaPickOption = {
        key: `upload:${res.url}`,
        label: res.fileName,
        source: "upload",
        mediaKind: res.mediaKind,
        url: res.url,
        ref: { url: res.url, name: res.fileName, mediaKind: res.mediaKind },
      };
      setUploaded((prev) => [option, ...prev]);
      onChange(option);
    } finally {
      setUploading(false);
    }
  };

  const sources = [...new Set(all.map((o) => o.source))];
  const characterMenu = all.some((option) => option.source === "character");

  return (
    <div className={DIALOG_LABEL}>
      {label}
      <div className="flex items-center gap-2">
        {characterMenu ? (
          <div className="min-w-0 flex-1">
          <CanvasPreviewSelect
            value={value?.key ?? ""}
            ariaLabel={label}
            options={[
              { value: "", label: isZh ? "請選擇角色" : "Choose a character" },
              ...all.map((option) => ({
                value: option.key,
                label: option.label,
                previewUrl: option.portraitUrl || option.url,
                ...(option.portraitUrl && option.fullBodyUrl
                  ? { secondaryPreviewUrl: option.fullBodyUrl, secondaryShape: "body" as const, secondaryFit: "contain" as const }
                  : {}),
                previewShape: option.portraitUrl ? ("square" as const) : ("portrait" as const),
                previewFit: option.portraitUrl ? ("cover" as const) : ("contain" as const),
              })),
            ]}
            onChange={(key) => onChange(all.find((option) => option.key === key) ?? null)}
          />
          </div>
        ) : (
          <select
            value={value?.key ?? ""}
            onChange={(e) => onChange(all.find((o) => o.key === e.target.value) ?? null)}
            className={DIALOG_FIELD}
          >
            <option value="">{isZh ? "請選擇…" : "Choose…"}</option>
            {sources.map((source) => (
              <optgroup key={source} label={isZh ? GROUP_LABELS[source].zh : GROUP_LABELS[source].en}>
                {all
                  .filter((o) => o.source === source)
                  .map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        )}
        {allowUpload ? (
          <>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-[8px] border border-white/10 bg-white/8 px-2 py-1.5 text-[11px] text-white/80 transition hover:bg-white/15 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {isZh ? "上傳" : "Upload"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={kind === "video" ? "video/*" : kind === "audio" ? "audio/*" : "image/*"}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </>
        ) : null}
      </div>
      {value ? (
        kind === "video" ? (
          <video src={value.url} muted playsInline className="mt-1 h-24 w-auto self-start rounded-md border border-white/10" />
        ) : kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- user media preview
          <img src={value.url} alt={value.label} className="mt-1 h-24 w-auto self-start rounded-md border border-white/10 object-cover" />
        ) : null
      ) : null}
    </div>
  );
}
