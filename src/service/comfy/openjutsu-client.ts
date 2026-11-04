import {
  buildObjectGraph,
  buildSimpleGraph,
  OPENJUTSU_CLIP_SECONDS,
  type ObjectGraphInput,
  type OpenJutsuMargin,
  type SimpleGraphInput,
} from "@/service/comfy/openjutsu-graph";
import {
  fetchMinimaxVideoStatus,
  isMinimaxVideoStatusUrl,
} from "@/service/minimax/talking-head-reference";
import { fetchOpenRouterStatus } from "@/service/openrouter/generate";

export type ComfySubmitResult = {
  request_id: string;
  status_url: string;
  status: "processing" | "completed" | "failed";
  video?: { url: string };
  error?: string;
};

type ComfyFile = { filename: string; subfolder: string; type: string };

const PROMPT_PREFIX = "comfy://prompt/";

export function hasComfyEndpoint() {
  return Boolean(comfyBaseUrl() && process.env.COMFY_API_KEY?.trim());
}

export function comfyBaseUrl() {
  return process.env.COMFY_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
}

export function isComfyPromptStatusUrl(url: string) {
  return url.startsWith(PROMPT_PREFIX);
}

export function comfyRenderStaleMs(statusUrl?: string) {
  return statusUrl && isComfyPromptStatusUrl(statusUrl)
    ? 3 * 60 * 60 * 1000
    : 25 * 60 * 1000;
}

// The Vast proxy rejects every request that does not carry this bearer token.
export function comfyViewAuthHeaders(url?: string | null): Record<string, string> | undefined {
  const base = comfyBaseUrl();
  const key = process.env.COMFY_API_KEY?.trim();
  if (!base || !key || !url?.startsWith(base)) return undefined;
  return { Authorization: `Bearer ${key}` };
}

function authHeaders() {
  const key = process.env.COMFY_API_KEY?.trim();
  if (!comfyBaseUrl() || !key) throw new Error("ComfyUI 尚未設定");
  return { Authorization: `Bearer ${key}` };
}

