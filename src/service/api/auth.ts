import { adminAuth } from "@/service/firebase/admin";
import { upsertAppUserFromIdentity } from "@/service/auth";
import { authenticateApiKey, runAsMcpUser } from "@/service/mcp/api-keys";
import type { AppUser } from "@/model/user";

// Mobile / REST auth result. `picture` is only known for Firebase ID tokens.
export type ApiAuth = {
  user: AppUser;
  picture?: string;
  // "firebase" for the Flutter app; "apiKey" for exp_live_ machine keys.
  via: "firebase" | "apiKey";
};

// Resolve the caller of a /api/v1 request from `Authorization: Bearer <token>`.
// Accepts a Firebase ID token (the Flutter app) or an existing exp_live_ MCP key.
export async function authenticateApiRequest(request: Request): Promise<ApiAuth | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  // Machine keys keep their own prefix, so there is no ambiguity with a JWT.
  if (token.startsWith("exp_live_")) {
    const keyAuth = await authenticateApiKey(header);
    return keyAuth ? { user: keyAuth.user, via: "apiKey" } : null;
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    const user = await upsertAppUserFromIdentity(
      { uid: decoded.uid, email: decoded.email, name: decoded.name },
      { readReferralCookie: false },
    );
    return { user, picture: decoded.picture, via: "firebase" };
  } catch {
    return null;
  }
}

// Bind the user so every existing service action (`requireAppUser()`) works unchanged.
export function runAsApiUser<T>(user: AppUser, fn: () => Promise<T>) {
  return runAsMcpUser(user, fn);
}
