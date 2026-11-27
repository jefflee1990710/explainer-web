// Reads a provider failure payload. Does not decide whether the job failed.

const GENERIC = new Set([
  "failed",
  "fail",
  "failure",
  "error",
  "cancelled",
  "canceled",
  "expired",
  "pending",
  "success",
  "succeeded",
  "processing",
  "running",
  "queued",
  "in_progress",
  "preparing",
  "done",
  "ok",
  "null",
  "none",
]);

const WRAPPERS = new Set([
  "provider returned error",
  "an error occurred",
  "request failed",
  "internal error",
  "unknown error",
]);

const SUCCESS_STATUS = new Set([
  "completed",
  "succeeded",
  "success",
  "done",
  "pending",
  "processing",
  "running",
  "queued",
  "in_progress",
  "preparing",
]);

const MESSAGE_KEYS = [
  "message",
  "status_msg",
  "error_message",
  "detail",
  "msg",
  "reason",
  "failure_reason",
  "fail_reason",
  "stderr",
];

const MAX_DEPTH = 10;

function trimmed(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isGeneric(text: string): boolean {
  return GENERIC.has(text.trim().toLowerCase());
}

function isWrapper(text: string): boolean {
  return WRAPPERS.has(text.trim().toLowerCase());
}

function isSuccessStatus(status: unknown): boolean {
  return typeof status === "string" && SUCCESS_STATUS.has(status.trim().toLowerCase());
}

function firstString(record: Record<string, unknown>): string | undefined {
  for (const key of MESSAGE_KEYS) {
    const text = trimmed(record[key]);
    if (text) return text;
  }
  return undefined;
}

function codeText(code: unknown): string | undefined {
  if (typeof code === "number" && Number.isFinite(code) && code !== 0) return String(code);
  const text = trimmed(code);
  if (!text || isGeneric(text) || text === "0") return undefined;
  return text;
}

function parseEmbeddedJson(text: string): unknown {
  const objectAt = text.indexOf("{");
  const arrayAt = text.indexOf("[");
  const cut = objectAt === -1 ? arrayAt : arrayAt === -1 ? objectAt : Math.min(objectAt, arrayAt);
  if (cut === -1) return undefined;
  try {
    return JSON.parse(text.slice(cut)) as unknown;
  } catch {
    return undefined;
  }
}

function fromString(text: string, depth: number): string | undefined {
  const value = text.trim();
  if (!value) return undefined;
  const parsed = parseEmbeddedJson(value);
  if (parsed !== undefined) {
    const nested = readErrorValue(parsed, depth + 1);
    if (nested) return nested;
  }
  if (isGeneric(value) || isWrapper(value)) return undefined;
  return value;
}

function baseRespMessage(base: unknown): string | undefined {
  if (!base || typeof base !== "object") return undefined;
  const record = base as Record<string, unknown>;
  const code = record.status_code;
  if (typeof code !== "number" || code === 0) return undefined;
  const message = trimmed(record.status_msg) || trimmed(record.message);
  if (message && !isGeneric(message)) return message;
  return String(code);
}

function blockReason(feedback: unknown): string | undefined {
  if (!feedback || typeof feedback !== "object") return undefined;
  const reason = trimmed((feedback as { blockReason?: unknown }).blockReason);
  if (!reason || isGeneric(reason)) return undefined;
  return reason;
}

function nestedBesideMessage(record: Record<string, unknown>, depth: number): string | undefined {
  for (const key of ["metadata", "raw", "details", "provider_error", "providerError", "cause"]) {
    if (!(key in record)) continue;
    const found = readErrorValue(record[key], depth + 1);
    if (found) return found;
  }
  return undefined;
}

function readPayload(body: unknown, depth: number): string | undefined {
  if (depth > MAX_DEPTH || body == null) return undefined;
  if (typeof body !== "object") return readErrorValue(body, depth);
  if (Array.isArray(body)) return readErrorValue(body, depth);

  const record = body as Record<string, unknown>;
  const base = baseRespMessage(record.base_resp);
  if (base) return base;

  if (record.task && typeof record.task === "object") {
    const taskError = readErrorValue((record.task as { error?: unknown }).error, depth + 1);
    if (taskError) return taskError;
  }

  if ("error" in record && record.error != null) {
    const found = readErrorValue(record.error, depth + 1);
    if (found) return found;
  }

  const data = record.data;
  if (data && typeof data === "object" && !Array.isArray(data) && "error" in data) {
    const found = readErrorValue((data as { error?: unknown }).error, depth + 1);
    if (found) return found;
  }

  const blocked = blockReason(record.promptFeedback);
  if (blocked) return blocked;

  if (isSuccessStatus(record.status)) return undefined;

  // A message may itself be a JSON blob from the upstream provider.
  const direct = firstString(record);
  const unwrapped = direct ? fromString(direct, depth) : undefined;
  if (unwrapped) return unwrapped;
  const nested = nestedBesideMessage(record, depth);
  if (nested) return nested;
  return codeText(record.code ?? record.error_code);
}

function readErrorValue(error: unknown, depth: number): string | undefined {
  if (depth > MAX_DEPTH || error == null) return undefined;
  if (typeof error === "string") return fromString(error, depth);
  if (typeof error === "number") return codeText(error);
  if (Array.isArray(error)) {
    for (const item of error) {
      const found = readErrorValue(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof error !== "object") return undefined;
  return readPayload(error, depth + 1);
}

// MiniMax task.error, OpenRouter metadata.raw, Google, ArgoLink, HeyGen, and FFmpeg JSON.
export function providerErrorMessage(body: unknown): string | undefined {
  return readPayload(body, 0);
}

// Keeps the caller's fallback when the payload only says "failed".
export function providerFailureText(error: unknown, fallback: string): string {
  return providerErrorMessage(error) || fallback;
}
