"use server";

// Canvas preview proxies: asks for 540p copies of long videos and returns the ones already made.

import { requireAppUser } from "@/service/auth";
import { type CanvasProxyState, requestCanvasProxies } from "@/service/canvas/use-cases/media-proxy";

export async function requestCanvasProxiesAction(canvasId: string): Promise<CanvasProxyState> {
  const user = await requireAppUser();
  return requestCanvasProxies(user.clerkUserId, canvasId);
}
