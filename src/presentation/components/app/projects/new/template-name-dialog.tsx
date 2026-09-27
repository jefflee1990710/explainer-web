"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { EDIT_LIMITS } from "@/model/video-edit";

// Name prompt for「儲存為新樣板」and rename.
export function TemplateNameDialog({
  title,
  initialName = "",
  submitLabel,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  title: string;
  initialName?: string;
  submitLabel: string;
  pending: boolean;
  error: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-xl border border-[var(--studio-line)] bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold">{title}</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(name);
          }}
        >
          <input
            ref={inputRef}
            value={name}
            maxLength={EDIT_LIMITS.templateName.max}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：品牌 A 直式"
            disabled={pending}
            className="min-h-9 w-full rounded-lg border border-[var(--studio-line)] px-3 text-sm"
          />
          {error ? <p className="text-xs text-[#e11d48]">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <StudioButton variant="ghost" onClick={onClose} disabled={pending}>取消</StudioButton>
            <StudioButton type="submit" disabled={pending || !name.trim()}>
              {pending ? <Spinner className="h-4 w-4" /> : null}
              {submitLabel}
            </StudioButton>
          </div>
        </form>
      </div>
    </div>
  );
}
