import type { FreesoundToken } from "@/model/freesound-grant";

/** Public redirect URL registered on the Freesound API credential. */
export const FREESOUND_PERMISSION_PATH =
  "/_freesound/app_permissions/permission_granted";

export const FREESOUND_TOKEN_URL = "https://freesound.org/apiv2/oauth2/access_token/";

export type FreesoundCallbackKind = "denied" | "ready" | "exchange";

/** What the redirect should do. `code` is only exchanged, never shown. */
export function freesoundCallbackKind({
  code,
  error,
}: {
  code: string | null;
  error: string | null;
}): FreesoundCallbackKind {
  if (error) return "denied";
  if (!code) return "ready";
  return "exchange";
}

export function parseFreesoundToken(body: unknown): FreesoundToken | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const accessToken = record.access_token;
  const refreshToken = record.refresh_token;
  const scope = record.scope;
  const expiresIn = record.expires_in;
  if (typeof accessToken !== "string" || accessToken.length === 0) return null;
  if (typeof refreshToken !== "string" || refreshToken.length === 0) return null;
  if (typeof scope !== "string") return null;
  if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn)) return null;
  return {
    accessToken,
    refreshToken,
    scope,
    expiresIn,
  };
}
