"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type {
  AnnotationEditorHandle,
  AnnotationTool,
} from "@/components/annotation-editor";
import { FramePromptPanel } from "@/components/project/frame-prompt-panel";
import { Spinner } from "@/components/spinner";
import type { SceneTextLanguage } from "@/types/project";
import type {
  AspectRatio,
  ClipFrame,
  FramePosition,
  FrameRevisionInput,
  StoryboardRow,
} from "@/types/project";

const FRAME_LABEL: Record<FramePosition, string> = {
  start: "起始",
  end: "結尾",
};

// Intrinsic size guess before the image reports its natural dimensions.
const FALLBACK_SIZE: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1536, height: 1024 },
  "9:16": { width: 1024, height: 1536 },
  "1:1": { width: 1024, height: 1024 },
};

const MAX_REMARK_LENGTH = 600;

// Fabric.js touches `window` on import; load the editor in the browser only.
const AnnotationEditor = dynamic(
  () => import("@/components/annotation-editor").then((mod) => mod.AnnotationEditor),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center text-accent-ink/40">
        <Spinner className="h-5 w-5" />
      </div>
    ),
  },
);

// Per-tool guidance shown under the canvas.
const TOOL_HINT: Record<AnnotationTool, string> = {
  draw: "把要改的地方圈起來、畫箭頭指出方向；在圖上連點兩下可加上文字備註。畫完可切到「選取」調整。",
  select: "點選物件即可拖曳；拉角落把手縮放、上方把手旋轉；按 Delete 刪除。連點兩下空白處可加文字。",
  text: "在圖上點一下放置文字，輸入完點其他地方結束。",
};

