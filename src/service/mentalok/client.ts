// REST client for Mentalok AI Studio (`https://aistudio.mentalok.io`).
// Handles model catalog discovery, 15 MB base64 media uploads, and async job create/poll.

export const MENTALOK_DEFAULT_BASE_URL = "https://aistudio.mentalok.io";
export const MENTALOK_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type MentalokRuntimeStatus =
  | "warm"
  | "cached"
  | "cold"
  | "booting"
  | "busy"
  | "unavailable";

export type MentalokModelSummary = {
  id: string;
  name: string;
  category: string;
  priceUsd?: number;
  status?: MentalokRuntimeStatus;
  presets: string[];
};

export type MentalokUploadInput = {
  buffer: Buffer | Uint8Array;
  contentType: string;
  filename?: string;
};

export type MentalokUploadResult = {
  url: string;
  contentType: string;
  expiresAt?: string;
};

export type MentalokJobStatus = "queued" | "running" | "completed" | "failed";

export type MentalokJobRecord = {
  id: string;
  status: MentalokJobStatus;
  rawStatus?: string;
  modelId?: string;
  presetId?: string;
  priceUsd?: number;
  outputUrl?: string;
  outputUrls?: string[];
  error?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MentalokCreateJobPayload = {
  modelId: string;
  presetId?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number;
  imageUrl?: string;
  videoUrl?: string;
  refAudioUrl?: string;
  refImages?: string[];
  keyframes?: unknown;
  [key: string]: unknown;
};

export type MentalokClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};

const VALID_RUNTIME_STATUSES = new Set<MentalokRuntimeStatus>([
  "warm",
  "cached",
  "cold",
  "booting",
  "busy",
  "unavailable",
]);

function mentalokApiKey(override?: string): string {
  const raw = override !== undefined ? override : process.env.MENTALOK_AI_STUDIO_API_KEY;
  return (raw || "").trim();
}

// Returns true when a Mentalok AI Studio Bearer token is configured.
export function hasMentalokApiKey(override?: string): boolean {
  return Boolean(mentalokApiKey(override));
}

function assertMentalokApiKey(override?: string): string {
  const key = mentalokApiKey(override);
  if (!key) {
    throw new Error("MENTALOK_AI_STUDIO_API_KEY is not configured");
  }
  return key;
}

// Resolves Mentalok base URL with trailing slashes trimmed.
export function mentalokBaseUrl(override?: string): string {
  const raw = (
    override !== undefined
      ? override
      : process.env.MENTALOK_AI_STUDIO_BASE_URL || MENTALOK_DEFAULT_BASE_URL
  ).trim();
  const normalized = (raw || MENTALOK_DEFAULT_BASE_URL).replace(/\/+$/, "");
  return normalized || MENTALOK_DEFAULT_BASE_URL;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function finiteNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

function parseRuntimeStatus(value: unknown): MentalokRuntimeStatus | undefined {
  const raw = nonEmptyString(value)?.toLowerCase();
  if (raw && VALID_RUNTIME_STATUSES.has(raw as MentalokRuntimeStatus)) {
    return raw as MentalokRuntimeStatus;
  }
  return undefined;
}

function extractMentalokError(body: unknown, fallback: string): string {
  const rec = asRecord(body);
  if (typeof rec.error === "string" && rec.error.trim()) {
    return rec.error.trim();
  }
  const errObj = asRecord(rec.error);
  const nestedMsg = nonEmptyString(errObj.message) || nonEmptyString(errObj.detail);
  if (nestedMsg) return nestedMsg;
  const topMsg = nonEmptyString(rec.message) || nonEmptyString(rec.detail);
  if (topMsg) return topMsg;
  const errCode = nonEmptyString(errObj.code);
  if (errCode) return errCode;
  return fallback;
}

function parsePresetIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      ids.push(item.trim());
    } else if (item && typeof item === "object") {
      const id = nonEmptyString((item as Record<string, unknown>).id);
      if (id) ids.push(id);
    }
  }
  return ids;
}

