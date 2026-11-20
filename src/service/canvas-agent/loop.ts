// One chat turn of the Scro canvas agent (Hermes-style loop): the model calls tools
// until it answers in text or hits the step budget, then a no-tool grace call
// makes sure the user always gets a summary.

import { generateText, stepCountIs, type ToolSet } from "ai";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { directorModel } from "@/service/director/model";
import type { CanvasModelSpec } from "@/service/canvas/model-catalog";
import type { CanvasLibraryAsset } from "@/service/canvas/projects";
import { buildCanvasAgentSystemPrompt, canvasAgentLanguageRule } from "@/service/canvas-agent/prompt";
import { buildCanvasAgentTools, createWorkingGraph } from "@/service/canvas-agent/tools";
import type { CanvasAgentLanguage, CanvasAgentOp } from "@/service/canvas-agent/types";

export const CANVAS_AGENT_MAX_STEPS = 12;
export const CANVAS_AGENT_HISTORY_LIMIT = 20;

export type CanvasAgentHistoryMessage = { role: "user" | "assistant"; text: string };

export type CanvasAgentGenerate = (input: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: ToolSet;
  maxSteps: number;
}) => Promise<{ text: string; endedOnToolCalls: boolean }>;

const defaultGenerate: CanvasAgentGenerate = async ({ system, messages, tools, maxSteps }) => {
  const result = await generateText({
    model: directorModel(),
    system,
    messages,
    ...(tools ? { tools, stopWhen: stepCountIs(maxSteps) } : {}),
  });
  return { text: result.text.trim(), endedOnToolCalls: result.finishReason === "tool-calls" };
};

export async function runCanvasAgentTurn(input: {
  language: CanvasAgentLanguage;
  message: string;
  history: readonly CanvasAgentHistoryMessage[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  catalog: readonly CanvasModelSpec[];
  assets: readonly CanvasLibraryAsset[];
  generate?: CanvasAgentGenerate;
}): Promise<{ reply: string; ops: CanvasAgentOp[]; nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  const generate = input.generate ?? defaultGenerate;
  const graph = createWorkingGraph(input);
  const system = buildCanvasAgentSystemPrompt({ language: input.language, graph });
  const recent = input.history.slice(-CANVAS_AGENT_HISTORY_LIMIT);
  // Gemini expects the conversation to open with a user turn.
  while (recent[0]?.role === "assistant") recent.shift();
  const messages = [
    ...recent.map((m) => ({ role: m.role, content: m.text })),
    { role: "user" as const, content: input.message },
  ];

  const first = await generate({
    system,
    messages,
    tools: buildCanvasAgentTools(graph),
    maxSteps: CANVAS_AGENT_MAX_STEPS,
  });

  let reply = first.text;
  if (first.endedOnToolCalls || !reply) {
    // Step budget ran out mid-work: summarize what is on the canvas now, no more tools.
    const grace = await generate({
      system: `${buildCanvasAgentSystemPrompt({ language: input.language, graph })}

You have no more tool calls this turn. Summarize what is on the canvas now and what is still missing. ${canvasAgentLanguageRule(input.language)}`,
      messages,
      maxSteps: 1,
    });
    reply = grace.text;
  }

  return { reply, ops: graph.ops, nodes: graph.nodes, edges: graph.edges };
}
