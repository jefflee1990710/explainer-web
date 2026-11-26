"use client";

// Chat dock for the Scro canvas agent. It sits under the canvas or along the right
// edge. Graph edits come back as ops that the workspace replays onto the live canvas.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CanvasEdge, CanvasGroup, CanvasNode, CanvasViewport } from "@/model/canvas";
import {
  clearCanvasAgentMessagesAction,
  sendCanvasAgentMessageAction,
} from "@/presentation/actions/canvas-agent";
import {
  composeCanvasAgentMessage,
  formatCanvasAgentContext,
  type CanvasAgentContextRef,
} from "@/service/canvas-agent/context-block";
import type { CanvasAgentMessageDto } from "@/model/canvas-agent";
import { type CanvasAgentLanguage, type CanvasAgentOp } from "@/model/canvas-agent";
import type { LocaleId } from "@/util/i18n/locales";
import {
  canvasAgentCopy,
  defaultCanvasAgentLanguage,
} from "@/app/app/canvas/agent/canvas-agent-copy";
import { CanvasAgentClearDialog } from "@/app/app/canvas/agent/canvas-agent-clear-dialog";
import { CanvasAgentContextChips } from "@/app/app/canvas/agent/canvas-agent-context-chips";
import { CanvasAgentComposer } from "@/app/app/canvas/agent/canvas-agent-composer";
import { CanvasAgentEmpty } from "@/app/app/canvas/agent/canvas-agent-empty";
import {
  CanvasAgentHeader,
  type CanvasAgentDockSide,
} from "@/app/app/canvas/agent/canvas-agent-header";
import { CanvasAgentMessage } from "@/app/app/canvas/agent/canvas-agent-message";
import {
  readCanvasAgentLanguage,
  subscribeCanvasAgentLanguage,
  writeCanvasAgentLanguage,
} from "@/app/app/canvas/agent/canvas-agent-prefs";

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
  groups: CanvasGroup[];
  viewport: CanvasViewport;
};

type Phase = "thinking" | "applying";

