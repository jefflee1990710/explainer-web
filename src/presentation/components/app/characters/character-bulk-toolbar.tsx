"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Multi-select bar above the character grid: enter/exit select mode, select all, and bulk delete.
export function CharacterBulkToolbar({
  totalCount,
  selectedCount,
  selectMode,
  onToggleSelectMode,
  onSelectAll,
  onDeselectAll,
  onOpenDelete,
}: {
  totalCount: number;
  selectedCount: number;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenDelete: () => void;
}) {
  const { t } = useI18n();
  const active = selectMode || selectedCount > 0;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleSelectMode}
          aria-pressed={active}
          className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-3.5 text-xs font-semibold transition hover:border-accent-ink/40"
        >
          {active ? t("characters.cancelSelect") : t("characters.selectMode")}
        </button>
        {active ? (
          <>
            <button
              type="button"
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-3.5 text-xs font-semibold transition hover:border-accent-ink/40"
            >
              {allSelected ? t("characters.deselectAll") : t("characters.selectAll")}
            </button>
            <span className="px-1 text-xs font-medium text-muted">
              {t("characters.selectedCount", { n: selectedCount })}
            </span>
          </>
        ) : null}
      </div>
      {selectedCount > 0 ? (
        <button
          type="button"
          data-intent="danger"
          onClick={onOpenDelete}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5"
        >
          {t("characters.deleteSelected", { n: selectedCount })}
        </button>
      ) : null}
    </div>
  );
}
