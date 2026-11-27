// Canvas trash button. The first click arms it; the second click deletes.

import { Trash2 } from "lucide-react";

export function CanvasDeleteButton({
  armed,
  isZh,
  onArm,
  onConfirm,
}: {
  armed: boolean;
  isZh: boolean;
  onArm: () => void;
  onConfirm: () => void;
}) {
  const label = armed
    ? isZh
      ? "再按一次刪除"
      : "Click again to delete"
    : isZh
      ? "刪除畫布"
      : "Delete canvas";

  return (
    <button
      type="button"
      data-canvas-delete=""
      title={label}
      aria-label={label}
      aria-pressed={armed}
      onClick={() => (armed ? onConfirm() : onArm())}
      className={`ml-auto grid h-6 w-6 cursor-pointer place-items-center rounded-md transition ${
        armed
          ? "bg-rose-500/20 text-rose-200"
          : "text-white/40 hover:bg-white/10 hover:text-rose-300"
      }`}
    >
      <Trash2 className="h-3 w-3" aria-hidden />
    </button>
  );
}
