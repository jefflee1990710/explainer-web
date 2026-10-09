"use client";

import { useEffect, useRef, useState } from "react";
import { saveDirectorAction } from "@/presentation/actions/directors";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicDirector } from "@/presentation/serialize";
import type { DirectorPreviewStatus } from "@/model/skill";
import {
  DirectorInfoPanel,
  type DirectorForm,
} from "@/presentation/components/app/directors/[id]/director-info-panel";
import { DirectorChatDrawer } from "@/presentation/components/app/directors/[id]/director-chat-drawer";
import { DirectorChatPanel } from "@/presentation/components/app/directors/[id]/director-chat-panel";
import type { DirectorChatUser } from "@/presentation/components/app/directors/[id]/director-chat-avatar";
import { DirectorDeskHeader } from "@/presentation/components/app/directors/[id]/director-desk-header";
import { DirectorPreviewColumn } from "@/presentation/components/app/directors/[id]/director-preview-column";
import { DeleteDirectorDialog } from "@/presentation/components/app/directors/[id]/delete-director-dialog";
import { useUnsavedWarning } from "@/presentation/components/app/directors/[id]/use-unsaved-warning";
import { useDirectorPreviewCurrent } from "@/presentation/components/app/directors/[id]/use-director-preview-current";
import { useStylePreviewPoll } from "@/presentation/components/app/styles/[id]/use-style-preview-poll";
import {
  applyDirectorEdits,
  changedDraftFields,
  type DirectorEdit,
} from "@/service/director/director-edits";
import { emptyProfile } from "@/service/director/profile";
import { translateAppError } from "@/util/i18n/translate-app-error";

const AUTO_SAVE_MS = 600;
const SAVED_STATUS_MS = 2500;

function formFromDirector(director: PublicDirector): DirectorForm {
  return {
    title: director.title,
    description: director.description,
    customProfile: director.customProfile ?? emptyProfile(),
    extraInstructions: director.extraInstructions ?? "",
    // Only on-camera read forks carry performance slots.
    ...(director.customPerformance ? { customPerformance: director.customPerformance } : {}),
  };
}

function formDirty(saved: DirectorForm, draft: DirectorForm) {
  return (
    changedDraftFields(saved, draft).length > 0 ||
    draft.title !== saved.title ||
    draft.description !== saved.description
  );
}

