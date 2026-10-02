import { test } from "node:test";
import assert from "node:assert/strict";
import type { DirectorChatMessage } from "@/model/skill";
import {
  CHAT_RATE_LIMIT,
  CHAT_RATE_WINDOW_MS,
  chatRateLimited,
} from "@/service/director/chat-rate-limit";

const now = new Date("2026-10-02T12:00:00Z");

// N messages of one role, each `agoMs` before now.
function messages(count: number, role: DirectorChatMessage["role"], agoMs: number): DirectorChatMessage[] {
  return Array.from({ length: count }, () => ({
    role,
    content: "x",
    createdAt: new Date(now.getTime() - agoMs),
  }));
}

test("limit is 20 user messages per hour", () => {
  assert.equal(CHAT_RATE_LIMIT, 20);
  assert.equal(CHAT_RATE_WINDOW_MS, 60 * 60 * 1000);
});

test("under the limit is allowed", () => {
  assert.equal(chatRateLimited(messages(CHAT_RATE_LIMIT - 1, "user", 60_000), now), false);
  assert.equal(chatRateLimited(undefined, now), false);
});

test("at the limit is blocked", () => {
  assert.equal(chatRateLimited(messages(CHAT_RATE_LIMIT, "user", 60_000), now), true);
});

test("user messages outside the window are ignored", () => {
  const chat = [
    ...messages(10, "user", CHAT_RATE_WINDOW_MS + 1),
    ...messages(CHAT_RATE_LIMIT - 1, "user", 60_000),
  ];
  assert.equal(chatRateLimited(chat, now), false);
});

test("assistant messages are ignored", () => {
  const chat = [...messages(CHAT_RATE_LIMIT, "assistant", 60_000), ...messages(CHAT_RATE_LIMIT - 1, "user", 60_000)];
  assert.equal(chatRateLimited(chat, now), false);
});
