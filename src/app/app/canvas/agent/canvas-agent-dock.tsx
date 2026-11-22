"use client";

// Chat dock for the Scro canvas agent. It sits under the canvas or along the right
// edge. Graph edits come back as ops that the workspace replays onto the live canvas.

import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasEdge, CanvasNode, CanvasViewport } from "@/model/canvas";
import {
  clearCanvasAgentMessagesAction,
  sendCanvasAgentMessageAction,
} from "@/presentation/actions/canvas-agent";
import type { CanvasAgentMessageDto } from "@/service/canvas-agent/history";
import {
  type CanvasAgentLanguage,
  type CanvasAgentOp,
  isCanvasAgentLanguage,
} from "@/service/canvas-agent/types";
import type { LocaleId } from "@/util/i18n/locales";
import {
  canvasAgentCopy,
  defaultCanvasAgentLanguage,
} from "@/app/app/canvas/agent/canvas-agent-copy";
import { CanvasAgentClearDialog } from "@/app/app/canvas/agent/canvas-agent-clear-dialog";
import { CanvasAgentComposer } from "@/app/app/canvas/agent/canvas-agent-composer";
import { CanvasAgentEmpty } from "@/app/app/canvas/agent/canvas-agent-empty";
import {
  CanvasAgentHeader,
  type CanvasAgentDockSide,
} from "@/app/app/canvas/agent/canvas-agent-header";
import { CanvasAgentMessage } from "@/app/app/canvas/agent/canvas-agent-message";

const LANGUAGE_KEY = "scro.canvasAgent.language";
const HEIGHT_KEY = "scro.canvasAgent.height";
const WIDTH_KEY = "scro.canvasAgent.width";
const COLLAPSED_KEY = "scro.canvasAgent.collapsed";
export const CANVAS_AGENT_DOCK_SIDE_KEY = "scro.canvasAgent.side";
const MIN_HEIGHT = 160;
const MAX_HEIGHT = 520;
const DEFAULT_HEIGHT = 260;
const MIN_WIDTH = 320;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 360;
const COLLAPSED_SIZE = 40;

export type { CanvasAgentDockSide };

export type CanvasAgentGraphSnapshot = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: CanvasViewport;
};

type Phase = "thinking" | "applying";

