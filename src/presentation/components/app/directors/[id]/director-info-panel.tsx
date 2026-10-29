"use client";

import type { IDirectorBehavior } from "@/model/director";
import type { PerformanceKey, PerformanceSlots } from "@/model/director-performance";
import type { ProfileKey } from "@/model/director-profile";
import type { PublicDirector } from "@/presentation/serialize";
import { DirectorBehaviorSection } from "@/presentation/components/app/directors/[id]/director-behavior-section";
import { DirectorPerformanceSection } from "@/presentation/components/app/directors/[id]/director-performance-section";
import { DirectorProfileSection } from "@/presentation/components/app/directors/[id]/director-profile-section";
import { type DirectorDraft, type DraftField } from "@/service/director/director-edits";
import { emptyPerformance } from "@/service/director/performance";

export type DirectorForm = DirectorDraft & {
  title: string;
  description: string;
  behavior?: IDirectorBehavior;
};

// Editable behavior, profile, and performance controls for the director studio.
export function DirectorInfoPanel({
  director,
  draft,
  changedFields,
  onChange,
}: {
  director: PublicDirector;
  draft: DirectorForm;
  changedFields: DraftField[];
  onChange?: (next: DirectorForm) => void;
}) {
  const editable = director.isCustom && Boolean(onChange);

  function handleBehaviorChange(
    nextBehavior: IDirectorBehavior,
    defaultPerformance?: PerformanceSlots,
  ) {
    if (!onChange) return;
    onChange({
      ...draft,
      behavior: nextBehavior,
      ...(nextBehavior.speechMode === "lip-sync" && !draft.customPerformance
        ? { customPerformance: defaultPerformance ?? emptyPerformance() }
        : {}),
    });
  }

  function handleProfileFieldChange(key: ProfileKey, value: string) {
    if (!onChange) return;
    onChange({
      ...draft,
      customProfile: {
        ...draft.customProfile,
        [key]: value,
      },
    });
  }

  function handleExtraChange(value: string) {
    if (!onChange) return;
    onChange({
      ...draft,
      extraInstructions: value,
    });
  }

  function handlePerformanceSlotChange(key: PerformanceKey, value: string) {
    if (!onChange) return;
    const base = draft.customPerformance ?? emptyPerformance();
    onChange({
      ...draft,
      customPerformance: {
        ...base,
        [key]: value,
      },
    });
  }

  return (
    <section className="min-w-0 rounded-xl border border-accent-ink/10 bg-paper/85 px-3 py-2.5">
      <DirectorBehaviorSection
        behavior={draft.behavior ?? director.behavior}
        editable={editable}
        onChangeBehavior={handleBehaviorChange}
      />
      <DirectorProfileSection
        director={director}
        draft={draft}
        changedFields={changedFields}
        onChangeField={handleProfileFieldChange}
        onChangeExtra={handleExtraChange}
      />
      <DirectorPerformanceSection
        director={director}
        draft={draft}
        changedFields={changedFields}
        onChangeSlot={handlePerformanceSlotChange}
      />
    </section>
  );
}
