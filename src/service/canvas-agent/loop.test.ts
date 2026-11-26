import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ToolSet } from "ai";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/model-catalog";
import {
  CANVAS_AGENT_HISTORY_LIMIT,
  type CanvasAgentGenerate,
  runCanvasAgentTurn,
} from "@/service/canvas-agent/loop";

type Call = Parameters<CanvasAgentGenerate>[0];

// Calls a tool's execute directly, the same way the AI SDK loop would.
async function call(tools: ToolSet | undefined, name: string, input: unknown) {
  const t = tools?.[name];
  assert.ok(t?.execute, `tool ${name} missing`);
  return (await t.execute(input as never, { toolCallId: name, messages: [] } as never)) as {
    nodeId?: string;
  };
}

const base = {
  language: "en" as const,
  nodes: [],
  edges: [],
  catalog: STATIC_CANVAS_MODELS,
  assets: [],
};

describe("runCanvasAgentTurn", () => {
  it("returns the reply, ops, and final graph", async () => {
    const generate: CanvasAgentGenerate = async ({ tools }) => {
      const p = await call(tools, "add_prompt_node", { text: "a fox" });
      const m = await call(tools, "add_model_node", {
        modelId: "openrouter:bytedance-seed/seedream-5-0-pro",
      });
      await call(tools, "connect", { sourceId: p.nodeId, targetId: m.nodeId, targetPort: "prompt" });
      return { text: "Built a fox image. Press Run.", endedOnToolCalls: false };
    };
    const res = await runCanvasAgentTurn({ ...base, message: "fox image", history: [], generate });
    assert.equal(res.reply, "Built a fox image. Press Run.");
    assert.deepEqual(res.ops.map((o) => o.kind), ["add_node", "add_node", "add_edge"]);
    assert.equal(res.nodes.length, 2);
    assert.equal(res.edges.length, 1);
  });

  it("sends the latest history plus the new message last", async () => {
    const calls: Call[] = [];
    const history = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      text: `m${i}`,
    }));
    await runCanvasAgentTurn({
      ...base,
      message: "now",
      history,
      generate: async (c) => {
        calls.push(c);
        return { text: "ok", endedOnToolCalls: false };
      },
    });
    const msgs = calls[0]!.messages;
    assert.equal(msgs.length, CANVAS_AGENT_HISTORY_LIMIT + 1);
    assert.equal(msgs.at(-1)?.content, "now");
    assert.equal(msgs[0]?.content, "m10");
  });

  it("shows an attached image to the model and lists it as an asset", async () => {
    const url = "https://abc.public.blob.vercel-storage.com/canvas/uploads/user_1/a.png";
    const res = await runCanvasAgentTurn({
      ...base,
      message: "use this",
      imageUrls: [url],
      history: [],
      assets: [
        {
          id: "old",
          source: "product",
          name: "Bottle",
          mediaKind: "image",
          url: "https://blob.vercel-storage.com/canvas/uploads/user_1/old.png",
          createdAt: "2020-01-01T00:00:00.000Z",
        },
      ],
      generate: async ({ messages, tools }) => {
        const listed = (await call(tools, "list_assets", {})) as unknown as {
          assets?: { id: string }[];
        };
        assert.equal(listed.assets?.[0]?.id, "chat-image-1");
        assert.equal(listed.assets?.[1]?.id, "old");
        const content = messages.at(-1)?.content;
        assert.ok(Array.isArray(content));
        assert.equal(content[1]?.type, "image");
        await call(tools, "add_media_node", { assetId: "chat-image-1" });
        return { text: "Placed the photo.", endedOnToolCalls: false };
      },
    });
    assert.equal(res.reply, "Placed the photo.");
    assert.equal(res.nodes.find((node) => node.type === "media")?.data.mediaUrl, url);
  });

  it("makes one grace call without tools when the loop ends on tool calls", async () => {
    const calls: Call[] = [];
    const res = await runCanvasAgentTurn({
      ...base,
      message: "build",
      history: [],
      generate: async (c) => {
        calls.push(c);
        return calls.length === 1
          ? { text: "", endedOnToolCalls: true }
          : { text: "Summary.", endedOnToolCalls: false };
      },
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[1]!.tools, undefined);
    assert.match(calls[1]!.system, /no more tool calls/);
    assert.doesNotMatch(calls[1]!.system, /Models you may use/);
    assert.equal(res.reply, "Summary.");
  });

  it("stops on ask_user and returns the question without a summary call", async () => {
    let count = 0;
    const res = await runCanvasAgentTurn({
      ...base,
      message: "make product shots",
      history: [],
      generate: async ({ tools }) => {
        count += 1;
        await call(tools, "ask_user", {
          question: "Which product?",
          options: ["Bottle", "Mug"],
          allowMultiple: true,
        });
        return { text: "", endedOnToolCalls: true };
      },
    });
    assert.equal(count, 1);
    assert.equal(res.reply, "Which product?");
    assert.deepEqual(res.question?.options.map((o) => o.label), ["Bottle", "Mug"]);
    assert.equal(res.question?.allowMultiple, true);
    assert.equal(res.question?.allowOther, true);
  });

  it("runs a repair pass for unwired new nodes, then summarizes the fixed graph", async () => {
    const calls: Call[] = [];
    const nodes = ["a", "b"].map((name) => ({
      id: `media-${name}`,
      type: "media" as const,
      position: { x: 0, y: 0 },
      data: { label: name, mediaKind: "image" as const, mediaUrl: `https://x/${name}.png` },
    }));
    let editId: string | undefined;
    const res = await runCanvasAgentTurn({
      ...base,
      nodes,
      message: "edit b",
      history: [],
      generate: async (c) => {
        calls.push(c);
        if (calls.length === 1) {
          editId = (await call(c.tools, "add_model_node", { modelId: "openrouter:krea/k3-edit", promptText: "red" })).nodeId;
          return { text: "Done.", endedOnToolCalls: false };
        }
        if (calls.length === 2) {
          await call(c.tools, "connect", { sourceId: "media-b", targetId: editId, targetPort: "refImages" });
          return { text: "Fixed.", endedOnToolCalls: false };
        }
        return { text: "Ready to run.", endedOnToolCalls: false };
      },
    });
    assert.equal(calls.length, 3);
    assert.match(calls[1]!.system, /Gaps to fix/);
    assert.match(calls[1]!.system, /media-a .*media-b/);
    assert.equal(calls[2]!.tools, undefined);
    assert.doesNotMatch(calls[2]!.system, /Still missing/);
    assert.equal(res.reply, "Ready to run.");
    assert.ok(res.edges.some((e) => e.source === "media-b" && e.target === editId));
  });

  it("names inputs that are still missing when nothing can feed them", async () => {
    const calls: Call[] = [];
    await runCanvasAgentTurn({
      ...base,
      message: "edit my photo",
      history: [],
      generate: async (c) => {
        calls.push(c);
        if (calls.length === 1) {
          await call(c.tools, "add_model_node", { modelId: "openrouter:krea/k3-edit", promptText: "red" });
        }
        return { text: "ok", endedOnToolCalls: false };
      },
    });
    assert.equal(calls.length, 3);
    assert.match(calls[2]!.system, /Still missing/);
    assert.match(calls[2]!.system, /No node on the canvas can feed it/);
  });

  it("skips the grace call when the first call answered", async () => {
    let count = 0;
    await runCanvasAgentTurn({
      ...base,
      message: "hi",
      history: [],
      generate: async () => {
        count += 1;
        return { text: "Hello", endedOnToolCalls: false };
      },
    });
    assert.equal(count, 1);
  });

  it("warns in the summary prompt when step limit hit after deleting nodes without adding replacements", async () => {
    const calls: Call[] = [];
    await runCanvasAgentTurn({
      ...base,
      nodes: [
        { id: "exp-1-frame-1", type: "model", position: { x: 0, y: 0 }, data: { modelId: "google:gemini-nano-banana-2.1" } },
      ],
      message: "update the explainer script",
      history: [],
      generate: async (c) => {
        calls.push(c);
        if (calls.length === 1) {
          await call(c.tools, "delete_node", { nodeId: "exp-1-frame-1" });
          return { text: "", endedOnToolCalls: true };
        }
        return { text: "Removed old nodes; reply continue to add the new explainer.", endedOnToolCalls: false };
      },
    });
    assert.equal(calls.length, 2);
    assert.match(calls[1]!.system, /Step limit reached/);
    assert.doesNotMatch(calls[1]!.system, /The new nodes are wired and ready/);
  });
});
