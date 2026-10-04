"use client";

import type { PublicDirector } from "@/presentation/serialize";
import { DirectorProfileSection } from "@/presentation/components/app/directors/[id]/director-profile-section";
import { type DirectorDraft, type DraftField } from "@/service/director/director-edits";

// Editable director fields held by the workspace.
export type DirectorForm = DirectorDraft & { title: string; description: string };

// Compact profile sheet under the preview. Name and actions live in the desk header.
export function DirectorInfoPanel({
  director,
  draft,
  changedFields,
  onChange,
}: {
  director: PublicDirector;
  draft: DirectorForm;
  changedFields: DraftField[];
  onChange: (next: DirectorForm) => void;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-accent-ink/10 bg-paper/85 px-3 py-2.5">
      <DirectorProfileSection
        director={director}
        draft={draft}
        changedFields={changedFields}
        onChange={(next) => onChange({ ...draft, ...next })}
      />
    </section>
  );
}
