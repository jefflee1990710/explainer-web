"use client";

import { useEffect, useState } from "react";
import { saveUserStyleAction } from "@/presentation/actions/styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import { useUnsavedWarning } from "@/presentation/components/app/directors/[id]/use-unsaved-warning";
import { StyleDeskHeader } from "@/presentation/components/app/styles/[id]/style-desk-header";
import { StyleInfoPanel } from "@/presentation/components/app/styles/[id]/style-info-panel";
import { StylePreviewColumn } from "@/presentation/components/app/styles/[id]/style-preview-column";
import { StyleChatPanel } from "@/presentation/components/app/styles/[id]/style-chat-panel";
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

// One-screen style desk: preview, visual fields, and AI chat share the viewport.
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
  const canSave = style.isCustom && !saving && draft.name.trim().length > 0 && colorOk && dirty;

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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <StyleDeskHeader
        style={style}
        name={name}
        dirty={dirty}
        saving={saving}
        canSave={canSave}
        status={savedFlash ? t("styles.saved") : ""}
        error={error}
        previewStatus={previewStatus}
        onBack={(event) => {
          if (dirty && !window.confirm(t("styles.unsavedWarning"))) event.preventDefault();
        }}
        onSave={() => void onSave()}
        onDiscard={onDiscard}
        onDelete={() => setDeleteOpen(true)}
        onGenerating={() => setPreviewOverride({ key: serverPreviewKey, status: "generating" })}
      />

      {deleteOpen ? <DeleteStyleDialog styleId={style.id} onClose={() => setDeleteOpen(false)} /> : null}

      <div
        className={
          style.isCustom
            ? "mt-3 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]"
            : "mt-3 mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]"
        }
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto">
          <StylePreviewColumn
            style={style}
            name={name}
            draft={draft}
            colorOk={colorOk}
            previewUrl={previewUrl}
            previewBusy={previewStatus === "generating"}
            onChange={onChange}
          />
          <StyleInfoPanel style={style} saved={saved} draft={draft} />
        </div>
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
