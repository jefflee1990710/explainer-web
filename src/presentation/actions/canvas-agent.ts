"use server";

// Server Actions for the Scro canvas agent chat dock below /app/canvas.
// Chat is free: the agent only edits the graph and never runs generation.

import { ObjectId } from "mongodb";
import type { CanvasAgentMessage, CanvasEdge, CanvasNode, CanvasViewport } from "@/model/canvas";
import { requireAppUser } from "@/service/auth";
import { getCanvasModelCatalog } from "@/service/canvas/model-catalog";
import { listCanvasLibraryAssets, saveCanvasProject } from "@/service/canvas/projects";
import {
  type CanvasAgentMessageDto,
  appendCanvasAgentMessages,
  clearCanvasAgentMessages,
  listCanvasAgentMessages,
  serializeCanvasAgentMessage,
} from "@/service/canvas-agent/history";
import { CANVAS_AGENT_HISTORY_LIMIT, runCanvasAgentTurn } from "@/service/canvas-agent/loop";
import {
  type CanvasAgentLanguage,
  type CanvasAgentOp,
  isCanvasAgentLanguage,
} from "@/service/canvas-agent/types";

const MAX_MESSAGE_CHARS = 2000;

export type SendCanvasAgentMessageInput = {
  canvasId: string;
  text: string;
  language: CanvasAgentLanguage;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: CanvasViewport;
};

export type SendCanvasAgentMessageResult =
  | { ok: true; user: CanvasAgentMessageDto; reply: CanvasAgentMessageDto; ops: CanvasAgentOp[] }
  | { ok: false; error: string };

export async function listCanvasAgentMessagesAction(
  canvasId: string,
): Promise<CanvasAgentMessageDto[]> {
  const user = await requireAppUser();
  const messages = await listCanvasAgentMessages(user.clerkUserId, canvasId);
  return messages.map(serializeCanvasAgentMessage);
}

export async function sendCanvasAgentMessageAction(
  input: SendCanvasAgentMessageInput,
): Promise<SendCanvasAgentMessageResult> {
  const user = await requireAppUser();
  const text = input.text.trim();
  if (!text) return { ok: false, error: "Message is empty" };
  if (text.length > MAX_MESSAGE_CHARS) {
    return { ok: false, error: `Message is longer than ${MAX_MESSAGE_CHARS} characters` };
  }
  if (!isCanvasAgentLanguage(input.language)) return { ok: false, error: "Unsupported language" };
  if (!ObjectId.isValid(input.canvasId)) return { ok: false, error: "Canvas not found" };

  // Save the live graph first so the agent sees exactly what the user sees.
  const project = await saveCanvasProject(user.clerkUserId, input.canvasId, {
    nodes: input.nodes,
    edges: input.edges,
    viewport: input.viewport,
  });
  if (!project) return { ok: false, error: "Canvas not found" };

  const [catalog, library, history] = await Promise.all([
    getCanvasModelCatalog(),
    listCanvasLibraryAssets(user.clerkUserId),
    listCanvasAgentMessages(user.clerkUserId, input.canvasId, CANVAS_AGENT_HISTORY_LIMIT),
  ]);

  let turn: Awaited<ReturnType<typeof runCanvasAgentTurn>>;
  try {
    turn = await runCanvasAgentTurn({
      language: input.language,
      message: text,
      history: history.map((m) => ({ role: m.role, text: m.text })),
      nodes: project.nodes,
      edges: project.edges,
      catalog,
      assets: [...library.characters, ...library.products, ...library.recentOutputs],
      characters: library.characterOptions,
    });
  } catch (error) {
    console.error("[canvas-agent] turn failed", error);
    return { ok: false, error: "The assistant could not answer. Please try again." };
  }

  const now = Date.now();
  const canvasObjectId = new ObjectId(input.canvasId);
  const userDoc: CanvasAgentMessage = {
    _id: new ObjectId(),
    canvasId: canvasObjectId,
    clerkUserId: user.clerkUserId,
    role: "user",
    text,
    language: input.language,
    createdAt: new Date(now),
  };
  const replyDoc: CanvasAgentMessage = {
    _id: new ObjectId(),
    canvasId: canvasObjectId,
    clerkUserId: user.clerkUserId,
    role: "assistant",
    text: turn.reply,
    language: input.language,
    ...(turn.ops.length > 0 ? { ops: turn.ops } : {}),
    // +1ms keeps the reply after the question when sorted by createdAt.
    createdAt: new Date(now + 1),
  };

  await Promise.all([
    appendCanvasAgentMessages([userDoc, replyDoc]),
    turn.ops.length > 0
      ? saveCanvasProject(user.clerkUserId, input.canvasId, { nodes: turn.nodes, edges: turn.edges })
      : Promise.resolve(null),
  ]);

  return {
    ok: true,
    user: serializeCanvasAgentMessage(userDoc),
    reply: serializeCanvasAgentMessage(replyDoc),
    ops: turn.ops,
  };
}

export async function clearCanvasAgentMessagesAction(canvasId: string): Promise<{ ok: boolean }> {
  const user = await requireAppUser();
  await clearCanvasAgentMessages(user.clerkUserId, canvasId);
  return { ok: true };
}
