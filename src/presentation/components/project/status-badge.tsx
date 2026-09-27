"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { projectStatusLabel } from "@/util/project-status-i18n";
import { STATUS_META, type StatusTone } from "@/service/project-status";
import type { ProjectStatus } from "@/model/project";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-[var(--studio-fill)] text-[var(--studio-muted)] border-transparent",
  working: "bg-[#e8f1ff] text-[#1d4ed8] border-transparent",
  action: "bg-[var(--studio-cyan-soft)] text-[#0e7c86] border-transparent",
  success: "bg-[#e8f8ef] text-[#15803d] border-transparent",
  danger: "bg-[#ffecec] text-[#e11d48] border-transparent",
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
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${TONE_CLASS[meta.tone]} ${className}`}
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
