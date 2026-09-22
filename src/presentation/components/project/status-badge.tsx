"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { projectStatusLabel } from "@/util/project-status-i18n";
import { STATUS_META, type StatusTone } from "@/service/project-status";
import type { ProjectStatus } from "@/model/project";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-accent-ink/5 text-muted border-accent-ink/10",
  working: "bg-sky/15 text-[#1f4fb8] border-sky/30",
  action: "bg-lime/70 text-accent-ink border-accent-ink/15",
  success: "bg-teal/15 text-[#0f766e] border-teal/30",
  danger: "bg-accent/12 text-accent border-accent/30",
};

// Colour-coded status pill; icon + text so colour is never the only cue.
export function StatusBadge({
  status,
  className = "",
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const { t } = useI18n();
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[meta.tone]} ${className}`}
    >
      {meta.busy ? (
        <Spinner className="h-3 w-3" />
      ) : (
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${
            meta.tone === "danger"
              ? "bg-accent"
              : meta.tone === "success"
                ? "bg-teal"
                : meta.tone === "action"
                  ? "bg-accent-ink"
                  : "bg-muted"
          }`}
        />
      )}
      {projectStatusLabel(status, t)}
    </span>
  );
}
