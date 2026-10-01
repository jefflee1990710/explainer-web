"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { skillBansNarration } from "@/service/director/skill-rules";
import type { PhaseAEditInput } from "@/model/project";

const fieldClass =
  "mt-1 w-full rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function StoryboardProposalFields({
  draft,
  skillSlug,
  disabled,
  onChange,
}: {
  draft: PhaseAEditInput;
  skillSlug?: string;
  disabled?: boolean;
  onChange: (next: PhaseAEditInput) => void;
}) {
  const { t } = useI18n();
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
          label={t("brief.proposal.coreMessage")}
          value={draft.coreMessage}
          rows={3}
          disabled={disabled}
          onChange={(value) => update("coreMessage", value)}
        />
        <EditField
          label={t("brief.proposal.hook")}
          value={draft.hookStrategy}
          rows={3}
          disabled={disabled}
          onChange={(value) => update("hookStrategy", value)}
        />
        <EditField
          label={skillBansNarration(skillSlug) ? t("brief.proposal.castVoice") : t("brief.proposal.narrator")}
          value={draft.narrator}
          rows={2}
          disabled={disabled}
          onChange={(value) => update("narrator", value)}
        />
        <EditField
          label={t("brief.proposal.visualWorld")}
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