// Modal for reviewing one storyboard frame: draw markings and text over the
// image (each one a movable/resizable/rotatable object), leave a remark, then
// send both with a paid redo (1 credit).
export function FrameEditDialog({
  frame,
  clip,
  aspectRatio,
  credits,
  sceneTextEnabled,
  sceneTextLanguage,
  canRegenerate,
  onClose,
  onRegenerate,
}: {
  frame: ClipFrame;
  clip: StoryboardRow;
  aspectRatio: AspectRatio;
  credits: number;
  sceneTextEnabled: boolean;
  sceneTextLanguage: SceneTextLanguage;
  // False while another action is pending or frames are still generating.
  canRegenerate: boolean;
  onClose: () => void;
  onRegenerate: (revision: FrameRevisionInput) => void;
}) {
  const titleId = useId();
  const remarkId = useId();
  const editorRef = useRef<AnnotationEditorHandle>(null);
  const src = frame.blobUrl || frame.outputUrl || "";

  const [tool, setTool] = useState<AnnotationTool>("draw");
  // Objects on the annotation layer (strokes + texts) and how many are selected.
  const [objectCount, setObjectCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  // Prefill with the last remark so the director can iterate on it.
  const [remark, setRemark] = useState(frame.revision?.remark || "");
  const [imageSize, setImageSize] = useState(FALLBACK_SIZE[aspectRatio]);

  // Esc closes, matching the backdrop click.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasChanges = objectCount > 0 || remark.trim().length > 0;
  const enoughCredits = credits >= 1;
  const canSubmit = canRegenerate && enoughCredits;

  function submit() {
    if (!canSubmit) return;
    const sketchDataUrl = editorRef.current?.toDataURL() || undefined;
    onRegenerate({
      remark: remark.trim() || undefined,
      sketchDataUrl,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-accent-ink/10 bg-paper shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
              分鏡圖 · #{clip.clipNumber} {FRAME_LABEL[frame.position]}
            </p>
            <h2 id={titleId} className="font-display mt-1 text-xl font-bold">
              標註並重畫這張分鏡圖
            </h2>
            <p className="mt-1 text-xs text-muted">
              直接在圖上畫圈、箭頭或塗改，再寫下想改的地方；重畫時會一起交給模型參考。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/15 text-muted transition hover:border-accent-ink/40 hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Left: drawing surface */}
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ToolGroup label="工具">
                <ToggleButton
                  active={tool === "draw"}
                  onClick={() => setTool("draw")}
                  label="畫筆"
                >
                  <PenIcon />
                </ToggleButton>
                <ToggleButton
                  active={tool === "select"}
                  onClick={() => setTool("select")}
                  label="選取"
                >
                  <CursorIcon />
                </ToggleButton>
                <ToggleButton
                  active={tool === "text"}
                  onClick={() => setTool("text")}
                  label="文字"
                >
                  <TextIcon />
                </ToggleButton>
              </ToolGroup>

              <div className="ml-auto flex items-center gap-1.5">
                <SmallButton
                  onClick={() => editorRef.current?.deleteSelected()}
                  disabled={selectedCount === 0}
                >
                  <TrashIcon />
                  刪除選取{selectedCount > 1 ? `（${selectedCount}）` : ""}
                </SmallButton>
                <SmallButton
                  onClick={() => editorRef.current?.clear()}
                  disabled={objectCount === 0}
                >
                  <BroomIcon />
                  全部清除
                </SmallButton>
              </div>
            </div>

            {/* Image + transparent sketch layer, sized to the image's own ratio */}
            <div className="flex justify-center rounded-[1.25rem] border border-accent-ink/10 bg-accent-ink/5 p-3">
              <div
                className="relative overflow-hidden rounded-xl bg-paper shadow-sm"
                style={{
                  width: `min(100%, calc(62vh * ${imageSize.width / imageSize.height}))`,
                  aspectRatio: `${imageSize.width} / ${imageSize.height}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`#${clip.clipNumber} ${FRAME_LABEL[frame.position]}畫格`}
                  draggable={false}
                  onLoad={(event) => {
                    const { naturalWidth, naturalHeight } = event.currentTarget;
                    if (naturalWidth && naturalHeight) {
                      setImageSize({ width: naturalWidth, height: naturalHeight });
                    }
                  }}
                  className="absolute inset-0 h-full w-full select-none object-fill"
                />
                <AnnotationEditor
                  editorRef={editorRef}
                  width={imageSize.width}
                  height={imageSize.height}
                  tool={tool}
                  onChange={setObjectCount}
                  onSelectionChange={setSelectedCount}
                  onToolChange={setTool}
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
            <p className="text-xs text-muted">
              {objectCount > 0 ? (
                <span className="mr-1 font-semibold text-foreground">已標註 {objectCount} 個物件。</span>
              ) : null}
              {TOOL_HINT[tool]}
              {objectCount > 0 ? " 這些標記只作為指示，不會出現在新圖裡。" : ""}
            </p>
          </div>

          {/* Right: scene context + remark */}
          <aside className="flex min-w-0 flex-col gap-4">
            <div className="rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 p-4">
              <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-muted">
                這段的畫面
              </p>
              <p className="mt-2 text-sm leading-6">{clip.explainerScene}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{clip.motionCamera}</p>
            </div>

            <FramePromptPanel
              sceneTextEnabled={sceneTextEnabled}
              sceneTextLanguage={sceneTextLanguage}
              voiceoverLine={clip.englishVo}
              frames={[frame]}
            />

            <div>
              <label htmlFor={remarkId} className="font-display text-sm font-bold">
                修改備註
              </label>
              <textarea
                id={remarkId}
                rows={5}
                maxLength={MAX_REMARK_LENGTH}
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                placeholder="例如：角色要面向右邊；把左上角的文字改成「複利」；背景保持空白。"
                className="mt-2 w-full resize-y rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-muted">
                {remark.length}/{MAX_REMARK_LENGTH}
              </p>
            </div>

            {frame.revision?.annotatedUrl ? (
              <a
                href={frame.revision.annotatedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-muted underline-offset-2 hover:underline"
              >
                查看上次的標註圖 ↗
              </a>
            ) : null}

            <div className="mt-auto space-y-2 border-t border-accent-ink/10 pt-4">
              <p className="text-xs text-muted">
                重畫將扣 <strong className="text-foreground">1 credit</strong>（剩餘 {credits}）
                {!hasChanges ? "；沒有標註或備註時會直接重畫一次。" : "。"}
              </p>
              {!enoughCredits ? (
                <p className="text-xs font-medium text-accent">credits 不足，請先升級方案。</p>
              ) : !canRegenerate ? (
                <p className="text-xs font-medium text-accent">請等目前的動作完成後再重畫。</p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-muted transition hover:text-foreground"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <RefreshIcon />
                  重畫 · 1 credit
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 rounded-full border border-accent-ink/10 bg-paper/85 p-1"
    >
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`grid h-8 min-w-8 cursor-pointer place-items-center rounded-full px-2 text-xs font-semibold transition ${
        active ? "bg-accent-ink text-lime" : "text-muted hover:bg-accent-ink/5 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SmallButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[34px] cursor-pointer items-center gap-1 rounded-full border border-accent-ink/15 bg-paper px-3 text-xs font-semibold transition hover:border-accent-ink/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m4 20 4-1 10-10-3-3L5 16l-1 4Zm11-14 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 3l14 8-6 2-2 6L5 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 6V4h14v2M12 4v16m-3 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BroomIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m20 4-8.5 8.5M4 20c1-4 3.5-7 7.5-7.5L13 14c-.5 4-3 6-9 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