function parseModelSummary(raw: unknown): MentalokModelSummary | undefined {
  const rec = asRecord(raw);
  const id = nonEmptyString(rec.id) || nonEmptyString(rec.modelId);
  if (!id) return undefined;
  const name = nonEmptyString(rec.name) || id;
  const category = nonEmptyString(rec.category) || "IMAGE";
  const priceUsd = finiteNonNegativeNumber(rec.priceUsd ?? rec.price_usd);
  const status = parseRuntimeStatus(rec.status ?? rec.runtimeStatus);
  const presets = parsePresetIds(rec.presets);
  return {
    id,
    name,
    category,
    ...(priceUsd !== undefined ? { priceUsd } : {}),
    ...(status ? { status } : {}),
    presets,
  };
}

function normalizeJobStatus(raw: unknown): MentalokJobStatus {
  const s = (nonEmptyString(raw) || "queued").toLowerCase();
  if (s === "completed" || s === "succeeded" || s === "done") return "completed";
  if (s === "running" || s === "processing" || s === "in_progress" || s === "started") {
    return "running";
  }
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled" || s === "expired" || s === "nsfw") {
    return "failed";
  }
  return "queued";
}

function parseOutputUrls(rec: Record<string, unknown>): string[] {
  const candidates = [rec.outputUrls, rec.output_urls, rec.outputs];
  const urls: string[] = [];
  for (const list of candidates) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (typeof entry === "string" && entry.trim()) {
        urls.push(entry.trim());
      } else if (entry && typeof entry === "object") {
        const u = nonEmptyString((entry as Record<string, unknown>).url);
        if (u) urls.push(u);
      }
    }
    if (urls.length > 0) break;
  }
  return urls;
}

function parseJobRecord(body: unknown): MentalokJobRecord {
  const root = asRecord(body);
  const rec = root.job && typeof root.job === "object" ? asRecord(root.job) : root;
  const id = nonEmptyString(rec.id) || nonEmptyString(rec.jobId);
  if (!id) {
    throw new Error("Mentalok AI Studio response is missing job id");
  }
  const rawStatus = nonEmptyString(rec.status);
  const outputUrls = parseOutputUrls(rec);
  const outputUrl =
    nonEmptyString(rec.outputUrl) ||
    nonEmptyString(rec.output_url) ||
    outputUrls[0];
  const priceUsd = finiteNonNegativeNumber(rec.priceUsd ?? rec.price_usd);
  const error =
    nonEmptyString(rec.error) ||
    nonEmptyString(asRecord(rec.error).message);

  return {
    id,
    status: normalizeJobStatus(rawStatus),
    ...(rawStatus ? { rawStatus } : {}),
    ...(nonEmptyString(rec.modelId) ? { modelId: nonEmptyString(rec.modelId) } : {}),
    ...(nonEmptyString(rec.presetId) ? { presetId: nonEmptyString(rec.presetId) } : {}),
    ...(priceUsd !== undefined ? { priceUsd } : {}),
    ...(outputUrl ? { outputUrl } : {}),
    ...(outputUrls.length > 0 ? { outputUrls } : {}),
    ...(error ? { error } : {}),
    ...(nonEmptyString(rec.createdAt) ? { createdAt: nonEmptyString(rec.createdAt) } : {}),
    ...(nonEmptyString(rec.updatedAt) ? { updatedAt: nonEmptyString(rec.updatedAt) } : {}),
  };
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) clean[key] = value;
  }
  return clean;
}

// Fetches enabled models with live USD pricing, status, and presets from Mentalok AI Studio.
export async function listMentalokModels(
  options?: MentalokClientOptions,
): Promise<MentalokModelSummary[]> {
  const key = assertMentalokApiKey(options?.apiKey);
  const fetchFn = options?.fetch ?? fetch;
  const url = `${mentalokBaseUrl(options?.baseUrl)}/api/v1/models`;

  const response = await fetchFn(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      extractMentalokError(body, `Mentalok model list request failed (${response.status})`),
    );
  }

  const rawList = Array.isArray(body) ? body : asRecord(body).models;
  if (!Array.isArray(rawList)) return [];

  const models: MentalokModelSummary[] = [];
  for (const item of rawList) {
    const parsed = parseModelSummary(item);
    if (parsed) models.push(parsed);
  }
  return models;
}

