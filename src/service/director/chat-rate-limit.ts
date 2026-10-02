import type { DirectorChatMessage } from "@/model/skill";

export const CHAT_RATE_LIMIT = 20;
export const CHAT_RATE_WINDOW_MS = 60 * 60 * 1000;

// True when the persisted chat already has the max user messages inside the window.
export function chatRateLimited(chat: DirectorChatMessage[] | undefined, now: Date): boolean {
  const since = now.getTime() - CHAT_RATE_WINDOW_MS;
  const recent = (chat || []).filter(
    (item) => item.role === "user" && new Date(item.createdAt).getTime() > since,
  ).length;
  return recent >= CHAT_RATE_LIMIT;
}
