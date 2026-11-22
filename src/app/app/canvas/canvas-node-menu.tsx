"use client";

// Right-click menu on a canvas node: add that node, or its whole group, to the agent chat.

import { useEffect } from "react";
import type { ContextMenuChoice } from "@/service/canvas-agent/context-block";

export function CanvasNodeMenu({
  x,
  y,
  isZh,
  choices,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  isZh: boolean;
  choices: readonly ContextMenuChoice[];
  onPick: (choice: ContextMenuChoice) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-canvas-node-menu]")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const left = Math.max(8, Math.min(x, window.innerWidth - 228));
  const top = Math.max(8, Math.min(y, window.innerHeight - 96));

  return (
    <div
      data-canvas-node-menu
      role="menu"
      className="fixed z-50 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#12161f]/95 p-1 shadow-2xl backdrop-blur-md"
      style={{ left, top }}
    >
      {choices.map((choice) => (
        <button
          key={choice.kind}
          type="button"
          role="menuitem"
          onClick={() => onPick(choice)}
          className="block w-full cursor-pointer rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-white/90 transition hover:bg-white/10"
        >
          {choice.kind === "node"
            ? isZh
              ? "加入聊天：這個節點"
              : "Add this node to chat"
            : isZh
              ? "加入聊天：整個群組"
              : "Add this group to chat"}
        </button>
      ))}
    </div>
  );
}