export function CanvasAgentDock({
  locale,
  canvasId,
  side,
  initialMessages,
  getGraph,
  onApplyOps,
  onUndo,
  onSideChange,
}: {
  locale: LocaleId;
  canvasId: string;
  side: CanvasAgentDockSide;
  initialMessages: CanvasAgentMessageDto[];
  getGraph: () => CanvasAgentGraphSnapshot;
  onApplyOps: (messageId: string, ops: CanvasAgentOp[]) => Promise<{ skipped: number }>;
  onUndo: (messageId: string) => Promise<void>;
  onSideChange: (side: CanvasAgentDockSide) => void;
}) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const copy = canvasAgentCopy(isZh);

  const [messages, setMessages] = useState<CanvasAgentMessageDto[]>(initialMessages);
  const [language, setLanguage] = useState<CanvasAgentLanguage>(() => defaultCanvasAgentLanguage(locale));
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [failedText, setFailedText] = useState<string | null>(null);
  const [undoableId, setUndoableId] = useState<string | null>(null);
  const [undoneIds, setUndoneIds] = useState<ReadonlySet<string>>(new Set());
  const [notes, setNotes] = useState<ReadonlyMap<string, string>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = phase !== null;

  // Saved dock preferences are read after mount so server and client HTML match.
  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    const savedHeight = Number(window.localStorage.getItem(HEIGHT_KEY));
    const savedWidth = Number(window.localStorage.getItem(WIDTH_KEY));
    const savedCollapsed = window.localStorage.getItem(COLLAPSED_KEY) === "1";
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage */
    if (isCanvasAgentLanguage(savedLanguage)) setLanguage(savedLanguage);
    if (Number.isFinite(savedHeight) && savedHeight >= MIN_HEIGHT) {
      setHeight(Math.min(MAX_HEIGHT, savedHeight));
    }
    if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH) {
      setWidth(Math.min(MAX_WIDTH, savedWidth));
    }
    setCollapsed(savedCollapsed);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pendingText, failedText, phase]);

  const changeLanguage = useCallback((next: CanvasAgentLanguage) => {
    setLanguage(next);
    window.localStorage.setItem(LANGUAGE_KEY, next);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      window.localStorage.setItem(COLLAPSED_KEY, prev ? "0" : "1");
      return !prev;
    });
  }, []);

  const toggleSide = useCallback(() => {
    onSideChange(side === "bottom" ? "right" : "bottom");
  }, [onSideChange, side]);

  // Drag the top edge (bottom dock) or the left edge (right dock) to resize.
  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      const horizontal = side === "right";
      const start = horizontal ? event.clientX : event.clientY;
      const startSize = horizontal ? width : height;
      const min = horizontal ? MIN_WIDTH : MIN_HEIGHT;
      const max = horizontal ? MAX_WIDTH : MAX_HEIGHT;
      let latest = startSize;
      const onMove = (move: PointerEvent) => {
        const pointer = horizontal ? move.clientX : move.clientY;
        latest = Math.min(max, Math.max(min, startSize + (start - pointer)));
        if (horizontal) setWidth(latest);
        else setHeight(latest);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.localStorage.setItem(horizontal ? WIDTH_KEY : HEIGHT_KEY, String(Math.round(latest)));
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [height, side, width],
  );

  const send = useCallback(
    async (text: string) => {
      if (busy) return;
      setFailedText(null);
      setPendingText(text);
      setPhase("thinking");
      try {
        const graph = getGraph();
        const res = await sendCanvasAgentMessageAction({ canvasId, text, language, ...graph });
        if (!res.ok) {
          setFailedText(text);
          return;
        }
        setMessages((prev) => [...prev, res.user, res.reply]);
        setPendingText(null);
        if (res.ops.length > 0) {
          setPhase("applying");
          const { skipped } = await onApplyOps(res.reply.id, res.ops);
          setUndoableId(res.reply.id);
          if (skipped > 0) {
            setNotes((prev) => new Map(prev).set(res.reply.id, copy.skipped(skipped)));
          }
        }
      } catch {
        setFailedText(text);
      } finally {
        setPhase(null);
      }
    },
    [busy, canvasId, copy, getGraph, language, onApplyOps],
  );

  const undo = useCallback(
    async (messageId: string) => {
      await onUndo(messageId);
      setUndoableId(null);
      setUndoneIds((prev) => new Set(prev).add(messageId));
    },
    [onUndo],
  );

  const clear = useCallback(async () => {
    setClearing(true);
    setClearError("");
    try {
      const res = await clearCanvasAgentMessagesAction(canvasId);
      if (!res.ok) {
        setClearError(copy.clearError);
        return;
      }
      setMessages([]);
      setUndoableId(null);
      setFailedText(null);
      setPendingText(null);
      setNotes(new Map());
      setConfirmClear(false);
    } catch {
      setClearError(copy.clearError);
    } finally {
      setClearing(false);
    }
  }, [canvasId, copy.clearError]);

  const placedRight = side === "right";

  return (
    <div
      className={
        placedRight
          ? "relative flex h-full min-h-0 shrink-0 flex-col border-l border-white/10 bg-[#0e121a]"
          : "relative flex shrink-0 flex-col border-t border-white/10 bg-[#0e121a]"
      }
      style={
        placedRight
          ? { width: collapsed ? COLLAPSED_SIZE : width }
          : { height: collapsed ? COLLAPSED_SIZE : height }
      }
    >
      {!collapsed ? (
        <div
          role="separator"
          aria-orientation={placedRight ? "vertical" : "horizontal"}
          onPointerDown={startResize}
          className={
            placedRight
              ? "absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize hover:bg-[#c6f24b]/30"
              : "absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize hover:bg-[#c6f24b]/30"
          }
        />
      ) : null}

      <CanvasAgentHeader
        copy={copy}
        language={language}
        side={side}
        collapsed={collapsed}
        busy={busy || clearing}
        hasMessages={messages.length > 0}
        onLanguageChange={changeLanguage}
        onToggleSide={toggleSide}
        onClear={() => {
          setClearError("");
          setConfirmClear(true);
        }}
        onToggleCollapsed={toggleCollapsed}
      />

      {confirmClear ? (
        <CanvasAgentClearDialog
          copy={copy}
          clearing={clearing}
          error={clearError}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => void clear()}
        />
      ) : null}

      {!collapsed ? (
        <>
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && !pendingText ? (
              <CanvasAgentEmpty copy={copy} disabled={busy} onPick={(text) => void send(text)} />
            ) : null}

            {messages.map((message, index) => (
              <CanvasAgentMessage
                key={message.id}
                copy={copy}
                isZh={isZh}
                role={message.role}
                text={message.text}
                ops={message.ops}
                question={message.question}
                questionAnswered={index < messages.length - 1 || pendingText !== null}
                questionDisabled={busy}
                onAnswer={(answer) => void send(answer)}
                note={notes.get(message.id)}
                canUndo={message.id === undoableId && !busy}
                undone={undoneIds.has(message.id)}
                onUndo={() => void undo(message.id)}
              />
            ))}

            {pendingText ? (
              <>
                <CanvasAgentMessage copy={copy} isZh={isZh} role="user" text={pendingText} />
                {failedText ? (
                  <CanvasAgentMessage
                    copy={copy}
                    isZh={isZh}
                    role="assistant"
                    variant="error"
                    text={copy.error}
                    onRetry={() => void send(failedText)}
                  />
                ) : null}
              </>
            ) : null}

            {phase ? (
              <CanvasAgentMessage
                copy={copy}
                isZh={isZh}
                role="assistant"
                variant="pending"
                text={phase === "thinking" ? copy.thinking : copy.applying}
              />
            ) : null}
          </div>

          <CanvasAgentComposer copy={copy} busy={busy} onSend={(text) => void send(text)} />
        </>
      ) : null}
    </div>
  );
}
