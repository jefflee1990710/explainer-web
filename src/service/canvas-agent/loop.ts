// One chat turn of the Scro canvas agent (Hermes-style loop): the model calls tools
// until it answers, asks the user a question, or hits the step budget. New nodes that
// cannot run yet get one repair pass plus deterministic wiring, and a no-tool summary
// call makes sure the reply matches the final canvas.

import { generateText, hasToolCall, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { directorModel, storyboardProviderOptions } from "@/service/director/model";
import { normalizeCanvasGroups } from "@/service/canvas/groups";
import type { CanvasModelSpec } from "@/service/canvas/model-catalog";
import type {
  CanvasLibraryAsset,
  CanvasLibraryCharacterOption,
} from "@/model/canvas-dto";
import {
  autofixCanvasAgentGaps,
  describeCanvasAgentGaps,
  findCanvasAgentGaps,
} from "@/service/canvas-agent/gaps";
import {
  buildCanvasAgentRepairPrompt,
  buildCanvasAgentSummaryPrompt,
  buildCanvasAgentSystemPrompt,
} from "@/service/canvas-agent/prompt";
import {
  buildCanvasAgentModelMessages,
  chatImageAssets,
  type CanvasAgentModelMessage,
} from "@/service/canvas-agent/chat-images";
import { buildCanvasAgentTools, createWorkingGraph } from "@/service/canvas-agent/tools";
import type {
  CanvasAgentLanguage,
  CanvasAgentOp,
  CanvasAgentQuestion,
} from "@/model/canvas-agent";

export const CANVAS_AGENT_MAX_STEPS = 12;
export const CANVAS_AGENT_REPAIR_STEPS = 6;
export const CANVAS_AGENT_HISTORY_LIMIT = 20;

export type CanvasAgentHistoryMessage = {
  role: "user" | "assistant";
  text: string;
  imageUrls?: readonly string[];
};

export type CanvasAgentGenerate = (input: {
  system: string;
  messages: CanvasAgentModelMessage[];
  tools?: ToolSet;
  maxSteps: number;
}) => Promise<{ text: string; endedOnToolCalls: boolean }>;

const defaultGenerate: CanvasAgentGenerate = async ({ system, messages, tools, maxSteps }) => {
  const result = await generateText({
    model: directorModel(),
    system,
    messages: messages as ModelMessage[],
    // Same low-thinking setting as storyboard planning, so each tool step stays fast.
    providerOptions: storyboardProviderOptions(),
    // ask_user hands the turn back to the user, so the loop stops right after it.
    ...(tools ? { tools, stopWhen: [stepCountIs(maxSteps), hasToolCall("ask_user")] } : {}),
  });
  return { text: result.text.trim(), endedOnToolCalls: result.finishReason === "tool-calls" };
};

export async function runCanvasAgentTurn(input: {
  language: CanvasAgentLanguage;
  message: string;
  history: readonly CanvasAgentHistoryMessage[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups?: CanvasGroup[];
  catalog: readonly CanvasModelSpec[];
  assets: readonly CanvasLibraryAsset[];
  characters?: readonly CanvasLibraryCharacterOption[];
  imageUrls?: readonly string[];
  generate?: CanvasAgentGenerate;
}): Promise<{
  reply: string;
  ops: CanvasAgentOp[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups: CanvasGroup[];
  question?: CanvasAgentQuestion;
}> {
  const generate = input.generate ?? defaultGenerate;
  const built = buildCanvasAgentModelMessages({
    history: input.history,
    message: input.message,
    imageUrls: input.imageUrls,
    historyLimit: CANVAS_AGENT_HISTORY_LIMIT,
  });
  const graph = createWorkingGraph({
    ...input,
    assets: [...chatImageAssets(built.imageUrls), ...input.assets],
  });
  const system = buildCanvasAgentSystemPrompt({ language: input.language, graph });
  const messages = built.messages;

  const first = await generate({
    system,
    messages,
    tools: buildCanvasAgentTools(graph),
    maxSteps: CANVAS_AGENT_MAX_STEPS,
  });

  let reply = first.text;
  let hitStepLimit = first.endedOnToolCalls;
  let needsSummary = first.endedOnToolCalls || !reply;

  // The graph must run as-is: one repair pass for new nodes with empty inputs,
  // then wire whatever has a single obvious answer.
  let gaps = graph.question ? [] : findCanvasAgentGaps(graph);
  if (gaps.length > 0) {
    const repair = await generate({
      system: buildCanvasAgentRepairPrompt({
        language: input.language,
        graph,
        gapLines: describeCanvasAgentGaps(graph, gaps),
      }),
      messages,
      tools: buildCanvasAgentTools(graph),
      maxSteps: CANVAS_AGENT_REPAIR_STEPS,
    });
    hitStepLimit = repair.endedOnToolCalls;
    if (graph.question) {
      reply = repair.text;
      needsSummary = false;
      gaps = [];
    } else {
      gaps = findCanvasAgentGaps(graph);
      if (autofixCanvasAgentGaps(graph, gaps) > 0) gaps = findCanvasAgentGaps(graph);
      // The first reply described a graph that has since changed.
      needsSummary = true;
    }
  }

  if (graph.question) {
    // The dock shows the question itself, so the reply may be a single line.
    reply = reply || graph.question.question;
  } else if (needsSummary) {
    const summary = await generate({
      system: buildCanvasAgentSummaryPrompt({
        language: input.language,
        graph,
        gapLines: gaps.length > 0 ? describeCanvasAgentGaps(graph, gaps) : undefined,
        hitStepLimit,
      }),
      messages,
      maxSteps: 1,
    });
    reply = summary.text;
  }

  return {
    reply,
    ops: graph.ops,
    nodes: graph.nodes,
    edges: graph.edges,
    groups: normalizeCanvasGroups(graph.groups, graph.nodes),
    ...(graph.question ? { question: graph.question } : {}),
  };
}
