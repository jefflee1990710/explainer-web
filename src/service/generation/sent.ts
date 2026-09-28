// What a provider submit returned. Lives outside `pipeline.ts` so the
// character sender can share it without an import cycle.
export type Sent = {
  requestId: string;
  statusUrl?: string;
  status?: string;
  model: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
  // Provider's reason when the submit response itself reports a failure.
  error?: string;
};

type SubmitResponse = {
  request_id: string;
  status_url?: string;
  status?: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
};

// First non-empty string among the provider's `error` / `message` fields.
function responseError(submitted: object) {
  const body = submitted as { error?: unknown; message?: unknown };
  if (typeof body.error === "string" && body.error) return body.error;
  if (typeof body.message === "string" && body.message) return body.message;
  return undefined;
}

export function toSent(model: string, submitted: SubmitResponse): Sent {
  return {
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: submitted.status,
    model,
    images: submitted.images,
    video: submitted.video,
    error: responseError(submitted),
  };
}
