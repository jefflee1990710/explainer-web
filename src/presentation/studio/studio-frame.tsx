"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Editor body: optional filmstrip pinned on top, then toolbar, preview and inspector.
// `timelineBar` sits directly under the filmstrip for batch actions.
export function StudioFrame({
  preview,
  inspector,
  timeline,
  toolbar,
  timelineBar,
}: {
  preview: React.ReactNode;
  inspector: React.ReactNode;
  timeline?: React.ReactNode;
  toolbar?: React.ReactNode;
  timelineBar?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--studio-canvas)]">
      {timeline ? (
        <section
          aria-label={t("production.shell.timelineAria")}
          className="shrink-0 overflow-x-auto overflow-y-hidden border-b border-[var(--studio-line)] bg-[var(--studio-canvas)]"
        >
          {timeline}
        </section>
      ) : null}
      {timelineBar ? (
        <div className="shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)]">
          {timelineBar}
        </div>
      ) : null}
      {toolbar ? (
        <div className="shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)]">
          {toolbar}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:flex-row">
          <section
            aria-label={t("production.shell.clipInfoAria")}
            className="shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] lg:h-full lg:w-[300px] lg:overflow-y-auto lg:border-b-0 lg:border-r"
          >
            {inspector}
          </section>
          <section
            aria-label={t("production.shell.previewAria")}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--studio-canvas)] lg:h-full"
          >
            {preview}
          </section>
        </div>
      </div>
    </div>
  );
}
