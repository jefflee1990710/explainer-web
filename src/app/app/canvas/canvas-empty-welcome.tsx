// Welcome card for a canvas that has no nodes on it yet.

import type { CanvasStarterTemplateId } from "@/service/canvas/core/templates";

// Saved graph nodes omit upload placeholders, which are still cards on screen.
// The welcome uses the live node count so any card, including a failed upload, hides it.
export function showEmptyCanvasWelcome(nodeCount: number): boolean {
  return nodeCount === 0;
}

export function CanvasEmptyWelcome({
  nodeCount,
  isZh,
  onApplyTemplate,
}: {
  nodeCount: number;
  isZh: boolean;
  onApplyTemplate: (templateId: CanvasStarterTemplateId) => void;
}) {
  if (!showEmptyCanvasWelcome(nodeCount)) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="pointer-events-auto max-w-md rounded-2xl border border-white/10 bg-[#12161f]/90 p-6 text-center shadow-2xl backdrop-blur-md">
        <h2 className="text-base font-bold text-white">
          {isZh ? "開始打造你的 AI 生成工作流" : "Build Your AI Visual Workflow"}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-white/60">
          {isZh
            ? "把電腦上的圖片／影片直接拖到畫布、從左側點擊或拖入模型，連線後即可單節點或一鍵 Run Flow 生成。"
            : "Drop local images/videos onto the canvas, click or drag a model from the left panel, wire ports together, and click Run."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => onApplyTemplate("talking-head")}
            className="cursor-pointer rounded-[10px] bg-[#c6f24b] px-3.5 py-2 text-xs font-bold text-[#11141b] transition hover:brightness-105"
          >
            {isZh ? "套用：口播導演" : "Try: Talking Head Director"}
          </button>
          <button
            type="button"
            onClick={() => onApplyTemplate("explainer")}
            className="cursor-pointer rounded-[10px] border border-white/12 bg-white/6 px-3.5 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/12"
          >
            {isZh ? "套用：Explainer 解說片" : "Try: AI Explainer"}
          </button>
          <button
            type="button"
            onClick={() => onApplyTemplate("text-image-video")}
            className="cursor-pointer rounded-[10px] border border-white/12 bg-white/6 px-3.5 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/12"
          >
            {isZh ? "套用：文生圖 → 圖生影片" : "Try: Text → Image → Video"}
          </button>
        </div>
      </div>
    </div>
  );
}
