import { assertFalKey, falAuthHeaders } from "@/service/fal/key";

type FetchOptions = { fetch?: typeof fetch };

/**
 * Upload bytes to fal CDN via initiate + PUT, then return the public `file_url`
 * that model endpoints can download.
 */
export async function uploadFalBuffer(
  input: {
    bytes: Buffer;
    fileName: string;
    contentType: string;
  },
  options: FetchOptions = {},
): Promise<string> {
  const fetchFn = options.fetch ?? fetch;
  const key = assertFalKey();
  const headers = falAuthHeaders(key);

  const initiateRes = await fetchFn(
    "https://rest.alpha.fal.ai/storage/upload/initiate",
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        content_type: input.contentType,
        file_name: input.fileName,
      }),
    },
  );
  const initiateBody = (await initiateRes.json()) as {
    upload_url?: string;
    file_url?: string;
    detail?: unknown;
  };
  if (!initiateRes.ok || !initiateBody.upload_url || !initiateBody.file_url) {
    throw new Error(
      `fal upload initiate failed (${initiateRes.status}): ${JSON.stringify(initiateBody.detail ?? initiateBody)}`,
    );
  }

  const putRes = await fetchFn(initiateBody.upload_url, {
    method: "PUT",
    headers: { "Content-Type": input.contentType },
    body: new Uint8Array(input.bytes),
  });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => "");
    throw new Error(`fal upload PUT failed (${putRes.status}): ${text.slice(0, 200)}`);
  }

  return initiateBody.file_url;
}
