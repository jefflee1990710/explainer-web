"use client";

// Larger prompt box for a model node. The card stays compact; this dialog is for editing.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  initial: string;
  isZh: boolean;
  onCancel: () => void;
  onSave: (prompt: string) => void;
};

export function PromptEditorDialog({ initial, isZh, onCancel, onSave }: Props) {
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isZh ? "編輯提示詞" : "Edit prompt"}
      onClick={onCancel}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-[720px] max-w-full flex-col rounded-2xl border border-white/15 bg-[#10141c] p-5 text-white shadow-2xl"
      >
        <div className="text-sm font-semibold">{isZh ? "編輯提示詞" : "Edit prompt"}</div>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {isZh ? "在較大的欄位修改這段提示詞。" : "Edit this prompt in a larger box."}
        </p>
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={isZh ? "描述你想生成的畫面或動作…" : "Describe what to generate…"}
          className="nodrag nowheel mt-4 min-h-[50vh] w-full flex-1 resize-y rounded-[10px] border border-white/10 bg-[#0b0e14] px-3 py-2.5 text-[13px] leading-relaxed text-white/90 placeholder:text-white/30 focus:border-[#c6f24b]/60 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="cursor-pointer rounded-lg bg-[#c6f24b] px-3 py-1.5 text-xs font-bold text-[#11141b] transition hover:brightness-105"
          >
            {isZh ? "完成" : "Done"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