// Uploads a media buffer (<= 15 MB) to Mentalok AI Studio as base64 JSON.
export async function uploadMentalokMedia(
  input: MentalokUploadInput,
  options?: MentalokClientOptions,
): Promise<MentalokUploadResult> {
  if (input.buffer.byteLength > MENTALOK_MAX_UPLOAD_BYTES) {
    throw new Error("Mentalok upload exceeds the 15 MB size limit");
  }
  if (input.buffer.byteLength === 0) {
    throw new Error("Mentalok upload buffer cannot be empty");
  }

  const key = assertMentalokApiKey(options?.apiKey);
  const fetchFn = options?.fetch ?? fetch;
  const url = `${mentalokBaseUrl(options?.baseUrl)}/api/v1/uploads`;
  const dataBase64 = Buffer.from(input.buffer).toString("base64");

  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(
      stripUndefined({
        contentType: input.contentType,
        dataBase64,
        filename: input.filename,
      }),
    ),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      extractMentalokError(body, `Mentalok media upload failed (${response.status})`),
    );
  }

  const root = asRecord(body);
  const rec = root.upload && typeof root.upload === "object" ? asRecord(root.upload) : root;
  const uploadedUrl = nonEmptyString(rec.url);
  if (!uploadedUrl) {
    throw new Error("Mentalok media upload response is missing url");
  }

  return {
    url: uploadedUrl,
    contentType: nonEmptyString(rec.contentType) || input.contentType,
    ...(nonEmptyString(rec.expiresAt) ? { expiresAt: nonEmptyString(rec.expiresAt) } : {}),
  };
}

// Ensures a media reference is accessible to Mentalok: passes public HTTPS URLs through,
// and uploads data: URLs or non-HTTPS URLs (or forced uploads) via POST /api/v1/uploads.
export async function ensureMentalokUrl(
  mediaUrl: string,
  options?: MentalokClientOptions & { forceUpload?: boolean; filename?: string },
): Promise<string> {
  const trimmed = mediaUrl.trim();
  if (!trimmed) {
    throw new Error("Media URL cannot be empty");
  }

  const dataMatch = /^data:([^;,]+);base64,(.+)$/i.exec(trimmed);
  if (dataMatch) {
    const contentType = dataMatch[1] || "application/octet-stream";
    const buffer = Buffer.from(dataMatch[2], "base64");
    const uploaded = await uploadMentalokMedia(
      { buffer, contentType, filename: options?.filename },
      options,
    );
    return uploaded.url;
  }

  if (/^https:\/\//i.test(trimmed) && !options?.forceUpload) {
    return trimmed;
  }

  const fetchFn = options?.fetch ?? fetch;
  const fetched = await fetchFn(trimmed);
  if (!fetched.ok) {
    throw new Error(`Failed to fetch media for Mentalok upload (${fetched.status})`);
  }
  const contentType = fetched.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await fetched.arrayBuffer());
  const uploaded = await uploadMentalokMedia(
    { buffer, contentType, filename: options?.filename },
    options,
  );
  return uploaded.url;
}

// Submits a new Mentalok AI Studio generation job.
export async function createMentalokJob(
  payload: MentalokCreateJobPayload,
  options?: MentalokClientOptions,
): Promise<MentalokJobRecord> {
  const key = assertMentalokApiKey(options?.apiKey);
  const fetchFn = options?.fetch ?? fetch;
  const url = `${mentalokBaseUrl(options?.baseUrl)}/api/v1/jobs`;

  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(stripUndefined(payload)),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      extractMentalokError(body, `Mentalok job submission failed (${response.status})`),
    );
  }

  return parseJobRecord(body);
}

// Polls the latest state and output URL for an existing Mentalok job.
export async function getMentalokJob(
  jobId: string,
  options?: MentalokClientOptions,
): Promise<MentalokJobRecord> {
  const cleanId = jobId.trim();
  if (!cleanId) {
    throw new Error("Mentalok jobId cannot be empty");
  }

  const key = assertMentalokApiKey(options?.apiKey);
  const fetchFn = options?.fetch ?? fetch;
  const url = `${mentalokBaseUrl(options?.baseUrl)}/api/v1/jobs/${encodeURIComponent(cleanId)}`;

  const response = await fetchFn(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      extractMentalokError(body, `Mentalok job status lookup failed (${response.status})`),
    );
  }

  return parseJobRecord(body);
}