async function comfyFetch(path: string, init?: RequestInit, fetchFn: typeof fetch = fetch) {
  const response = await fetchFn(`${comfyBaseUrl()}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  return response;
}

async function uploadInput(
  name: string,
  bytes: Buffer,
  mime: string,
  fetchFn: typeof fetch,
) {
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(bytes)], { type: mime }), name);
  form.append("type", "input");
  form.append("overwrite", "true");
  const response = await comfyFetch("/upload/image", { method: "POST", body: form }, fetchFn);
  const body = (await response.json().catch(() => ({}))) as { name?: string; error?: string };
  if (!response.ok || !body.name) {
    throw new Error(body.error || `ComfyUI 上傳失敗（HTTP ${response.status}）`);
  }
  return body.name;
}

function clipSeconds(sectionLength: number) {
  return Math.min(OPENJUTSU_CLIP_SECONDS, Math.max(2.5, sectionLength));
}

export async function submitOpenJutsuSimple(
  input: Omit<SimpleGraphInput, "videoName" | "imageName" | "clipSeconds"> & {
    video: Buffer;
    image: Buffer;
    imageName: string;
    clipSeconds?: number;
  },
  fetchFn: typeof fetch = fetch,
): Promise<ComfySubmitResult> {
  const videoName = await uploadInput(`scro-${input.runId}.mp4`, input.video, "video/mp4", fetchFn);
  const imageName = await uploadInput(input.imageName, input.image, "image/jpeg", fetchFn);
  const graph = buildSimpleGraph({
    ...input,
    videoName,
    imageName,
    clipSeconds: input.clipSeconds ?? clipSeconds(input.section.length),
  });
  return queueGraph(graph, fetchFn);
}

export async function submitOpenJutsuObject(
  input: Omit<ObjectGraphInput, "videoName" | "imageName" | "clipSeconds"> & {
    video: Buffer;
    image: Buffer | null;
    imageName: string;
    clipSeconds?: number;
  },
  fetchFn: typeof fetch = fetch,
): Promise<ComfySubmitResult> {
  const videoName = await uploadInput(`scro-${input.runId}.mp4`, input.video, "video/mp4", fetchFn);
  const imageName = input.image
    ? await uploadInput(input.imageName, input.image, "image/jpeg", fetchFn)
    : null;
  const graph = buildObjectGraph({
    ...input,
    videoName,
    imageName,
    clipSeconds: input.clipSeconds ?? clipSeconds(input.section.length),
  });
  return queueGraph(graph, fetchFn);
}

async function queueGraph(graph: unknown, fetchFn: typeof fetch): Promise<ComfySubmitResult> {
  const response = await comfyFetch(
    "/prompt",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: graph }),
    },
    fetchFn,
  );
  const body = (await response.json().catch(() => ({}))) as {
    prompt_id?: string;
    error?: { message?: string };
    node_errors?: Record<string, unknown>;
  };
  if (!response.ok || !body.prompt_id) {
    const nodeError = body.node_errors ? JSON.stringify(body.node_errors).slice(0, 500) : "";
    throw new Error(body.error?.message || nodeError || `ComfyUI 提交失敗（HTTP ${response.status}）`);
  }
  return {
    request_id: body.prompt_id,
    status_url: `${PROMPT_PREFIX}${body.prompt_id}`,
    status: "processing",
  };
}

export async function fetchComfyPromptStatus(
  statusUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<ComfySubmitResult> {
  const promptId = statusUrl.slice(PROMPT_PREFIX.length);
  if (!promptId) throw new Error("ComfyUI 任務編號無效");
  const historyResponse = await comfyFetch(`/history/${encodeURIComponent(promptId)}`, undefined, fetchFn);
  const history = (await historyResponse.json().catch(() => ({}))) as Record<string, unknown>;
  if (!historyResponse.ok) {
    throw new Error(`ComfyUI 狀態查詢失敗（HTTP ${historyResponse.status}）`);
  }
  const entry = history[promptId] as
    | { status?: { status_str?: string; messages?: unknown }; outputs?: unknown }
    | undefined;
  if (!entry) {
    return { request_id: promptId, status_url: statusUrl, status: "processing" };
  }
  const statusStr = entry.status?.status_str ?? "";
  if (statusStr === "error") {
    return {
      request_id: promptId,
      status_url: statusUrl,
      status: "failed",
      error: comfyHistoryError(entry.status?.messages) || "ComfyUI 渲染失敗",
    };
  }
  const file = findOutputVideo(entry.outputs);
  if (file) {
    const view = new URL("/view", `${comfyBaseUrl()}/`);
    view.searchParams.set("filename", file.filename);
    view.searchParams.set("subfolder", file.subfolder);
    view.searchParams.set("type", file.type || "output");
    return {
      request_id: promptId,
      status_url: statusUrl,
      status: "completed",
      video: { url: view.toString() },
    };
  }
  if (statusStr === "success") {
    return {
      request_id: promptId,
      status_url: statusUrl,
      status: "failed",
      error: "ComfyUI 完成了，但沒有輸出影片",
    };
  }
  return { request_id: promptId, status_url: statusUrl, status: "processing" };
}

function comfyHistoryError(messages: unknown) {
  if (!Array.isArray(messages)) return "";
  for (const message of messages) {
    if (!Array.isArray(message)) continue;
    const detail = message[1];
    if (detail && typeof detail === "object" && "exception_message" in detail) {
      const text = (detail as { exception_message?: unknown }).exception_message;
      if (typeof text === "string" && text.trim()) return text.trim().slice(0, 500);
    }
  }
  return "";
}

// Prefer the assembled file copied into the regular output folder over per-clip checkpoints.
export function findOutputVideo(outputs: unknown): ComfyFile | null {
  const found: ComfyFile[] = [];
  walk(outputs, found);
  const ranked = found.sort((a, b) => scoreVideo(b) - scoreVideo(a));
  return ranked[0] ?? null;
}

function scoreVideo(file: ComfyFile) {
  const folder = file.subfolder.replaceAll("\\", "/");
  // Swap copies to h3_oneclick_swap. Object and Teleport copy to h3_oneclick_edit.
  if (/(^|\/)h3_oneclick_(swap|edit)$/.test(folder)) return 3;
  if (folder.includes("exports/videos")) return 2;
  // Assemble logs mention the mp4 path as plain text, with no subfolder. That view URL 404s.
  if (!folder || folder.includes("generation/clips")) return 0;
  return 1;
}

function walk(value: unknown, found: ComfyFile[]) {
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.toLowerCase().endsWith(".mp4")) {
      const name = value.split(/[/\\]/).pop() ?? value;
      found.push({ filename: name, subfolder: "", type: "output" });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walk(item, found);
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.filename === "string" && record.filename.toLowerCase().endsWith(".mp4")) {
    found.push({
      filename: record.filename,
      subfolder: typeof record.subfolder === "string" ? record.subfolder : "",
      type: typeof record.type === "string" ? record.type : "output",
    });
  }
  for (const child of Object.values(record)) walk(child, found);
}

export function openJutsuMargin(value: string | undefined): OpenJutsuMargin {
  return value === "tight" || value === "loose" ? value : "normal";
}

// One status check for the cloud providers and the self-hosted Comfy prompt.
export function pollVideoProviderStatus(statusUrl: string) {
  if (isComfyPromptStatusUrl(statusUrl)) return fetchComfyPromptStatus(statusUrl);
  if (isMinimaxVideoStatusUrl(statusUrl)) return fetchMinimaxVideoStatus(statusUrl);
  return fetchOpenRouterStatus(statusUrl);
}
