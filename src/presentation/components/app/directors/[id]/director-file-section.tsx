"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { DIRECTOR_FILE_MAX } from "@/service/director/director-edits";

// One collapsible markdown file: editable textarea for custom directors, plain text otherwise.
export function DirectorFileSection({
  path,
  content,
  editable,
  modified,
  defaultOpen = false,
  onChange,
}: {
  path: string;
  content: string;
  editable: boolean;
  modified: boolean;
  defaultOpen?: boolean;
  onChange: (content: string) => void;
}) {
  const { t } = useI18n();
  return (
    <details
      open={defaultOpen}
      className="group rounded-[1.25rem] border border-accent-ink/10 bg-paper"
    >
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-semibold">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="text-muted transition group-open:rotate-90">
            ›
          </span>
          <span className="truncate font-mono text-xs">{path}</span>
        </span>
        {modified ? (
          <span className="shrink-0 rounded-full bg-lime px-2 py-0.5 text-xs font-bold">
            {t("directors.modified")}
          </span>
        ) : null}
      </summary>
      <div className="border-t border-accent-ink/10 p-3">
        {editable ? (
          <textarea
            rows={16}
            value={content}
            maxLength={DIRECTOR_FILE_MAX}
            aria-label={path}
            spellCheck={false}
            onChange={(event) => onChange(event.target.value)}
            className="w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 font-mono text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        ) : (
          <pre className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap px-1 font-mono text-xs leading-5 text-muted">
            {content}
          </pre>
        )}
      </div>
    </details>
  );
}
