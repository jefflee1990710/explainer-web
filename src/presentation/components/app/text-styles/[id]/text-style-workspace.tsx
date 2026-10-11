"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveTextStyleAction } from "@/presentation/actions/text-styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import { useUnsavedWarning } from "@/presentation/components/app/directors/[id]/use-unsaved-warning";
import type { StyleChatUser } from "@/presentation/components/app/styles/[id]/style-chat-avatar";
import { TextStyleChatPanel } from "@/presentation/components/app/text-styles/[id]/text-style-chat-panel";
import { TextStylePreviewButton } from "@/presentation/components/app/text-styles/[id]/text-style-preview-button";
import { useTextStylePreviewCurrent } from "@/presentation/components/app/text-styles/[id]/use-text-style-preview-current";
import { useTextStylePreviewPoll } from "@/presentation/components/app/text-styles/[id]/use-text-style-preview-poll";
import type { PublicTextStyleDetail } from "@/presentation/serialize";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";
import { isSubtitleLook } from "@/service/director/subtitle-look";
import { translateAppError } from "@/util/i18n/translate-app-error";

const AUTO_SAVE_MS = 600;
const SAVED_STATUS_MS = 2500;
const NAME_MAX = 40;

// One-screen text-style desk: sample preview, lookLine, and AI chat.
export function TextStyleWorkspace({
  style: initial,
  subscribed,
  user,
}: {
  style: PublicTextStyleDetail;
  subscribed: boolean;
  user: StyleChatUser;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial.name);
  const [lookLine, setLookLine] = useState(initial.lookLine);
  const [savedName, setSavedName] = useState(initial.name);
  const [savedLookLine, setSavedLookLine] = useState(initial.lookLine);
  const [saving, setSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const saveTimerRef = useRef<number | null>(null);

  const serverPreviewKey = `${initial.previewStatus}|${initial.imageUrl}|${initial.previewHash ?? ""}`;
  const [previewOverride, setPreviewOverride] = useState<{
    key: string;
    status: PublicTextStyleDetail["previewStatus"];
  } | null>(null);
  const previewStatus =
    previewOverride?.key === serverPreviewKey ? previewOverride.status : initial.previewStatus;
  const previewCurrent = useTextStylePreviewCurrent(initial.previewHash, lookLine);
  useTextStylePreviewPoll(previewStatus);

  const dirty = savedName !== name.trim() || savedLookLine !== lookLine.trim();
  useUnsavedWarning(dirty || saving || pendingSave);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = window.setTimeout(() => setSavedFlash(false), SAVED_STATUS_MS);
    return () => window.clearTimeout(timer);
  }, [savedFlash]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  async function persistDraft(nextName: string, nextLookLine: string): Promise<boolean> {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const trimmedName = nextName.trim();
    const trimmedLook = nextLookLine.trim();
    if (!trimmedName) {
      setPendingSave(false);
      setError(t("errors.textStyleNameRequired"));
      return false;
    }
    if (savedName === trimmedName && savedLookLine === trimmedLook) {
      setPendingSave(false);
      return true;
    }
    setSaving(true);
    setError("");
    try {
      const result = await saveTextStyleAction({
        id: initial.id,
        name: trimmedName,
        lookLine: trimmedLook,
      });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return false;
      }
      setSavedName(trimmedName);
      setSavedLookLine(trimmedLook);
      setSavedFlash(true);
      return true;
    } catch {
      setError(t("errors.textStyleSaveFailed"));
      return false;
    } finally {
      setPendingSave(false);
      setSaving(false);
    }
  }

  function queueAutoSave(nextName: string, nextLookLine: string) {
    if (!nextName.trim() || !nextLookLine.trim()) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    setPendingSave(true);
    setSavedFlash(false);
    saveTimerRef.current = window.setTimeout(() => {
      void persistDraft(nextName, nextLookLine);
    }, AUTO_SAVE_MS);
  }

  const templateLabel =
    initial.baseLookId && isSubtitleLook(initial.baseLookId)
      ? subtitleLookLabel(t, initial.baseLookId).label
      : undefined;

  const status =
    saving || pendingSave
      ? t("textStyles.saving")
      : savedFlash
        ? t("textStyles.saved")
        : "";

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] min-h-[28rem] flex-col gap-3 lg:h-[calc(100dvh-6rem)]">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <Link
            href="/app/text-styles"
            className="text-xs font-semibold text-muted transition hover:text-foreground"
          >
            {t("textStyles.backToList")}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <input
              value={name}
              maxLength={NAME_MAX}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                queueAutoSave(next, lookLine);
              }}
              className="font-display min-w-0 flex-1 truncate rounded-lg border border-transparent bg-transparent px-1 text-xl font-bold focus-visible:border-accent-ink/20 focus-visible:outline-none"
              aria-label={t("textStyles.name")}
            />
            {templateLabel ? (
              <span className="rounded-full border border-accent-ink/15 px-2 py-0.5 text-[11px] font-semibold text-muted">
                {t("textStyles.templateBadge", { name: templateLabel })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status ? <span className="text-xs text-muted">{status}</span> : null}
          <TextStylePreviewButton
            styleId={initial.id}
            previewStatus={previewStatus}
            previewCurrent={previewCurrent}
            onEnsureSaved={() => persistDraft(name, lookLine)}
            onGenerating={() => setPreviewOverride({ key: serverPreviewKey, status: "generating" })}
          />
        </div>
      </header>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <section className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-xl border border-accent-ink/10 bg-paper/85 p-3">
          <div className="overflow-hidden rounded-lg bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={initial.imageUrl} alt="" className="aspect-video w-full object-contain" />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("textStyles.lookLineLabel")}</span>
            <textarea
              rows={5}
              value={lookLine}
              onChange={(event) => {
                const next = event.target.value;
                setLookLine(next);
                queueAutoSave(name, next);
              }}
              className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <span className="mt-1 block text-[11px] text-muted">{t("textStyles.lookLineHint")}</span>
          </label>
        </section>

        <TextStyleChatPanel
          styleId={initial.id}
          initialChat={initial.chat}
          lookLine={lookLine}
          subscribed={subscribed}
          user={user}
          imageUrl={initial.imageUrl}
          previewStatus={previewStatus}
          previewCurrent={previewCurrent}
          onApplyLookLine={(next) => {
            setLookLine(next);
            queueAutoSave(name, next);
          }}
          onSaveDraft={() => persistDraft(name, lookLine)}
          onGenerating={() => setPreviewOverride({ key: serverPreviewKey, status: "generating" })}
        />
      </div>
    </div>
  );
}
