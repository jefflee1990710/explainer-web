"use client";

import { useEffect, useRef, useState } from "react";
import { saveUserStyleAction } from "@/presentation/actions/styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import { useUnsavedWarning } from "@/presentation/components/app/directors/[id]/use-unsaved-warning";
import { StyleDeskHeader } from "@/presentation/components/app/styles/[id]/style-desk-header";
import { StyleInfoPanel } from "@/presentation/components/app/styles/[id]/style-info-panel";
import { StylePreviewColumn } from "@/presentation/components/app/styles/[id]/style-preview-column";
import type { StyleChatUser } from "@/presentation/components/app/styles/[id]/style-chat-avatar";
import { StyleChatDrawer } from "@/presentation/components/app/styles/[id]/style-chat-drawer";
import { StyleChatPanel } from "@/presentation/components/app/styles/[id]/style-chat-panel";
import { useStylePreviewPoll } from "@/presentation/components/app/styles/[id]/use-style-preview-poll";
import { useStylePreviewCurrent } from "@/presentation/components/app/styles/[id]/use-style-preview-current";
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

const AUTO_SAVE_MS = 600;
const SAVED_STATUS_MS = 2500;
const CANVAS_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// One-screen style desk: preview, visual fields, and AI chat share the viewport.
export function StyleWorkspace({
  style: initial,
  subscribed,
  user,
}: {
  style: StyleDetail;
  subscribed: boolean;
  user: StyleChatUser;
}) {
  const { t } = useI18n();
  const [style, setStyle] = useState(initial);
  const [saved, setSaved] = useState(() => fieldsFromDetail(initial));
  const [draft, setDraft] = useState(() => fieldsFromDetail(initial));
  const [saving, setSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const saveTimerRef = useRef<number | null>(null);
  const savedRef = useRef(saved);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const serverPreviewKey = `${initial.previewStatus}|${initial.previewUrl ?? ""}|${String(initial.hasOwnPreview)}`;
  const [previewOverride, setPreviewOverride] = useState<{ key: string; status: StyleDetail["previewStatus"] } | null>(
    null,
  );
  const previewStatus = previewOverride?.key === serverPreviewKey ? previewOverride.status : initial.previewStatus;
  const previewUrl = initial.previewUrl;
  const previewCurrent = useStylePreviewCurrent(initial.previewHash, draft);
  useStylePreviewPoll(previewStatus);

  savedRef.current = saved;
  const dirty = style.isCustom && styleFieldsDirty(saved, draft);
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

  const name = style.isCustom ? draft.name || style.name : catalogStyleLabel(t, style.id, style.name);
  const colorOk = CANVAS_COLOR_RE.test(draft.canvasColor);

  async function persistDraft(sentDraft: UserStyleFields): Promise<boolean> {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!style.isCustom) {
      setPendingSave(false);
      return true;
    }
    if (!styleFieldsDirty(savedRef.current, sentDraft)) {
      setPendingSave(false);
      return true;
    }
    if (!sentDraft.name.trim()) {
      setPendingSave(false);
      setError(t("errors.styleNameInvalid"));
      return false;
    }
    if (!CANVAS_COLOR_RE.test(sentDraft.canvasColor)) {
      setPendingSave(false);
      setError(t("errors.styleCanvasColorInvalid"));
      return false;
    }
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
        return false;
      }
      setSaved(payload);
      savedRef.current = payload;
      setDraft((current) => (styleFieldsDirty(current, sentDraft) ? current : payload));
      setStyle((current) => ({ ...current, ...payload }));
      setSavedFlash(true);
      return true;
    } catch {
      setError(t("errors.styleSaveFailed"));
      return false;
    } finally {
      setPendingSave(false);
      setSaving(false);
    }
  }

  function queueAutoSave(next: UserStyleFields) {
    if (!style.isCustom) return;
    if (!next.name.trim() || !CANVAS_COLOR_RE.test(next.canvasColor)) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    setPendingSave(true);
    setSavedFlash(false);
    const sentDraft = next;
    saveTimerRef.current = window.setTimeout(() => {
      void persistDraft(sentDraft);
    }, AUTO_SAVE_MS);
  }

  function onChange(next: UserStyleFields) {
    setDraft(next);
    queueAutoSave(next);
  }

  function onApplyFields(fields: UserStyleFields) {
    const next = mergeVisualFields(draft, fields);
    setDraft(next);
    queueAutoSave(next);
  }

  function onSave(): Promise<boolean> {
    return persistDraft(draft);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <StyleDeskHeader
        style={style}
        name={name}
        dirty={dirty}
        saving={saving}
        status={saving || pendingSave ? t("styles.saving") : savedFlash ? t("styles.saved") : ""}
        error={error}
        previewStatus={previewStatus}
        previewCurrent={previewCurrent}
        onBack={(event) => {
          if ((dirty || saving || pendingSave) && !window.confirm(t("styles.unsavedWarning"))) event.preventDefault();
        }}
        onEnsureSaved={onSave}
        onDelete={() => setDeleteOpen(true)}
        onGenerating={() => setPreviewOverride({ key: serverPreviewKey, status: "generating" })}
      />

      {deleteOpen ? <DeleteStyleDialog styleId={style.id} onClose={() => setDeleteOpen(false)} /> : null}

      <div
        className={
          style.isCustom
            ? "mt-3 flex min-h-0 flex-1 overflow-hidden lg:gap-4"
            : "mt-3 flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        }
      >
        <div
          className={
            style.isCustom
              ? "flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto pr-12 lg:max-w-[380px] lg:shrink-0 lg:pr-0"
              : "flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto"
          }
        >
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
          <StyleChatDrawer>
            <StyleChatPanel
              styleId={style.id}
              initialChat={initial.chat}
              draft={draft}
              subscribed={subscribed}
              user={user}
              previewUrl={previewUrl}
              previewStatus={previewStatus}
              previewCurrent={previewCurrent}
              onApplyFields={onApplyFields}
              onSaveDraft={() => onSave()}
              onGenerating={() => setPreviewOverride({ key: serverPreviewKey, status: "generating" })}
            />
          </StyleChatDrawer>
        ) : null}
      </div>
    </div>
  );
}
