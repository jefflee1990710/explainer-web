"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createCharacterAction } from "@/lib/actions/characters";
import { uploadCharacterImageAction } from "@/lib/actions/upload";
import type { PublicStyle } from "@/lib/serialize";
import { DEFAULT_STYLE_ID, type StyleId } from "@/lib/styles";
import { Spinner } from "@/components/spinner";
import { StylePicker } from "@/components/style-picker";

const NAME_MAX = 40;
const DEFAULT_BUTTON_CLASS =
  "inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5";

// Header / empty-state trigger for the create-character dialog.
export function CreateCharacterButton({
  credits,
  subscribed,
  styles,
  className = DEFAULT_BUTTON_CLASS,
  children = "新增角色",
}: {
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
  className?: string;
  children?: React.ReactNode;
}) {
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
        {children}
      </button>
      {open ? (
        <CreateCharacterModal
          credits={credits}
          subscribed={subscribed}
          styles={styles}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

// Name + style + description and/or reference; success opens the workspace.
export function CreateCharacterModal({
  credits,
  subscribed,
  styles,
  onClose,
}: {
  credits: number;
  subscribed: boolean;
  styles: PublicStyle[];
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [styleId, setStyleId] = useState<StyleId>(DEFAULT_STYLE_ID);
  const [prompt, setPrompt] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onUpload(file: File) {
    setUploading(true);
    setError("");
    const data = new FormData();
    data.set("file", file);
    try {
      const result = await uploadCharacterImageAction(data);
      if (result.ok) setReferenceImageUrl(result.url);
      else setError(result.error);
    } catch {
      setError("上傳失敗，請再試一次");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const data = new FormData();
    data.set("name", name);
    data.set("styleId", styleId);
    data.set("prompt", prompt);
    if (referenceImageUrl) data.set("referenceImageUrl", referenceImageUrl);
    try {
      const result = await createCharacterAction(data);
      if (!result.ok) {
        setSubmitting(false);
        setError(result.error);
        if (result.error.includes("訂閱") || result.error.includes("credits 不足")) {
          router.push("/app/billing");
        }
        return;
      }
      // DB row exists; Higgsfield submit runs in the background after navigation.
      onClose();
      router.push(`/app/characters/${result.character.id}`);
    } catch {
      setError("建立角色失敗，請再試一次");
      setSubmitting(false);
    }
  }

  const canSubmit =
    name.trim().length > 0 &&
    (prompt.trim().length > 0 || Boolean(referenceImageUrl)) &&
    !submitting &&
    !uploading;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-2xl font-bold">
          新增角色
        </h2>
        <p className="mt-2 text-sm text-muted">
          我們會產生一張角色藍圖（轉身圖、走路循環、表情格）。角色描述與參考圖至少填一項。
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">角色名稱</span>
            <input
              ref={inputRef}
              type="text"
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              placeholder="例如：小明"
              className="min-h-[44px] w-full rounded-full border border-accent-ink/15 bg-paper px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          {/* Shared style cards; the character is drawn and later cast in this style. */}
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">風格</legend>
            <StylePicker
              styles={styles}
              value={styleId}
              onChange={setStyleId}
              disabled={submitting}
              label="風格"
            />
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">角色描述（選填）</span>
            <textarea
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={submitting}
              placeholder="例如：七歲小男孩，圓臉，頭頂三根呆毛，穿藍色格子睡衣與黑色布鞋。"
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-semibold">參考圖（選填）</span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5">
                {uploading ? <Spinner /> : null}
                {uploading ? "上傳中…" : referenceImageUrl ? "更換圖片" : "選擇圖片"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={submitting || uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUpload(file);
                  }}
                />
              </label>
              {referenceImageUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referenceImageUrl}
                    alt="參考圖預覽"
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-xl border border-accent-ink/10 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setReferenceImageUrl("")}
                    className="min-h-[44px] cursor-pointer text-sm text-muted underline-offset-4 hover:underline"
                  >
                    移除
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-accent">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {subscribed ? `扣 1 credit（剩餘 ${credits}）` : "需要有效訂閱才能產生藍圖"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Spinner className="h-4 w-4" /> : null}
                產生藍圖
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
