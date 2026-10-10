"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { FilmstripPane } from "@/presentation/studio/filmstrip-pane";

// Editor body: toolbar, preview and inspector, then the filmstrip pinned at the bottom.
// `timelineBar` sits directly above the filmstrip for batch actions.
export function StudioFrame({
  preview,
  inspector,
  aside,
  timeline,
  toolbar,
  timelineBar,
}: {
  preview: React.ReactNode;
  inspector?: React.ReactNode;
  aside?: React.ReactNode;
  timeline?: React.ReactNode;
  toolbar?: React.ReactNode;
  timelineBar?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--studio-canvas)]">
      {toolbar ? (
        <div className="shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)]">
          {toolbar}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:flex-row">
          {inspector ? (
            <section
              aria-label={t("production.shell.clipInfoAria")}
              className="shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] lg:h-full lg:w-[460px] lg:overflow-y-auto lg:border-b-0 lg:border-r"
            >
              {inspector}
            </section>
          ) : null}
          <section
            aria-label={t("production.shell.previewAria")}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--studio-canvas)] lg:h-full lg:overflow-hidden"
          >
            {preview}
          </section>
          {aside ? (
            <section
              aria-label={t("production.shell.chatAria")}
              className="flex min-h-[28rem] shrink-0 flex-col border-t border-[var(--studio-line)] bg-[var(--studio-panel)] lg:h-full lg:min-h-0 lg:w-[340px] lg:border-t-0 lg:border-l"
            >
              {aside}
            </section>
          ) : null}
        </div>
      </div>
      {timelineBar ? (
        <div className="shrink-0 border-t border-[var(--studio-line)] bg-[var(--studio-panel)]">
          {timelineBar}
        </div>
      ) : null}
      {timeline ? <FilmstripPane>{timeline}</FilmstripPane> : null}
    </div>
  );
}
