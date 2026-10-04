"use client";

import { useEffect, useState } from "react";
import { saveDirectorAction } from "@/presentation/actions/directors";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicDirector } from "@/presentation/serialize";
import {
  DirectorInfoPanel,
  type DirectorForm,
} from "@/presentation/components/app/directors/[id]/director-info-panel";
import { DirectorChatDrawer } from "@/presentation/components/app/directors/[id]/director-chat-drawer";
import { DirectorChatPanel } from "@/presentation/components/app/directors/[id]/director-chat-panel";
import { DirectorDeskHeader } from "@/presentation/components/app/directors/[id]/director-desk-header";
import { DirectorPreviewColumn } from "@/presentation/components/app/directors/[id]/director-preview-column";
import { DeleteDirectorDialog } from "@/presentation/components/app/directors/[id]/delete-director-dialog";
import { useUnsavedWarning } from "@/presentation/components/app/directors/[id]/use-unsaved-warning";
import {
  applyDirectorEdits,
  changedDraftFields,
  type DirectorEdit,
} from "@/service/director/director-edits";
import { emptyProfile } from "@/service/director/profile";
import { translateAppError } from "@/util/i18n/translate-app-error";

const SAVED_STATUS_MS = 2500;

function formFromDirector(director: PublicDirector): DirectorForm {
  return {
    title: director.title,
    description: director.description,
    customProfile: director.customProfile ?? emptyProfile(),
    extraInstructions: director.extraInstructions ?? "",
  };
}

// One-screen director desk: preview and profile on the left; custom directors get AI chat on the right.
// State is seeded from props once so revalidation never wipes an unsaved AI draft.
export function DirectorWorkspace({
  director: initial,
  subscribed,
}: {
  director: PublicDirector;
  subscribed: boolean;
}) {
  const { t } = useI18n();
  const [director, setDirector] = useState(initial);
  const [saved, setSaved] = useState(() => formFromDirector(initial));
  const [draft, setDraft] = useState(() => formFromDirector(initial));
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const changedFields = changedDraftFields(saved, draft);
  const dirty =
    changedFields.length > 0 || draft.title !== saved.title || draft.description !== saved.description;
  useUnsavedWarning(dirty);

  // Hide the brief "saved" status after a moment.
  useEffect(() => {
    if (!savedFlash) return;
    const timer = window.setTimeout(() => setSavedFlash(false), SAVED_STATUS_MS);
    return () => window.clearTimeout(timer);
  }, [savedFlash]);

  const name = director.title;

  function onChange(next: DirectorForm) {
    setDraft(next);
    setSavedFlash(false);
  }

  // Merge AI file replacements into whatever the draft is now.
  function onApplyEdits(edits: DirectorEdit[]) {
    setDraft((current) => {
      const applied = applyDirectorEdits(current, edits);
      return applied.ok ? { ...current, ...applied.draft } : current;
    });
    setSavedFlash(false);
  }

  async function onSave() {
    const sentDraft = draft;
    setSaving(true);
    setError("");
    try {
      const result = await saveDirectorAction({ id: director.id, ...sentDraft });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      const next = formFromDirector(result.director);
      setDirector(result.director);
      setSaved(next);
      // Keep edits (typed or AI-merged) made while the save was in flight.
      setDraft((current) => (current === sentDraft ? next : current));
      setSavedFlash(true);
    } catch {
      setError(t("errors.directorSaveFailed"));
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
      <DirectorDeskHeader
        director={director}
        name={name}
        dirty={dirty}
        saving={saving}
        canSave={dirty && !saving && Boolean(draft.title.trim())}
        status={savedFlash ? t("directors.saved") : ""}
        error={error}
        onBack={(event) => {
          if (dirty && !window.confirm(t("directors.unsavedWarning"))) event.preventDefault();
        }}
        onSave={() => void onSave()}
        onDiscard={onDiscard}
        onDelete={() => setDeleteOpen(true)}
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
          <DirectorPreviewColumn director={director} name={name} draft={draft} onChange={onChange} />
          <DirectorInfoPanel
            director={director}
            draft={draft}
            changedFields={changedFields}
            onChange={onChange}
          />
        </div>
        {director.isCustom ? (
          <DirectorChatDrawer>
            <DirectorChatPanel
              directorId={director.id}
              initialChat={director.chat}
              draft={draft}
              subscribed={subscribed}
              onApplyEdits={onApplyEdits}
            />
          </DirectorChatDrawer>
        ) : null}
      </div>
    </div>
  );
}
