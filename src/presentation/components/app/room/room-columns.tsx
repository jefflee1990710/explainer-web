"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ColumnResizeHandle } from "@/presentation/studio/column-resize-handle";
import {
  ROOM_COLUMN_MAX,
  ROOM_COLUMN_MIN,
  ROOM_LEFT_WIDTH_DEFAULT,
  ROOM_LEFT_WIDTH_KEY,
  ROOM_RIGHT_WIDTH_DEFAULT,
  ROOM_RIGHT_WIDTH_KEY,
  clampRoomColumnWidth,
  readRoomColumnWidth,
} from "@/presentation/components/app/room/room-column-width";

// Three fitting-room panes. The side columns drag wider or narrower; the preview takes the rest.
export function RoomColumns({
  left,
  center,
  right,
}: {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}) {
  const { t } = useI18n();
  const leftWidth = useRoomColumnWidth(ROOM_LEFT_WIDTH_KEY, ROOM_LEFT_WIDTH_DEFAULT);
  const rightWidth = useRoomColumnWidth(ROOM_RIGHT_WIDTH_KEY, ROOM_RIGHT_WIDTH_DEFAULT);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
      <section
        aria-label={t("characters.roomWardrobeHeading")}
        className="flex w-full shrink-0 flex-col border-b border-[var(--studio-line)] bg-[var(--studio-panel)] lg:h-full lg:w-[var(--room-col)] lg:flex-row lg:border-b-0"
        style={{ ["--room-col" as string]: `${leftWidth.width}px` }}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{left}</div>
        <ColumnResizeHandle
          label={t("production.shell.roomLeftResize")}
          value={leftWidth.width}
          min={ROOM_COLUMN_MIN}
          max={ROOM_COLUMN_MAX}
          grow="right"
          track="edge"
          onDrag={leftWidth.preview}
          onCommit={leftWidth.commit}
        />
      </section>
      <section className="flex min-h-[24rem] min-w-0 flex-1 flex-col overflow-hidden lg:h-full lg:min-h-0">
        {center}
      </section>
      <section
        aria-label={t("production.shell.roomHistoryAria")}
        className="flex min-h-[20rem] w-full shrink-0 flex-col border-t border-[var(--studio-line)] bg-[var(--studio-panel)] lg:h-full lg:min-h-0 lg:w-[var(--room-col)] lg:flex-row lg:border-t-0"
        style={{ ["--room-col" as string]: `${rightWidth.width}px` }}
      >
        <ColumnResizeHandle
          label={t("production.shell.roomRightResize")}
          value={rightWidth.width}
          min={ROOM_COLUMN_MIN}
          max={ROOM_COLUMN_MAX}
          grow="left"
          track="edge"
          onDrag={rightWidth.preview}
          onCommit={rightWidth.commit}
        />
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{right}</div>
      </section>
    </div>
  );
}

function useRoomColumnWidth(key: string, fallback: number) {
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    setWidth(readRoomColumnWidth(window.localStorage.getItem(key), fallback));
  }, [key, fallback]);

  function commit(next: number) {
    const width = clampRoomColumnWidth(next, fallback);
    setWidth(width);
    window.localStorage.setItem(key, String(width));
  }

  return {
    width,
    preview: (next: number) => setWidth(clampRoomColumnWidth(next, fallback)),
    commit,
  };
}
