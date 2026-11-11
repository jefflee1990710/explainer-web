import { randomUUID } from "node:crypto";
import type { ComfySubmitResult } from "@/service/comfy/openjutsu-client";

// Storyboard MiniMax H3 ref2va. The GPU machine stays on COMFY_BASE_URL.
export const DEFAULT_VAST_SERVERLESS_ENDPOINT = "scro-h3-comfy-serverless";
const ROUTE_URL = "https://run.vast.ai/route/";

export type VastServerlessRoute = {
  url: string;
  endpoint: string;
  cost: number;
  reqnum?: number;
  requestIdx?: number;
  signature: string;
  requestId?: string;
};

export function vastServerlessEndpoint() {
  return process.env.COMFY_SERVERLESS_ENDPOINT?.trim() || DEFAULT_VAST_SERVERLESS_ENDPOINT;
}

function serverlessCost() {
  const parsed = Number(process.env.COMFY_SERVERLESS_COST);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 400;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

function messageFrom(body: unknown) {
  const record = asRecord(body);
  const nested = asRecord(record?.response) ?? asRecord(record?.result) ?? record;
  const error = nested?.error;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (typeof nested?.message === "string" && nested.message.trim()) return nested.message.trim();
  if (typeof record?.status === "string" && !asRecord(record?.response)) return record.status.trim();
  return "";
}

// First https file URL in a serverless /generate/sync body.
export function videoUrlFromServerlessBody(body: unknown): {
  status: string;
  url?: string;
  message?: string;
  id?: string;
} {
  const root = asRecord(body) ?? {};
  const inner = asRecord(root.response) ?? asRecord(root.result) ?? root;
  const status = typeof inner.status === "string" ? inner.status : "";
  const id =
    (typeof inner.id === "string" && inner.id) ||
    (typeof root.id === "string" && root.id) ||
    undefined;
  return {
    status,
    url: findHttpsUrl(inner.output),
    message: messageFrom(body),
    id,
  };
}

function findHttpsUrl(value: unknown): string | undefined {
  if (typeof value === "string" && /^https:\/\//i.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findHttpsUrl(item);
      if (found) return found;
    }
    return undefined;
  }
  const record = asRecord(value);
  if (!record) return undefined;
  if (typeof record.url === "string" && /^https:\/\//i.test(record.url)) return record.url;
  for (const nested of Object.values(record)) {
    const found = findHttpsUrl(nested);
    if (found) return found;
  }
  return undefined;
}

export async function routeVastServerless(
  fetchFn: typeof fetch = fetch,
): Promise<VastServerlessRoute> {
  const key = process.env.VAST_API_KEY?.trim();
  if (!key) throw new Error("Vast serverless 尚未設定");
  const endpoint = vastServerlessEndpoint();
  const cost = serverlessCost();
  const response = await fetchFn(ROUTE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint, cost }),
  });
  const body = (await response.json().catch(() => ({}))) as JsonRecord;
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  if (!response.ok || !url || !signature) {
    const detail = messageFrom(body);
    throw new Error(
      detail
        ? `Vast serverless 沒有可用的 H3 worker（${detail}）`
        : `Vast serverless 路由失敗（HTTP ${response.status}）`,
    );
  }
  return {
    url,
    endpoint: typeof body.endpoint === "string" ? body.endpoint : endpoint,
    cost: typeof body.cost === "number" ? body.cost : cost,
    reqnum: typeof body.reqnum === "number" ? body.reqnum : undefined,
    requestIdx: typeof body.request_idx === "number" ? body.request_idx : undefined,
    signature,
    requestId: typeof body.__request_id === "string" ? body.__request_id : undefined,
  };
}

// Route a worker, then run the Comfy graph on /generate/sync. The call returns the file.
export async function submitVastServerlessWorkflow(
  graph: unknown,
  fetchFn: typeof fetch = fetch,
): Promise<ComfySubmitResult> {
  const route = await routeVastServerless(fetchFn);
  const worker = route.url.replace(/\/+$/, "");
  const response = await fetchFn(`${worker}/generate/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_data: {
        url: route.url,
        endpoint: route.endpoint,
        cost: route.cost,
        reqnum: route.reqnum,
        request_idx: route.requestIdx,
        signature: route.signature,
      },
      payload: { input: { workflow_json: graph } },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(messageFrom(body) || `Vast serverless 提交失敗（HTTP ${response.status}）`);
  }
  const parsed = videoUrlFromServerlessBody(body);
  if (parsed.status === "failed" || parsed.status === "error") {
    throw new Error(parsed.message || "Vast serverless H3 渲染失敗");
  }
  if (!parsed.url) {
    throw new Error(parsed.message || "Vast serverless 完成了，但沒有輸出影片");
  }
  const requestId = parsed.id || route.requestId || randomUUID();
  return {
    request_id: requestId,
    status_url: `comfy://serverless/${requestId}`,
    status: "completed",
    video: { url: parsed.url },
  };
}
