import { assertFalKey, falAuthHeaders } from "@/service/fal/key";

type FetchOptions = { fetch?: typeof fetch };

export type FalQueueSubmitResult = {
  request_id: string;
  status_url: string;
  response_url: string;
  status?: string;
};

/**
 * Submit to fal queue, poll status_url until COMPLETED/FAILED, then GET response_url.
 */
export async function falQueueSubscribe<T>(
  endpointId: string,
  input: Record<string, unknown>,
  options: FetchOptions & {
    pollIntervalMs?: number;
    maxWaitMs?: number;
  } = {},
): Promise<T> {
  const fetchFn = options.fetch ?? fetch;
  const key = assertFalKey();
  const headers = falAuthHeaders(key);
  const pollIntervalMs = options.pollIntervalMs ?? 2000;
  const maxWaitMs = options.maxWaitMs ?? 8 * 60_000;

  const submitRes = await fetchFn(`https://queue.fal.run/${endpointId}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const submitBody = (await submitRes.json()) as FalQueueSubmitResult & {
    detail?: unknown;
  };
  if (!submitRes.ok || !submitBody.status_url || !submitBody.response_url) {
    throw new Error(
      `fal queue submit failed (${submitRes.status}): ${JSON.stringify(submitBody.detail ?? submitBody)}`,
    );
  }

  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const statusRes = await fetchFn(submitBody.status_url, { headers });
    const statusBody = (await statusRes.json()) as {
      status?: string;
      detail?: unknown;
    };
    const status = statusBody.status || "";
    if (status === "COMPLETED") {
      const resultRes = await fetchFn(submitBody.response_url, { headers });
      const resultBody = (await resultRes.json()) as T & { detail?: unknown };
      if (!resultRes.ok) {
        throw new Error(
          `fal queue result failed (${resultRes.status}): ${JSON.stringify((resultBody as { detail?: unknown }).detail ?? resultBody)}`,
        );
      }
      return resultBody;
    }
    if (status === "FAILED" || status === "ERROR" || status === "CANCELLED") {
      throw new Error(
        `fal queue job ${status}: ${JSON.stringify(statusBody.detail ?? statusBody)}`,
      );
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`fal queue timed out after ${maxWaitMs}ms (${endpointId})`);
}
