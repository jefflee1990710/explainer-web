import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob } from "@/model/canvas";
import type { CanvasNodeData } from "@/model/canvas";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import {
  CANVAS_TEXT_ARGON_ID,
  CANVAS_TEXT_ARGON_USD,
  CANVAS_TEXT_FLASH_ID,
  CANVAS_TEXT_FLASH_USD,
} from "@/service/canvas/catalog/text-models";
import { estimateCanvasModelCostUsd } from "@/service/canvas/catalog/pricing";
import { generateCanvasText } from "@/service/canvas/execution/canvas-text";
import { googleProvider } from "@/service/canvas/execution/providers/google";
import type { CanvasDispatchContext } from "@/service/canvas/execution/providers/types";
import type { CanvasExecutorDeps } from "@/service/canvas/execution/jobs/deps";
import { resolveNodeInputs, validateEdgeConnection } from "@/service/canvas/core/graph";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { directorNodeWithWiredPrompt, directorPromptPatch } from "@/service/canvas/directors/explainer-director";

describe("canvas text models", () => {
  it("lists two Google chat models with a text output and a flat price", () => {
    const flash = findCanvasModel(CANVAS_TEXT_FLASH_ID);
    const argon = findCanvasModel(CANVAS_TEXT_ARGON_ID);
    assert.ok(flash && argon);
    assert.equal(flash.category, "text");
    assert.equal(argon.category, "text");
    assert.equal(flash.output.type, "text");
    assert.equal(flash.provider, "google");
    assert.equal(flash.providerModelId, "gemini-3.8-flash");
    assert.equal(argon.providerModelId, "gemini-4-argon");
    assert.equal(flash.inputs[0]?.id, "prompt");
    assert.equal(estimateCanvasModelCostUsd(flash), CANVAS_TEXT_FLASH_USD);
    assert.equal(estimateCanvasModelCostUsd(argon), CANVAS_TEXT_ARGON_USD);
    assert.equal(flash.hiddenInSidebar, undefined);
  });

  it("returns mocked chat text and rejects an empty prompt or an empty reply", async () => {
    const calls: string[] = [];
    const out = await generateCanvasText(
      { model: "gemini-3.8-flash", prompt: "  Explain hooks  " },
      {
        modelFor: (modelId) => {
          calls.push(modelId);
          return {} as never;
        },
        generateText: async ({ prompt }) => ({ text: ` ${prompt} ok ` }),
      },
    );
    assert.deepEqual(calls, ["gemini-3.8-flash"]);
    assert.equal(out.text, "Explain hooks ok");
    await assert.rejects(generateCanvasText({ model: "gemini-3.8-flash", prompt: "  " }), /提示詞/);
    await assert.rejects(
      generateCanvasText(
        { model: "gemini-4-argon", prompt: "hi" },
        { modelFor: () => ({}) as never, generateText: async () => ({ text: "   " }) },
      ),
      /沒有回傳/,
    );
  });

  it("dispatches a text node through the mocked Google chat client and stores the text", async () => {
    const spec = findCanvasModel(CANVAS_TEXT_FLASH_ID)!;
    const patches: Partial<CanvasNodeData>[] = [];
    let sent = "";
    const jobId = new ObjectId();
    const canvasId = new ObjectId();
    const initialJob = {
      _id: jobId,
      clerkUserId: "user_1",
      canvasId,
      nodeId: "text-1",
      provider: "google",
      modelId: spec.id,
      providerModelId: spec.providerModelId,
      status: "queued",
      inputSnapshot: {},
      chargedUsd: CANVAS_TEXT_FLASH_USD,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CanvasJob;
    const resolved = {
      hasGoogleStudioKey: () => true,
      generateCanvasText: async (input: { model: string; prompt: string }) => {
        sent = `${input.model}:${input.prompt}`;
        return { text: "A short explainer topic" };
      },
      persistText: async (_text: string, pathname: string) => `https://blob.example/${pathname}`,
      updateCanvasJob: async () => undefined,
      updateCanvasNodeState: async (params: { patch: Partial<CanvasNodeData> }) => {
        patches.push(params.patch);
      },
      getUserCreditUsd: async () => 4,
      now: () => new Date("2026-11-27T00:00:00.000Z"),
    } as unknown as CanvasExecutorDeps;
    const ctx = {
      initialJob,
      spec,
      node: {
        id: "text-1",
        type: "model",
        position: { x: 0, y: 0 },
        data: { modelId: spec.id, prompt: "Write a topic" },
      },
      inputs: { prompt: "Write a topic", refImages: [], videos: [] },
      presetId: "chat",
      clerkUserId: "user_1",
      canvasIdHex: canvasId.toHexString(),
      jobIdHex: jobId.toHexString(),
      resolved,
    } as CanvasDispatchContext;
    const result = await googleProvider.dispatch(ctx);
    assert.equal(result.ok, true);
    assert.equal(sent, "gemini-3.8-flash:Write a topic");
    if (result.ok) {
      assert.equal(result.job.outputKind, "text");
      assert.match(result.job.outputUrl ?? "", /\.txt$/);
    }
    assert.equal(patches[0]?.text, "A short explainer topic");
    assert.equal(patches[0]?.outputKind, "text");
    await assert.rejects(
      googleProvider.dispatch({ ...ctx, inputs: { prompt: "  ", refImages: [], videos: [] } }),
      /提示詞/,
    );
  });
});

function modelNode(id: string, modelId: string, data: CanvasNode["data"] = {}): CanvasNode {
  return { id, type: "model", position: { x: 0, y: 0 }, data: { modelId, ...data } };
}

function edge(source: string, target: string, targetHandle: string, sourceHandle = "output"): CanvasEdge {
  return { id: `${source}-${target}`, source, sourceHandle, target, targetHandle };
}

describe("canvas text output wires", () => {
  it("connects a text model to a prompt port, a director topic, and another text input", () => {
    const text = modelNode("writer", CANVAS_TEXT_FLASH_ID, {
      status: "completed",
      outputKind: "text",
      outputUrl: "https://blob.example/out.txt",
      text: "How compound interest works",
    });
    const image = modelNode("still", "google:gemini-nano-banana-2.1");
    const director = modelNode("dir", "scro:explainer", {
      prompt: "",
      toolParams: { plannerMode: true },
    });
    const burn = modelNode("burn", "ffmpeg:burn-subtitles");
    const nodes = [text, image, director, burn];
    for (const [target, handle] of [
      ["still", "prompt"],
      ["dir", "prompt"],
      ["burn", "prompt"],
    ] as const) {
      const verdict = validateEdgeConnection(nodes, [], edge("writer", target, handle));
      assert.equal(verdict.valid, true, handle + " " + target);
    }
    const resolved = resolveNodeInputs("still", nodes, [edge("writer", "still", "prompt")]);
    assert.equal(resolved.ok, true);
    assert.equal(resolved.inputs.prompt, "How compound interest works");
    assert.equal(resolved.promptFromNode, true);
  });

  it("uses wired text as the director topic until the card is edited", () => {
    const director = modelNode("dir", "scro:explainer", { prompt: "typed", toolParams: { plannerMode: true } });
    const followed = directorNodeWithWiredPrompt(director, "from the text node");
    assert.equal(followed.data.prompt, "from the text node");
    const edited = directorNodeWithWiredPrompt(
      { ...director, data: { ...director.data, toolParams: { plannerMode: true, promptEdited: true } } },
      "from the text node",
    );
    assert.equal(edited.data.prompt, "typed");
    const patch = directorPromptPatch(director.data, { prompt: "mine" }, true);
    assert.equal(patch.prompt, "mine");
    assert.equal(patch.toolParams?.promptEdited, true);
  });
});
