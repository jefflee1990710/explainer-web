// Per-canvas chat history for the Scro canvas agent (`canvas_agent_messages`).

import { ObjectId } from "mongodb";
import { canvasAgentMessagesCollection } from "@/dao";
import type { CanvasAgentMessage } from "@/model/canvas";
import type { CanvasAgentMessageDto } from "@/model/canvas-agent";

export const CANVAS_AGENT_LIST_LIMIT = 100;

export function serializeCanvasAgentMessage(message: CanvasAgentMessage): CanvasAgentMessageDto {
  return {
    id: message._id.toHexString(),
    role: message.role,
    text: message.text,
    language: message.language,
    ...(message.ops && message.ops.length > 0 ? { ops: message.ops } : {}),
    ...(message.question ? { question: message.question } : {}),
    ...(message.imageUrls && message.imageUrls.length > 0 ? { imageUrls: message.imageUrls } : {}),
    createdAt: message.createdAt.toISOString(),
  };
}

// Returns the newest `limit` messages in chronological order.
export async function listCanvasAgentMessages(
  clerkUserId: string,
  canvasId: string,
  limit = CANVAS_AGENT_LIST_LIMIT,
): Promise<CanvasAgentMessage[]> {
  if (!ObjectId.isValid(canvasId)) return [];
  const collection = await canvasAgentMessagesCollection();
  const newest = await collection
    .find({ canvasId: new ObjectId(canvasId), clerkUserId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return newest.reverse();
}

export async function appendCanvasAgentMessages(docs: CanvasAgentMessage[]): Promise<void> {
  if (docs.length === 0) return;
  const collection = await canvasAgentMessagesCollection();
  await collection.insertMany(docs);
}

export async function clearCanvasAgentMessages(clerkUserId: string, canvasId: string): Promise<void> {
  if (!ObjectId.isValid(canvasId)) return;
  const collection = await canvasAgentMessagesCollection();
  await collection.deleteMany({ canvasId: new ObjectId(canvasId), clerkUserId });
}
