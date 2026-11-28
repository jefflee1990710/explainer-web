import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import type { CanvasJob } from "@/model/canvas";
import type { CanvasNodeData } from "@/model/canvas";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { swapCandidates } from "@/service/canvas/core/model-swap";
import {
  CANVAS_TEXT_ARGON_ID,
  CANVAS_TEXT_CLAUDE_ID,
  CANVAS_TEXT_FLASH_ID,
  CANVAS_TEXT_GPT_ID,
  TEXT_STATIC_MODELS,
} from "@/service/canvas/catalog/text-models";
import { canvasTextUserRates, textTokenCostUsd } from "@/service/canvas/catalog/text-token-price";
import { estimateCanvasModelCostUsd } from "@/service/canvas/catalog/pricing";
import { generateCanvasText } from "@/service/canvas/execution/canvas-text";
import { ARGOLINK_CHAT_COMPLETIONS_URL } from "@/service/argolink/chat";
import { argolinkProvider } from "@/service/canvas/execution/providers/argolink";
import { googleProvider } from "@/service/canvas/execution/providers/google";
import type { CanvasDispatchContext } from "@/service/canvas/execution/providers/types";
import type { CanvasExecutorDeps } from "@/service/canvas/execution/jobs/deps";
import { readConnectedPromptText, resolveNodeInputs, validateEdgeConnection } from "@/service/canvas/core/graph";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  directorNodeWithWiredPrompt,
  directorPromptPatch,
  explainerNodeWithWiredTopic,
} from "@/service/canvas/directors/explainer-director";

const ON_2026_11_27 = new Date("2026-11-27T09:00:00.000Z");

