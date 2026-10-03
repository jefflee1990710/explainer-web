"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { saveDirectorAction } from "@/presentation/actions/directors";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicDirector } from "@/presentation/serialize";
import {
  DirectorInfoPanel,
  type DirectorForm,
} from "@/presentation/components/app/directors/[id]/director-info-panel";
import { DirectorChatPanel } from "@/presentation/components/app/directors/[id]/director-chat-panel";
import { DeleteDirectorDialog } from "@/presentation/components/app/directors/[id]/delete-director-dialog";
import { useUnsavedWarning } from "@/presentation/components/app/directors/[id]/use-unsaved-warning";
import {
  applyDirectorEdits,
  changedDraftFields,
  type DirectorEdit,
} from "@/service/director/director-edits";
import { emptyProfile } from "@/service/director/profile";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { DirectorPreviewThumb } from "@/presentation/components/director-preview-thumb";

const SAVED_STATUS_MS = 2500;

function formFromDirector(director: PublicDirector): DirectorForm {
  return {
    title: director.title,
    description: director.description,
    customProfile: director.customProfile ?? emptyProfile(),
    extraInstructions: director.extraInstructions ?? "",
  };
}

// Director detail: profile on the left; custom directors also get the AI chat on the right.
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
    <div className="space-y-6">
      <header>
        <Link
          href="/app/directors"
          onClick={(event) => {
            if (dirty && !window.confirm(t("directors.unsavedWarning"))) event.preventDefault();
          }}
          className="text-sm font-semibold text-muted transition hover:text-foreground"
        >
          {t("directors.backToList")}
        </Link>
        <h1 className="font-display mt-2 text-3xl font-bold">{name}</h1>
        {director.previewUrl ? (
          <div className="mt-5 max-w-xl overflow-hidden rounded-2xl border border-accent-ink/10">
            <DirectorPreviewThumb previewUrl={director.previewUrl} label={name} size="cover" />
          </div>
        ) : null}
      </header>

      {deleteOpen ? (
        <DeleteDirectorDialog directorId={director.id} onClose={() => setDeleteOpen(false)} />
      ) : null}

      <div
        className={
          director.isCustom ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start" : "max-w-4xl"
        }
      >
        <DirectorInfoPanel
          director={director}
          draft={draft}
          changedFields={changedFields}
          dirty={dirty}
          saving={saving}
          status={savedFlash ? t("directors.saved") : ""}
          error={error}
          onChange={onChange}
          onSave={() => void onSave()}
          onDiscard={onDiscard}
          onDelete={() => setDeleteOpen(true)}
        />
        {director.isCustom ? (
          <DirectorChatPanel
            directorId={director.id}
            initialChat={director.chat}
            draft={draft}
            subscribed={subscribed}
            onApplyEdits={onApplyEdits}
          />
        ) : null}
      </div>
    </div>
  );
}