// One-screen director desk: preview and profile on the left; custom directors get AI chat on the right.
export function DirectorWorkspace({
  director: initial,
  subscribed,
  user,
}: {
  director: PublicDirector;
  subscribed: boolean;
  user: DirectorChatUser;
}) {
  const { t } = useI18n();
  const [director, setDirector] = useState(initial);
  const [saved, setSaved] = useState(() => formFromDirector(initial));
  const [draft, setDraft] = useState(() => formFromDirector(initial));
  const [saving, setSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const saveTimerRef = useRef<number | null>(null);
  const savedRef = useRef(saved);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const serverPreviewKey = `${initial.previewStatus}|${initial.previewUrl ?? ""}|${String(initial.hasOwnPreview)}`;
  const [previewOverride, setPreviewOverride] = useState<{ key: string; status: DirectorPreviewStatus } | null>(null);
  const previewStatus = previewOverride?.key === serverPreviewKey ? previewOverride.status : initial.previewStatus;
  const previewUrl = initial.previewUrl;
  const previewCurrent = useDirectorPreviewCurrent(initial.hasOwnPreview ? initial.previewHash : undefined, draft);
  useStylePreviewPoll(previewStatus);

  savedRef.current = saved;
  const changedFields = changedDraftFields(saved, draft);
  const dirty = director.isCustom && formDirty(saved, draft);
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

  const name = director.isCustom ? draft.title || director.title : director.title;

  async function persistDraft(sentDraft: DirectorForm): Promise<boolean> {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!director.isCustom) {
      setPendingSave(false);
      return true;
    }
    if (!formDirty(savedRef.current, sentDraft)) {
      setPendingSave(false);
      return true;
    }
    if (!sentDraft.title.trim()) {
      setPendingSave(false);
      setError(t("errors.directorNameRequired"));
      return false;
    }
    const payload: DirectorForm = {
      ...sentDraft,
      title: sentDraft.title.trim(),
      description: sentDraft.description.trim(),
    };
    setSaving(true);
    setError("");
    try {
      const result = await saveDirectorAction({ id: director.id, ...payload });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return false;
      }
      const next = formFromDirector(result.director);
      setDirector(result.director);
      setSaved(next);
      savedRef.current = next;
      setDraft((current) => (formDirty(current, sentDraft) ? current : next));
      setSavedFlash(true);
      return true;
    } catch {
      setError(t("errors.directorSaveFailed"));
      return false;
    } finally {
      setPendingSave(false);
      setSaving(false);
    }
  }

  function queueAutoSave(next: DirectorForm) {
    if (!director.isCustom) return;
    if (!next.title.trim()) return;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    setPendingSave(true);
    setSavedFlash(false);
    const sentDraft = next;
    saveTimerRef.current = window.setTimeout(() => {
      void persistDraft(sentDraft);
    }, AUTO_SAVE_MS);
  }

  function onChange(next: DirectorForm) {
    setDraft(next);
    queueAutoSave(next);
  }

  function onApplyEdits(edits: DirectorEdit[]) {
    const applied = applyDirectorEdits(draft, edits);
    if (!applied.ok) return;
    const next = {
      ...draft,
      customProfile: applied.draft.customProfile,
      extraInstructions: applied.draft.extraInstructions,
      ...(applied.draft.customPerformance ? { customPerformance: applied.draft.customPerformance } : {}),
    };
    setDraft(next);
    queueAutoSave(next);
  }

  function onSave(): Promise<boolean> {
    return persistDraft(draft);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DirectorDeskHeader
        director={director}
        name={name}
        dirty={dirty}
        saving={saving}
        status={saving || pendingSave ? t("directors.saving") : savedFlash ? t("directors.saved") : ""}
        error={error}
        previewStatus={previewStatus}
        previewCurrent={previewCurrent}
        onBack={(event) => {
          if ((dirty || saving || pendingSave) && !window.confirm(t("directors.unsavedWarning"))) {
            event.preventDefault();
          }
        }}
        onEnsureSaved={onSave}
        onDelete={() => setDeleteOpen(true)}
        onGenerating={() => setPreviewOverride({ key: serverPreviewKey, status: "generating" })}
      />

      {deleteOpen ? (
        <DeleteDirectorDialog directorId={director.id} onClose={() => setDeleteOpen(false)} />
      ) : null}

      <div
        className={
          director.isCustom
            ? "mt-3 flex min-h-0 flex-1 overflow-hidden lg:gap-4"
            : "mt-3 flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        }
      >
        <div
          className={
            director.isCustom
              ? "flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto pr-12 lg:max-w-[380px] lg:shrink-0 lg:pr-0"
              : "flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto"
          }
        >
          <DirectorPreviewColumn
            director={director}
            name={name}
            draft={draft}
            previewUrl={previewUrl}
            previewBusy={previewStatus === "generating"}
            onChange={onChange}
          />
          <DirectorInfoPanel director={director} draft={draft} changedFields={changedFields} />
        </div>
        {director.isCustom ? (
          <DirectorChatDrawer>
            <DirectorChatPanel
              directorId={director.id}
              initialChat={initial.chat}
              draft={draft}
              subscribed={subscribed}
              user={user}
              previewUrl={previewUrl}
              previewStatus={previewStatus}
              previewCurrent={previewCurrent}
              onApplyEdits={onApplyEdits}
              onSaveDraft={onSave}
              onGenerating={() => setPreviewOverride({ key: serverPreviewKey, status: "generating" })}
            />
          </DirectorChatDrawer>
        ) : null}
      </div>
    </div>
  );
}
