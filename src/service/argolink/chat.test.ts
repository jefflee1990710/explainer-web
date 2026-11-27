import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARGOLINK_CHAT_COMPLETIONS_URL,
  argolinkChatCompletion,
  parseArgolinkChat,
} from "@/service/argolink/chat";

const KEY = "test-argolink-key";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("ArgoLink chat completions", () => {
  it("posts the chat model to /v1/chat/completions and reads tokens", async () => {
    const calls: Array<{ url: string; authorization: string; body: unknown }> = [];
    const result = await argolinkChatCompletion(
      { model: "claude-sonnet-5-5", prompt: "Compare locks" },
      {
        apiKey: KEY,
        fetch: async (url, init) => {
          calls.push({
            url: String(url),
            authorization: new Headers(init?.headers).get("authorization") ?? "",
            body: JSON.parse(String(init?.body)),
          });
          return jsonResponse(200, {
            choices: [{ message: { content: "  Optimistic wins. " } }],
            usage: { prompt_tokens: 1200, completion_tokens: 80 },
          });
        },
      },
    );
    assert.equal(calls[0]?.url, ARGOLINK_CHAT_COMPLETIONS_URL);
    assert.equal(calls[0]?.url, "https://argolink.io/v1/chat/completions");
    assert.equal(calls[0]?.authorization, `Bearer ${KEY}`);
    assert.deepEqual(calls[0]?.body, {
      model: "claude-sonnet-5-5",
      messages: [{ role: "user", content: "Compare locks" }],
    });
    assert.equal(result.text, "Optimistic wins.");
    assert.deepEqual(result.usage, { inputTokens: 1200, outputTokens: 80 });
  });

  it("joins text parts and refuses a reply that omits usage or leaks the key", async () => {
    const parts = parseArgolinkChat(
      JSON.stringify({
        choices: [{ message: { content: [{ text: "One" }, { text: " two" }] } }],
        usage: { prompt_tokens: 3, completion_tokens: 4 },
      }),
    );
    assert.equal(parts.text, "One two");
    await assert.rejects(
      argolinkChatCompletion(
        { model: "gpt-5.6-sol", prompt: "hi" },
        {
          apiKey: KEY,
          fetch: async () => jsonResponse(200, { choices: [{ message: { content: "ok" } }] }),
        },
      ),
      /token 用量/,
    );
    await assert.rejects(
      argolinkChatCompletion(
        { model: "gpt-5.6-sol", prompt: "hi" },
        {
          apiKey: KEY,
          fetch: async () =>
            jsonResponse(401, { error: { message: `bad key ${KEY}` } }),
        },
      ),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : "";
        assert.match(message, /401/);
        assert.equal(message.includes(KEY), false);
        return true;
      },
    );
    await assert.rejects(
      argolinkChatCompletion({ model: "gpt-5.6-sol", prompt: "hi" }, { apiKey: "  " }),
      /ARGOLINK_API_KEY/,
    );
  });
});
