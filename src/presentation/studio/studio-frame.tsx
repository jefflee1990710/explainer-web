// Editor body: optional toolbar, preview and inspector, with the filmstrip
// pinned below. `timelineBar` floats batch actions right above the filmstrip.
export function StudioFrame({
  preview,
  inspector,
  timeline,
  toolbar,
  timelineBar,
}: {
  preview: React.ReactNode;
  inspector: React.ReactNode;
  timeline: React.ReactNode;
  toolbar?: React.ReactNode;
  timelineBar?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--studio-canvas)]">
      {toolbar ? (
        <div className="shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)]">
          {toolbar}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:flex-row">
          <section
            aria-label="片段資訊"
            className="shrink-0 border-b border-[var(--studio-line)] bg-[var(--studio-panel)] lg:h-full lg:w-[300px] lg:overflow-y-auto lg:border-b-0 lg:border-r"
          >
            {inspector}
          </section>
          <section
            aria-label="預覽"
            className="min-w-0 flex-1 bg-[var(--studio-canvas)] lg:h-full lg:overflow-y-auto"
          >
            {preview}
          </section>
        </div>
      </div>
      {timelineBar ? (
        <div className="shrink-0 border-t border-[var(--studio-line)] bg-[var(--studio-panel)]">
          {timelineBar}
        </div>
      ) : null}
      <section
        aria-label="時間軸"
        className="h-28 shrink-0 overflow-x-auto overflow-y-hidden border-t border-[var(--studio-line)] bg-[var(--studio-canvas)]"
      >
        {timeline}
      </section>
    </div>
  );
}
