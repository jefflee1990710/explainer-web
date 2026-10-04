"use client";

import { useRef, useState } from "react";
import { uploadStyleChatImageAction } from "@/presentation/actions/styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { translateAppError } from "@/util/i18n/translate-app-error";

const MESSAGE_MAX = 2000;

// Attach + text + send on one row. Image is optional; send needs text or a still.
export function StyleChatComposer({
  disabled,
  sending,
  onSend,
  onError,
}: {
  disabled: boolean;
  sending: boolean;
  onSend: (input: { message: string; imageUrl?: string }) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const blocked = disabled || sending || uploading;
  const canSend = !blocked && (input.trim().length > 0 || Boolean(imageUrl));

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    onError("");
    const data = new FormData();
    data.set("file", file);
    try {
      const result = await uploadStyleChatImageAction(data);
      if (!result.ok) {
        onError(translateAppError(result.error, t));
        return;
      }
      setImageUrl(result.url);
    } catch {
      onError(t("styles.chatImageFailed"));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!canSend) return;
    onSend({ message: input.trim(), imageUrl: imageUrl || undefined });
    setInput("");
    setImageUrl("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-2"
    >
      {imageUrl ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={t("styles.chatImageAlt")} className="h-14 w-14 rounded-lg object-cover" />
          <button
            type="button"
            disabled={blocked}
            onClick={() => setImageUrl("")}
            className="cursor-pointer text-[11px] font-semibold text-muted underline-offset-2 transition hover:text-foreground hover:underline disabled:opacity-50"
          >
            {t("styles.chatImageRemove")}
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <button
          type="button"
          disabled={blocked}
          aria-label={t("styles.chatAttachAria")}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 bg-paper text-[var(--studio-ink)] transition hover:bg-accent-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? <Spinner className="h-3.5 w-3.5" /> : <ImageIcon />}
        </button>
        <textarea
          rows={2}
          maxLength={MESSAGE_MAX}
          value={input}
          disabled={blocked}
          aria-label={t("styles.chatPlaceholder")}
          placeholder={t("styles.chatPlaceholder")}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent px-3 text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? <Spinner className="h-3.5 w-3.5" /> : t("styles.chatSend")}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void onPick(event)}
      />
    </form>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.4" fill="currentColor" />
      <path d="m7 16 3.2-3.2a1 1 0 0 1 1.3 0L15 16l1.4-1.4a1 1 0 0 1 1.3 0L20 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
