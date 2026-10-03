"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { saveUserStyleAction } from "@/presentation/actions/styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import { useUnsavedWarning } from "@/presentation/components/app/directors/[id]/use-unsaved-warning";
import { StyleInfoPanel } from "@/presentation/components/app/styles/[id]/style-info-panel";
import { StyleChatPanel } from "@/presentation/components/app/styles/[id]/style-chat-panel";
import { StylePreviewButton } from "@/presentation/components/app/styles/[id]/style-preview-button";
import { DeleteStyleDialog } from "@/presentation/components/app/styles/[id]/delete-style-dialog";
import {
  catalogStyleLabel,
  fieldsFromDetail,
  mergeVisualFields,
  styleFieldsDirty,
  type StyleDetail,
} from "@/presentation/components/app/styles/style-detail";
import type { UserStyleFields } from "@/service/style/user-style-fields";
import { translateAppError } from "@/util/i18n/translate-app-error";

const SAVED_STATUS_MS = 2500;
const CANVAS_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Style detail: preview on top, fields on the left. Custom styles also get AI chat.
// The draft is seeded once so a refresh while a preview runs does not wipe unsaved edits.
export function StyleWorkspace({
  style: initial,
  subscribed,
}: {
  style: StyleDetail;
  subscribed: boolean;
}) {
  const { t } = useI18n();
  const [style, setStyle] = useState(initial);
  const [saved, setSaved] = useState(() => fieldsFromDetail(initial));
  const [draft, setDraft] = useState(() => fieldsFromDetail(initial));
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  // A new fork matches the server copy, but Generate stays off until this page saves once.
  const [needsSave, setNeedsSave] = useState(
    () => initial.isCustom && !initial.hasOwnPreview && initial.previewStatus === "idle",
  );
  // Optimistic "generating" only applies to the server snapshot that was current when the click happened.
  const serverPreviewKey = `${initial.previewStatus}|${initial.previewUrl ?? ""}|${String(initial.hasOwnPreview)}`;
  const [previewOverride, setPreviewOverride] = useState<{ key: string; status: StyleDetail["previewStatus"] } | null>(
    null,
  );
  const previewStatus = previewOverride?.key === serverPreviewKey ? previewOverride.status : initial.previewStatus;
  const previewUrl = initial.previewUrl;

  const dirty = style.isCustom && styleFieldsDirty(saved, draft);
  useUnsavedWarning(dirty);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = window.setTimeout(() => setSavedFlash(false), SAVED_STATUS_MS);
    return () => window.clearTimeout(timer);
  }, [savedFlash]);

  const name = style.isCustom ? draft.name || style.name : catalogStyleLabel(t, style.id, style.name);
  const colorOk = CANVAS_COLOR_RE.test(draft.canvasColor);
  const canSave = style.isCustom && !saving && draft.name.trim().length > 0 && colorOk && (dirty || needsSave);

  function onChange(next: UserStyleFields) {
    setDraft(next);
    setSavedFlash(false);
  }

  function onApplyFields(fields: UserStyleFields) {
    setDraft((current) => mergeVisualFields(current, fields));
    setSavedFlash(false);
  }

  async function onSave() {
    const sentDraft = draft;
    const payload: UserStyleFields = {
      ...sentDraft,
      name: sentDraft.name.trim(),
      description: sentDraft.description.trim(),
    };
    setSaving(true);
    setError("");
    try {
      const result = await saveUserStyleAction({
        id: style.id,
        name: payload.name,
        description: payload.description,
        fields: payload,
      });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      setSaved(payload);
      setDraft((current) => (current === sentDraft ? payload : current));
      setStyle((current) => ({ ...current, ...payload }));
      setNeedsSave(false);
      setSavedFlash(true);
    } catch {
      setError(t("errors.styleSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function onDiscard() {
    setDraft(saved);
    setError("");
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/app/styles"
          onClick={(event) => {
            if (dirty && !window.confirm(t("styles.unsavedWarning"))) event.preventDefault();
          }}
          className="text-sm font-semibold text-muted transition hover:text-foreground"
        >
          {t("styles.backToList")}
        </Link>
        <h1 className="font-display mt-2 text-3xl font-bold">{name}</h1>
        <div
          className="relative mt-5 max-w-xl overflow-hidden rounded-2xl border border-accent-ink/10"
          style={{ backgroundColor: colorOk ? draft.canvasColor : style.canvasColor }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <div className="grid aspect-video place-items-center px-4 text-center font-display text-lg font-bold text-accent-ink/50">
              {name}
            </div>
          )}
          {previewStatus === "generating" ? (
            <p className="absolute inset-x-0 bottom-0 bg-accent-ink/70 px-4 py-2 text-sm font-semibold text-paper">
              {t("styles.previewGenerating")}
            </p>
          ) : null}
        </div>
        {style.isCustom ? (
          <StylePreviewButton
            styleId={style.id}
            dirty={dirty}
            needsSave={needsSave}
            previewStatus={previewStatus}
            onGenerating={() => setPreviewOverride({ key: serverPreviewKey, status: "generating" })}
          />
        ) : null}
      </header>

      {deleteOpen ? <DeleteStyleDialog styleId={style.id} onClose={() => setDeleteOpen(false)} /> : null}

      <div
        className={
          style.isCustom ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start" : "max-w-4xl"
        }
      >
        <StyleInfoPanel
          style={style}
          saved={saved}
          draft={draft}
          dirty={dirty}
          saving={saving}
          canSave={canSave}
          status={savedFlash ? t("styles.saved") : ""}
          error={error}
          onChange={onChange}
          onSave={() => void onSave()}
          onDiscard={onDiscard}
          onDelete={() => setDeleteOpen(true)}
        />
        {style.isCustom ? (
          <StyleChatPanel
            styleId={style.id}
            initialChat={style.chat}
            draft={draft}
            subscribed={subscribed}
            onApplyFields={onApplyFields}
          />
        ) : null}
      </div>
    </div>
  );
}