describe("canvas text models", () => {
  it("lists Gemini on Google and Claude plus GPT on ArgoLink, billed by tokens", () => {
    const flash = findCanvasModel(CANVAS_TEXT_FLASH_ID);
    const argon = findCanvasModel(CANVAS_TEXT_ARGON_ID);
    const claude = findCanvasModel(CANVAS_TEXT_CLAUDE_ID);
    const gpt = findCanvasModel(CANVAS_TEXT_GPT_ID);
    assert.ok(flash && argon && claude && gpt);
    assert.equal(TEXT_STATIC_MODELS.length, 28);
    for (const spec of [flash, argon, claude, gpt]) {
      assert.equal(spec.category, "text");
      assert.equal(spec.output.type, "text");
      assert.equal(spec.inputs[0]?.id, "prompt");
      assert.equal(spec.basePriceUsd, 0);
      assert.equal(estimateCanvasModelCostUsd(spec), 0);
      assert.equal(spec.hiddenInSidebar, undefined);
    }
    assert.equal(flash.provider, "google");
    assert.equal(flash.providerModelId, "gemini-3.8-flash");
    assert.equal(argon.providerModelId, "gemini-4-argon");
    assert.equal(claude.provider, "argolink");
    assert.equal(claude.providerModelId, "claude-sonnet-5-5");
    assert.equal(gpt.providerModelId, "gpt-5.6-sol");
    assert.deepEqual(
      swapCandidates(flash, TEXT_STATIC_MODELS).map((spec) => spec.id).sort(),
      TEXT_STATIC_MODELS.map((spec) => spec.id).filter((id) => id !== flash.id).sort(),
    );
    for (const spec of TEXT_STATIC_MODELS) {
      assert.equal(spec.provider === "google" || spec.provider === "argolink", true, spec.id);
      assert.equal(spec.id.endsWith(spec.providerModelId), true);
    }
    const pricedAt = ON_2026_11_27;
    assert.equal(
      estimateCanvasModelCostUsd(flash, { inputTokens: 1_000_000, outputTokens: 0, pricedAt }),
      canvasTextUserRates(flash.id, pricedAt).inputUsdPerMillion,
    );
  });

  it("returns mocked Gemini chat text with usage, and rejects an empty prompt, reply, or usage", async () => {
    const calls: string[] = [];
    const out = await generateCanvasText(
      { model: "gemini-3.8-flash", prompt: "  Explain hooks  " },
      {
        modelFor: (modelId) => {
          calls.push(modelId);
          return {} as never;
        },
        generateText: async ({ prompt }) => ({
          text: ` ${prompt} ok `,
          usage: { inputTokens: 40, outputTokens: 12 },
        }),
      },
    );
    assert.deepEqual(calls, ["gemini-3.8-flash"]);
    assert.equal(out.text, "Explain hooks ok");
    assert.deepEqual(out.usage, { inputTokens: 40, outputTokens: 12 });
    await assert.rejects(generateCanvasText({ model: "gemini-3.8-flash", prompt: "  " }), /提示詞/);
    await assert.rejects(
      generateCanvasText(
        { model: "gemini-4-argon", prompt: "hi" },
        { modelFor: () => ({}) as never, generateText: async () => ({ text: "   ", usage: { inputTokens: 1, outputTokens: 0 } }) },
      ),
      /沒有回傳/,
    );
    await assert.rejects(
      generateCanvasText(
        { model: "gemini-3.8-flash", prompt: "hi" },
        { modelFor: () => ({}) as never, generateText: async () => ({ text: "ok" }) },
      ),
      /token 用量/,
    );
  });

  it("sends new Gemini ids through the chat client and new Claude or GPT ids through mocked ArgoLink", async () => {
    const geminiCalls: string[] = [];
    const carbon = await generateCanvasText(
      { model: "gemini-4-carbon", prompt: "Name the locks" },
      {
        modelFor: (modelId) => {
          geminiCalls.push(modelId);
          return {} as never;
        },
        generateText: async () => ({ text: "Carbon", usage: { inputTokens: 8, outputTokens: 2 } }),
        fetch: async () => {
          throw new Error("Gemini must not call ArgoLink");
        },
      },
    );
    assert.deepEqual(geminiCalls, ["gemini-4-carbon"]);
    assert.equal(carbon.text, "Carbon");

    let posted = "";
    const haiku = await generateCanvasText(
      { model: "claude-haiku-5-5", prompt: "List three cuts" },
      {
        apiKey: "test-argolink-key",
        fetch: async (url, init) => {
          posted = String(url);
          const body = JSON.parse(String(init?.body)) as { model?: string };
          assert.equal(body.model, "claude-haiku-5-5");
          assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-argolink-key");
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: "Cut, hold, release" } }],
              usage: { prompt_tokens: 11, completion_tokens: 4 },
            }),
            { status: 200 },
          );
        },
      },
    );
    assert.equal(posted, ARGOLINK_CHAT_COMPLETIONS_URL);
    assert.equal(haiku.text, "Cut, hold, release");
    assert.deepEqual(haiku.usage, { inputTokens: 11, outputTokens: 4 });

    const terra = await generateCanvasText(
      { model: "gpt-6.1-terra", prompt: "One line" },
      {
        apiKey: "test-argolink-key",
        fetch: async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as { model?: string };
          assert.equal(body.model, "gpt-6.1-terra");
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: "Ready" } }],
              usage: { prompt_tokens: 5, completion_tokens: 1 },
            }),
            { status: 200 },
          );
        },
      },
    );
    assert.equal(terra.text, "Ready");
  });

  it("dispatches a text node through the mocked Google chat client and stores the text", async () => {
    const spec = findCanvasModel(CANVAS_TEXT_FLASH_ID)!;
    const patches: Partial<CanvasNodeData>[] = [];
    let sent = "";
    const charges: number[] = [];
    const jobSets: Array<Partial<CanvasJob>> = [];
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
      chargedUsd: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CanvasJob;
    const resolved = {
      hasGoogleStudioKey: () => true,
      generateCanvasText: async (input: { model: string; prompt: string }) => {
        sent = `${input.model}:${input.prompt}`;
        return { text: "A short explainer topic", usage: { inputTokens: 1_000_000, outputTokens: 0 } };
      },
      consumeCreditUsd: async (_user: string, costUsd: number) => {
        charges.push(costUsd);
        return "spend:text";
      },
      persistText: async (_text: string, pathname: string) => {
        assert.equal(jobSets.length, 1);
        return `https://blob.example/${pathname}`;
      },
      updateCanvasJob: async (_id: ObjectId, _user: string, update: { $set?: Partial<CanvasJob> }) => {
        if (update.$set) jobSets.push(update.$set);
      },
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
    const expected = textTokenCostUsd(canvasTextUserRates(spec.id), {
      inputTokens: 1_000_000,
      outputTokens: 0,
    });
    assert.equal(result.ok, true);
    assert.equal(sent, "gemini-3.8-flash:Write a topic");
    assert.deepEqual(charges, [expected]);
    assert.equal(jobSets[0]?.chargedUsd, expected);
    assert.equal(jobSets[0]?.spendEventKey, "spend:text");
    if (result.ok) {
      assert.equal(result.job.outputKind, "text");
      assert.equal(result.job.chargedUsd, expected);
      assert.equal(result.job.spendEventKey, "spend:text");
      assert.match(result.job.outputUrl ?? "", /\.txt$/);
    }
    assert.equal(patches[0]?.text, "A short explainer topic");
    assert.equal(patches[0]?.outputKind, "text");
    assert.equal(patches[0]?.lastCostUsd, expected);
    await assert.rejects(
      googleProvider.dispatch({ ...ctx, inputs: { prompt: "  ", refImages: [], videos: [] } }),
      /提示詞/,
    );
  });

  it("charges an ArgoLink text node from mocked token usage and keeps the text output", async () => {
    const spec = findCanvasModel(CANVAS_TEXT_CLAUDE_ID)!;
    const jobId = new ObjectId();
    const canvasId = new ObjectId();
    let model = "";
    const charges: number[] = [];
    const resolved = {
      hasArgolinkKey: () => true,
      generateCanvasText: async (input: { model: string; prompt: string }) => {
        model = input.model;
        return { text: "Three bullets", usage: { inputTokens: 2_000_000, outputTokens: 500_000 } };
      },
      consumeCreditUsd: async (_user: string, costUsd: number) => {
        charges.push(costUsd);
        return "spend:claude";
      },
      persistText: async () => "https://blob.example/claude.txt",
      updateCanvasJob: async () => undefined,
      updateCanvasNodeState: async () => undefined,
      getUserCreditUsd: async () => 20,
      now: () => ON_2026_11_27,
    } as unknown as CanvasExecutorDeps;
    const result = await argolinkProvider.dispatch({
      initialJob: {
        _id: jobId,
        clerkUserId: "user_1",
        canvasId,
        nodeId: "text-2",
        provider: "argolink",
        modelId: spec.id,
        providerModelId: spec.providerModelId,
        status: "queued",
        inputSnapshot: {},
        chargedUsd: 0,
        createdAt: ON_2026_11_27,
        updatedAt: ON_2026_11_27,
      } as CanvasJob,
      spec,
      node: {
        id: "text-2",
        type: "model",
        position: { x: 0, y: 0 },
        data: { modelId: spec.id, prompt: "Compare locks" },
      },
      inputs: { prompt: "Compare locks", refImages: [], videos: [] },
      presetId: "chat",
      clerkUserId: "user_1",
      canvasIdHex: canvasId.toHexString(),
      jobIdHex: jobId.toHexString(),
      resolved,
    } as CanvasDispatchContext);
    assert.equal(model, "claude-sonnet-5-5");
    const expected = textTokenCostUsd(canvasTextUserRates(spec.id, ON_2026_11_27), {
      inputTokens: 2_000_000,
      outputTokens: 500_000,
    });
    assert.equal(expected, 4.725);
    assert.deepEqual(charges, [expected]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.job.outputKind, "text");
      assert.equal(result.job.chargedUsd, expected);
      assert.equal(result.job.outputUrl, "https://blob.example/claude.txt");
    }
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
    const text = modelNode("writer", CANVAS_TEXT_CLAUDE_ID, {
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

  it("lets a wired text or prompt node supply the Explainer topic until the card is edited", () => {
    const text = modelNode("writer", CANVAS_TEXT_CLAUDE_ID, {
      status: "completed",
      outputKind: "text",
      text: "How compound interest works",
    });
    const prompt: CanvasNode = {
      id: "prompt",
      type: "prompt",
      position: { x: 0, y: 0 },
      data: { text: "From a prompt node" },
    };
    const director = modelNode("dir", "scro:explainer", {
      prompt: "typed on the card",
      toolParams: { plannerMode: true },
    });
    const fromText = readConnectedPromptText("dir", [text, director], [edge("writer", "dir", "prompt")]);
    assert.equal(explainerNodeWithWiredTopic(director, fromText).data.prompt, "How compound interest works");
    const fromPrompt = readConnectedPromptText("dir", [prompt, director], [edge("prompt", "dir", "prompt")]);
    assert.equal(explainerNodeWithWiredTopic(director, fromPrompt).data.prompt, "From a prompt node");
    const edited = modelNode("dir", "scro:explainer", {
      prompt: "typed on the card",
      toolParams: { plannerMode: true, promptEdited: true },
    });
    assert.equal(explainerNodeWithWiredTopic(edited, fromText).data.prompt, "typed on the card");
    assert.equal(readConnectedPromptText("dir", [director], []), undefined);
  });
});
