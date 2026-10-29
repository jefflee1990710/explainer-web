"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDirectorAction,
  createDirectorFromReferenceVideoAction,
} from "@/presentation/actions/directors";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicSkill } from "@/presentation/serialize";
import { translateAppError } from "@/util/i18n/translate-app-error";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;
const DEFAULT_BUTTON_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5";

type CreateTab = "video" | "copy" | "blank";

// Trigger for creating a standalone custom director (from a template, from a reference video/Reel, or from scratch).
export function CreateDirectorButton({
  template,
  templates,
  defaultTab,
  className = DEFAULT_BUTTON_CLASS,
  children,
}: {
  template?: PublicSkill;
  templates?: PublicSkill[];
  defaultTab?: CreateTab;
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  const label = children ?? t("directors.useTemplate");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open ? (
        <CreateDirectorModal
          template={template}
          templates={templates}
          defaultTab={defaultTab ?? (template ? "copy" : "video")}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export function CreateDirectorModal({
  template,
  templates = [],
  defaultTab = "video",
  onClose,
}: {
  template?: PublicSkill;
  templates?: PublicSkill[];
  defaultTab?: CreateTab;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const isZh = locale.startsWith("zh");
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<CreateTab>(defaultTab);
  const [selectedSlug, setSelectedSlug] = useState<string>(
    template?.slug || templates[0]?.slug || "editorial-interview-director",
  );
  const [name, setName] = useState(() => (template?.title || "").slice(0, NAME_MAX));
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (tab === "video") {
        const formData = new FormData();
        if (videoUrl.trim()) formData.set("videoUrl", videoUrl.trim());
        if (name.trim()) formData.set("title", name.trim());
        if (notes.trim()) formData.set("notes", notes.trim());
        if (videoFile) formData.set("file", videoFile);
        const result = await createDirectorFromReferenceVideoAction(formData);
        if (!result.ok) {
          setSubmitting(false);
          setError(translateAppError(result.error, t));
          return;
        }
        onClose();
        router.push(`/app/directors/${result.id}`);
        return;
      }

      const result = await createDirectorAction({
        templateSlug: tab === "blank" ? "__blank__" : template?.slug || selectedSlug,
        title: name,
        description,
      });
      if (!result.ok) {
        setSubmitting(false);
        setError(translateAppError(result.error, t));
        return;
      }
      onClose();
      router.push(`/app/directors/${result.id}`);
    } catch {
      setError(t("errors.directorCreateFailed"));
      setSubmitting(false);
    }
  }

  const canSubmit =
    !submitting &&
    (tab === "video"
      ? Boolean(videoUrl.trim() || videoFile || notes.trim())
      : name.trim().length > 0);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border-2 border-accent-ink bg-paper p-6 shadow-[8px_8px_0_0_#12141c] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {isZh ? "建立專屬導演 · New Custom Director" : t("directors.createTitle")}
        </h2>
        <p className="mt-1.5 text-xs leading-5 text-muted">
          {isZh
            ? "建立後會作為 100% 獨立嘅 IDirector 儲存於資料庫，系統內置導演嘅任何改動都唔會影響你嘅專屬導演。"
            : "Saved as a 100% standalone IDirector in the database — completely isolated from built-in changes."}
        </p>

        {/* Mode Switcher Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-accent-ink/15 bg-white p-1">
          {(
            [
              {
                id: "video",
                labelZh: "參考影片 / Reel 生成",
                labelEn: "From Reel / Video",
              },
              {
                id: "copy",
                labelZh: "複製現有導演",
                labelEn: "Copy Template",
              },
              {
                id: "blank",
                labelZh: "空白自訂導演",
                labelEn: "Blank Director",
              },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={submitting}
                onClick={() => {
                  setTab(item.id);
                  setError("");
                }}
                className={`cursor-pointer rounded-xl px-2.5 py-2 text-xs font-bold transition ${
                  active
                    ? "bg-accent-ink text-lime shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {isZh ? item.labelZh : item.labelEn}
              </button>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {tab === "video" ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  {isZh
                    ? "Instagram Reel / 短片連結（選填）"
                    : "Instagram Reel / Video URL (Optional)"}
                </span>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={submitting}
                  placeholder="https://www.instagram.com/reel/..."
                  className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  {isZh
                    ? "或上傳參考 MP4 影片檔（≤ 40MB，選填）"
                    : "Or Upload Reference MP4 Video (≤ 40MB, Optional)"}
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  disabled={submitting}
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-2xl border border-dashed border-accent-ink/25 bg-white px-4 py-2.5 text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-accent-ink file:px-3 file:py-1 file:text-xs file:font-semibold file:text-lime"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  {isZh ? "導演名稱（選填，留空由 AI 自動命名）" : "Director Name (Optional)"}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  maxLength={NAME_MAX}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  placeholder={isZh ? "例如：Esquire 質感專訪導演" : "e.g. Esquire Editorial Interview"}
                  className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  {isZh
                    ? "拍攝風格與重點備註（可單獨填寫或配搭影片分析）"
                    : "Style Focus & Notes"}
                </span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  placeholder={
                    isZh
                      ? "例如：模擬呢條片嘅微側 15 度專訪坐姿，中間穿插主角手捧產品嘅特寫 B-Roll…"
                      : "e.g. Match this reel's 15-degree off-camera interview framing and tactile product B-roll..."
                  }
                  className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-white px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                />
              </label>
            </>
          ) : (
            <>
              {tab === "copy" && !template && templates.length > 0 ? (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">
                    {isZh ? "選擇要完整複製嘅基礎導演" : "Choose Base Director to Copy"}
                  </span>
                  <select
                    value={selectedSlug}
                    disabled={submitting}
                    onChange={(e) => {
                      const nextSlug = e.target.value;
                      setSelectedSlug(nextSlug);
                      const found = templates.find((item) => item.slug === nextSlug);
                      if (found && !name.trim()) {
                        setName(`${found.title} (Custom)`.slice(0, NAME_MAX));
                      }
                    }}
                    className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-white px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {templates.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">{t("directors.nameLabel")}</span>
                <input
                  ref={inputRef}
                  type="text"
                  required
                  maxLength={NAME_MAX}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={submitting}
                  placeholder={t("directors.namePlaceholder")}
                  className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  {t("directors.descriptionLabel")}
                </span>
                <textarea
                  rows={3}
                  maxLength={DESCRIPTION_MAX}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={submitting}
                  placeholder={t("directors.descriptionPlaceholder")}
                  className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-white px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                />
              </label>
            </>
          )}

          {error ? (
            <p role="alert" className="text-sm text-accent">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : null}
              {tab === "video"
                ? submitting
                  ? isZh
                    ? "AI 正在拆解影片建立導演…"
                    : "Analyzing video..."
                  : isZh
                    ? "AI 分析並建立導演"
                    : "Analyze & Create Director"
                : t("directors.createSubmit")}
            </button>
          </div>
        </form>
      </div>
    </DialogBackdrop>
  );
}
