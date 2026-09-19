"use client";

import type { PhaseAEditInput } from "@/types/project";

const fieldClass =
  "mt-1 w-full rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function StoryboardProposalFields({
  draft,
  disabled,
  onChange,
}: {
  draft: PhaseAEditInput;
  disabled?: boolean;
  onChange: (next: PhaseAEditInput) => void;
}) {
  function update<K extends keyof Omit<PhaseAEditInput, "clips">>(
    key: K,
    value: PhaseAEditInput[K],
  ) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            標題
          </span>
          <input
            value={draft.localizedTitle}
            onChange={(event) => update("localizedTitle", event.target.value)}
            disabled={disabled}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            英文標題
          </span>
          <input
            value={draft.englishTitle}
            onChange={(event) => update("englishTitle", event.target.value)}
            disabled={disabled}
            className={fieldClass}
          />
        </label>
      </div>
      <dl className="grid gap-4 text-sm md:grid-cols-2">
        <EditField
          label="核心訊息"
          value={draft.coreMessage}
          rows={3}
          disabled={disabled}
          onChange={(value) => update("coreMessage", value)}
        />
        <EditField
          label="開場鉤子"
          value={draft.hookStrategy}
          rows={3}
          disabled={disabled}
          onChange={(value) => update("hookStrategy", value)}
        />
        <EditField
          label="旁白角色"
          value={draft.narrator}
          rows={2}
          disabled={disabled}
          onChange={(value) => update("narrator", value)}
        />
        <EditField
          label="視覺世界"
          value={draft.visualWorld}
          rows={3}
          disabled={disabled}
          onChange={(value) => update("visualWorld", value)}
        />
      </dl>
    </div>
  );
}

function EditField({
  label,
  value,
  rows,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} resize-y`}
      />
    </label>
  );
}
