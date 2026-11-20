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
    assert.equal(res.reply, "Summary.");
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
});
