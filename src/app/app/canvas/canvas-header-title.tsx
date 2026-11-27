// Canvas name as plain text. The chevron button opens the canvas list.

import { ChevronDown, Pencil } from "lucide-react";

export function CanvasHeaderTitle({
  title,
  isZh,
  onOpenLibrary,
  onStartRename,
}: {
  title: string;
  isZh: boolean;
  onOpenLibrary: () => void;
  onStartRename: () => void;
}) {
  const openLabel = isZh ? "開啟或管理畫布" : "Open or manage canvases";
  const renameLabel = isZh ? "重新命名" : "Rename canvas";

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="max-w-[220px] truncate text-xs font-semibold text-white">{title}</span>
      <button
        type="button"
        onClick={onOpenLibrary}
        title={openLabel}
        aria-label={openLabel}
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[9px] text-white/55 transition hover:bg-white/8 hover:text-white"
      >
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onStartRename}
        title={renameLabel}
        aria-label={renameLabel}
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[9px] text-white/50 transition hover:bg-white/8 hover:text-white"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