export function CanvasAgentDock({
  locale,
  canvasId,
  side,
  hidden = false,
  expandToken = 0,
  lockSide = false,
  initialMessages,
  getGraph,
  contextRefs,
  contextNodes,
  contextGroups,
  onRemoveContext,
  onContextConsumed,
  onApplyOps,
  onUndo,
  onSideChange,
}: {
  locale: LocaleId;
  canvasId: string;
  side: CanvasAgentDockSide;
  // Editor layout keeps the dock mounted but out of the layout.
  hidden?: boolean;
  // Increments when the user picks Agent so a previously collapsed chat opens.
  expandToken?: number;
  // Agent layout stays on the right edge.
  lockSide?: boolean;
  initialMessages: CanvasAgentMessageDto[];
  getGraph: () => CanvasAgentGraphSnapshot;
  contextRefs: readonly CanvasAgentContextRef[];
  contextNodes: readonly CanvasNode[];
  contextGroups: readonly CanvasGroup[];
  onRemoveContext: (ref: CanvasAgentContextRef) => void;
  onContextConsumed: () => void;
  onApplyOps: (messageId: string, ops: CanvasAgentOp[]) => Promise<{ skipped: number }>;
  onUndo: (messageId: string) => Promise<void>;
  onSideChange: (side: CanvasAgentDockSide) => void;
}) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const copy = canvasAgentCopy(isZh);

  const [messages, setMessages] = useState<CanvasAgentMessageDto[]>(initialMessages);
  const fallbackLanguage = defaultCanvasAgentLanguage(locale);
  // localStorage is the source of truth, so a reload or another canvas keeps the choice.
  const language = useSyncExternalStore(
    subscribeCanvasAgentLanguage,
    () => readCanvasAgentLanguage(fallbackLanguage),
    () => fallbackLanguage,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [pending, setPending] = useState<{ text: string; imageUrls: string[] } | null>(null);
  const [failed, setFailed] = useState<{ text: string; imageUrls: string[] } | null>(null);
  const [undoableId, setUndoableId] = useState<string | null>(null);
  const [undoneIds, setUndoneIds] = useState<ReadonlySet<string>>(new Set());
  const [notes, setNotes] = useState<ReadonlyMap<string, string>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenContextCount = useRef(contextRefs.length);
  const busy = phase !== null;

  // A new right-click chip opens the dock so the user can see what they attached.
  useEffect(() => {
    if (contextRefs.length > seenContextCount.current) {
      setCollapsed(false);
      window.localStorage.setItem(COLLAPSED_KEY, "0");
    }
    seenContextCount.current = contextRefs.length;
  }, [contextRefs.length]);

  // Saved dock preferences are read after mount so server and client HTML match.
  useEffect(() => {
    const savedHeight = Number(window.localStorage.getItem(HEIGHT_KEY));
    const savedWidth = Number(window.localStorage.getItem(WIDTH_KEY));
    const savedCollapsed = window.localStorage.getItem(COLLAPSED_KEY) === "1";
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage */
    if (Number.isFinite(savedHeight) && savedHeight >= MIN_HEIGHT) {
      setHeight(Math.min(MAX_HEIGHT, savedHeight));
    }
    if (Number.isFinite(savedWidth) && savedWidth >= MIN_WIDTH) {
      setWidth(Math.min(MAX_WIDTH, savedWidth));
    }
    setCollapsed(savedCollapsed);
    /* eslint-enable react-hooks/set-state-in-effect */
    const frame = window.requestAnimationFrame(() => setMotionReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [lockSide]);

  useEffect(() => {
    if (expandToken === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- parent asked the chat to open
    setCollapsed(false);
    window.localStorage.setItem(COLLAPSED_KEY, "0");
  }, [expandToken]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, failed, phase]);

  const changeLanguage = useCallback((next: CanvasAgentLanguage) => {
    writeCanvasAgentLanguage(next);
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
      setResizing(true);
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
        setResizing(false);
        window.localStorage.setItem(horizontal ? WIDTH_KEY : HEIGHT_KEY, String(Math.round(latest)));
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [height, side, width],
  );

  const send = useCallback(
    async (text: string, imageUrls: string[] = []) => {
      if (busy) return;
      const message = composeCanvasAgentMessage(
        text,
        formatCanvasAgentContext(contextRefs, contextNodes, contextGroups),
      );
      if (!message.trim() && imageUrls.length === 0) return;
      onContextConsumed();
      const draft = { text: message, imageUrls };
      setFailed(null);
      setPending(draft);
      setPhase("thinking");
      try {
        const graph = getGraph();
        const res = await sendCanvasAgentMessageAction({
          canvasId,
          text: message,
          language,
          ...graph,
          ...(imageUrls.length > 0 ? { imageUrls } : {}),
        });
        if (!res.ok) {
          setFailed(draft);
          return;
        }
        setMessages((prev) => [...prev, res.user, res.reply]);
        setPending(null);
        if (res.ops.length > 0) {
          setPhase("applying");
          const { skipped } = await onApplyOps(res.reply.id, res.ops);
          setUndoableId(res.reply.id);
          if (skipped > 0) {
            setNotes((prev) => new Map(prev).set(res.reply.id, copy.skipped(skipped)));
          }
        }
      } catch {
        setFailed(draft);
      } finally {
        setPhase(null);
      }
    },
    [
      busy,
      canvasId,
      contextGroups,
      contextNodes,
      contextRefs,
      copy,
      getGraph,
      language,
      onApplyOps,
      onContextConsumed,
    ],
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
      setFailed(null);
      setPending(null);
      setNotes(new Map());
      setConfirmClear(false);
    } catch {
      setClearError(copy.clearError);
    } finally {
      setClearing(false);
    }
  }, [canvasId, copy.clearError]);

  const placedRight = side === "right";
  const slide = motionReady && !resizing;
  const headerProps = {
    copy,
    language,
    side,
    busy: busy || clearing,
    hasMessages: messages.length > 0,
    onLanguageChange: changeLanguage,
    lockSide,
    onToggleSide: toggleSide,
    onClear: () => {
      setClearError("");
      setConfirmClear(true);
    },
    onToggleCollapsed: toggleCollapsed,
  };

  return (
    <div
      className={
        hidden
          ? "hidden"
          : placedRight
            ? `relative h-full min-h-0 shrink-0 overflow-hidden border-l border-white/10 bg-[#0e121a] ${slide ? "transition-[width] duration-300 ease-out motion-reduce:transition-none" : ""}`
            : `relative flex shrink-0 flex-col overflow-hidden border-t border-white/10 bg-[#0e121a] ${slide ? "transition-[height] duration-300 ease-out motion-reduce:transition-none" : ""}`
      }
      style={
        placedRight
          ? { width: collapsed ? COLLAPSED_SIZE : width }
          : { height: collapsed ? COLLAPSED_SIZE : height }
      }
    >
      {placedRight ? (
        <div
          className={`absolute inset-y-0 right-0 z-20 flex w-10 flex-col bg-[#0e121a] ${slide ? "transition-opacity duration-200 ease-out motion-reduce:transition-none" : ""} ${collapsed ? "opacity-100 delay-100" : "pointer-events-none opacity-0 delay-0"}`}
          aria-hidden={!collapsed}
          inert={collapsed ? undefined : true}
        >
          <CanvasAgentHeader {...headerProps} collapsed />
        </div>
      ) : null}

      <div
        className={
          placedRight
            ? `absolute inset-y-0 right-0 z-10 flex min-h-0 flex-col bg-[#0e121a] ${collapsed ? "pointer-events-none" : ""}`
            : "flex min-h-0 min-w-0 flex-1 flex-col"
        }
        style={placedRight ? { width } : undefined}
        inert={placedRight && collapsed ? true : undefined}
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

      <CanvasAgentHeader {...headerProps} collapsed={placedRight ? false : collapsed} />

      {confirmClear ? (
        <CanvasAgentClearDialog
          copy={copy}
          clearing={clearing}
          error={clearError}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => void clear()}
        />
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 && !pending ? (
              <CanvasAgentEmpty copy={copy} disabled={busy} onPick={(text) => void send(text)} />
            ) : null}

            {messages.map((message, index) => (
              <CanvasAgentMessage
                key={message.id}
                copy={copy}
                isZh={isZh}
                role={message.role}
                text={message.text}
                imageUrls={message.imageUrls}
                ops={message.ops}
                question={message.question}
                questionAnswered={index < messages.length - 1 || pending !== null}
                questionDisabled={busy}
                onAnswer={(answer) => void send(answer)}
                note={notes.get(message.id)}
                canUndo={message.id === undoableId && !busy}
                undone={undoneIds.has(message.id)}
                onUndo={() => void undo(message.id)}
              />
            ))}

            {pending ? (
              <>
                <CanvasAgentMessage
                  copy={copy}
                  isZh={isZh}
                  role="user"
                  text={pending.text}
                  imageUrls={pending.imageUrls}
                />
                {failed ? (
                  <CanvasAgentMessage
                    copy={copy}
                    isZh={isZh}
                    role="assistant"
                    variant="error"
                    text={copy.error}
                    onRetry={() => void send(failed.text, failed.imageUrls)}
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

          <CanvasAgentContextChips
            refs={contextRefs}
            nodes={contextNodes}
            groups={contextGroups}
            isZh={isZh}
            onRemove={onRemoveContext}
          />
          <CanvasAgentComposer copy={copy} busy={busy} onSend={(text, imageUrls) => void send(text, imageUrls)} />
      </div>
    </div>
  );
}
