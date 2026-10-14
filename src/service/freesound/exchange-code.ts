import { freesoundGrantsCollection } from "@/dao/freesound-grants";
import type { FreesoundToken } from "@/model/freesound-grant";
import { FREESOUND_TOKEN_URL, parseFreesoundToken } from "@/service/freesound/callback";

function freesoundCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.FREESOUND_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.FREESOUND_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("Freesound credentials are not configured");
  }
  return { clientId, clientSecret };
}

/** Step 3: trade the redirect `code` for an access token. The code is single-use. */
export async function exchangeFreesoundCode({
  code,
}: {
  code: string;
}): Promise<FreesoundToken> {
  const { clientId, clientSecret } = freesoundCredentials();
  const response = await fetch(FREESOUND_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
    }),
  });
  const body: unknown = await response.json().catch(() => null);
  const token = parseFreesoundToken(body);
  if (!response.ok || !token) {
    throw new Error("Freesound did not return an access token");
  }
  return token;
}

export async function saveFreesoundGrant({
  token,
  state,
}: {
  token: FreesoundToken;
  state: string | null;
}): Promise<void> {
  const grants = await freesoundGrantsCollection();
  const updatedAt = new Date();
  await grants.updateOne(
    { _id: "app" },
    {
      $set: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        scope: token.scope,
        expiresAt: new Date(updatedAt.getTime() + token.expiresIn * 1000),
        state,
        updatedAt,
      },
    },
    { upsert: true },
  );
}
