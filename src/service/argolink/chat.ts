// ArgoLink chat completions (ARGOLINK_API_KEY only). Text models on the canvas call this.
// POST https://argolink.io/v1/chat/completions — OpenAI message shape.

import { argolinkApiKey } from "@/service/argolink/client";

export const ARGOLINK_CHAT_COMPLETIONS_URL = "https://argolink.io/v1/chat/completions";

export type ArgolinkChatUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ArgolinkChatResult = {
  text: string;
  usage: ArgolinkChatUsage;
};

type ArgolinkChatDeps = {
  fetch?: typeof fetch;
  apiKey?: string;
};

// Sends one user prompt. The key stays in the Authorization header and is never written into errors.
export async function argolinkChatCompletion(
  input: { model: string; prompt: string },
  deps?: ArgolinkChatDeps,
): Promise<ArgolinkChatResult> {
  const apiKey = (deps?.apiKey ?? argolinkApiKey()).trim();
  if (!apiKey) throw new Error("尚未設定 ARGOLINK_API_KEY，無法使用 ArgoLink 模型");
  const fetchFn = deps?.fetch ?? fetch;
  const response = await fetchFn(ARGOLINK_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: [{ role: "user", content: input.prompt }],
    }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(argolinkChatError(response.status, raw, apiKey));
  return parseArgolinkChat(raw);
}

function argolinkChatError(status: number, raw: string, apiKey: string): string {
  let detail = "";
  try {
    const body = JSON.parse(raw) as { error?: { message?: string } | string };
    if (typeof body.error === "string") detail = body.error;
    else if (body.error && typeof body.error.message === "string") detail = body.error.message;
  } catch {
    detail = "";
  }
  const safe = detail.replaceAll(apiKey, "").trim().slice(0, 180);
  return safe ? `ArgoLink 聊天失敗（${status}）：${safe}` : `ArgoLink 聊天失敗（${status}）`;
}

function finiteCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
      return "";
    })
    .join("");
}

// Reads the assistant text plus prompt_tokens / completion_tokens. Reasoning tokens count as output.
export function parseArgolinkChat(raw: string): ArgolinkChatResult {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error("ArgoLink 聊天回應不是 JSON");
  }
  if (!body || typeof body !== "object") throw new Error("ArgoLink 聊天回應不是 JSON");
  const record = body as {
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
  };
  const text = readContent(record.choices?.[0]?.message?.content).trim();
  if (!text) throw new Error("文字模型沒有回傳內容");
  const inputTokens = finiteCount(record.usage?.prompt_tokens);
  const outputTokens = finiteCount(record.usage?.completion_tokens);
  if (inputTokens === undefined || outputTokens === undefined) {
    throw new Error("文字模型沒有回傳 token 用量");
  }
  return { text, usage: { inputTokens, outputTokens } };
}
