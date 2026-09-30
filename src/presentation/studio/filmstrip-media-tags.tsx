// Orange scene / blue video marks on a filmstrip clip. Shown only once that
// output file exists, so a glance tells which clips are still empty.
export function FilmstripMediaTags({
  hasScene,
  hasVideo,
}: {
  hasScene: boolean;
  hasVideo: boolean;
}) {
  if (!hasScene && !hasVideo) return null;
  return (
    <span className="absolute bottom-1 left-1 flex items-center gap-0.5">
      {hasScene ? (
        <span
          title="場景圖已完成"
          className="grid h-4 w-4 place-items-center rounded-sm bg-orange-500 text-white shadow-sm"
        >
          <SceneIcon />
        </span>
      ) : null}
      {hasVideo ? (
        <span
          title="影片已完成"
          className="grid h-4 w-4 place-items-center rounded-sm bg-blue-500 text-white shadow-sm"
        >
          <VideoIcon />
        </span>
      ) : null}
    </span>
  );
}

function SceneIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="m2 11 3.2-3 2.3 2.2L10.2 7 14 11" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="5.2" cy="6.2" r="1" fill="currentColor" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
      <path d="M6.2 4.6v6.8a.6.6 0 0 0 .92.5l5.2-3.4a.6.6 0 0 0 0-1l-5.2-3.4a.6.6 0 0 0-.92.5Z" />
    </svg>
  );
}
