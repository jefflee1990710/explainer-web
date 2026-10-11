"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ColumnResizeHandle } from "@/presentation/studio/column-resize-handle";
import { FilmstripPane } from "@/presentation/studio/filmstrip-pane";
import {
  INSPECTOR_WIDTH_DEFAULT,
  INSPECTOR_WIDTH_KEY,
  PANE_WIDTH_MAX,
  PANE_WIDTH_MIN,
  SCENE_CHAT_WIDTH_DEFAULT,
  SCENE_CHAT_WIDTH_KEY,
  clampPaneWidth,
  readPaneWidth,
} from "@/presentation/studio/pane-width";

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
  const inspectorWidth = useStoredPaneWidth(INSPECTOR_WIDTH_KEY, INSPECTOR_WIDTH_DEFAULT);
  const chatWidth = useStoredPaneWidth(SCENE_CHAT_WIDTH_KEY, SCENE_CHAT_WIDTH_DEFAULT);

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
              className="flex w-full shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] lg:h-full lg:w-[var(--studio-pane)] lg:border-b-0"
              style={{ ["--studio-pane" as string]: `${inspectorWidth.width}px` }}
            >
              <div className="min-w-0 flex-1 overflow-y-auto lg:h-full">{inspector}</div>
              <ColumnResizeHandle
                label={t("production.shell.clipInfoResize")}
                value={inspectorWidth.width}
                min={PANE_WIDTH_MIN}
                max={PANE_WIDTH_MAX}
                grow="right"
                onDrag={inspectorWidth.preview}
                onCommit={inspectorWidth.commit}
              />
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
              className="flex min-h-[28rem] w-full shrink-0 flex-col border-t border-[var(--studio-line)] bg-[var(--studio-panel)] lg:h-full lg:min-h-0 lg:w-[var(--studio-pane)] lg:flex-row lg:border-t-0"
              style={{ ["--studio-pane" as string]: `${chatWidth.width}px` }}
            >
              <ColumnResizeHandle
                label={t("production.shell.chatResize")}
                value={chatWidth.width}
                min={PANE_WIDTH_MIN}
                max={PANE_WIDTH_MAX}
                grow="left"
                onDrag={chatWidth.preview}
                onCommit={chatWidth.commit}
              />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:h-full">{aside}</div>
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

function useStoredPaneWidth(key: string, fallback: number) {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    setWidth(readPaneWidth(window.localStorage.getItem(key), fallback));
  }, [key, fallback]);

  function commit(next: number) {
    const width = clampPaneWidth(next, fallback);
    setWidth(width);
    window.localStorage.setItem(key, String(width));
    return width;
  }

  return { width, preview: (next: number) => setWidth(clampPaneWidth(next, fallback)), commit };
}
