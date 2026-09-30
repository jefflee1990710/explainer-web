import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const EMAIL = "jeff.lee.1990710@gmail.com";

async function accessToken() {
  const { GoogleAuth } = await import("google-auth-library");
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("無法取得 Firebase Admin access token");
  return token;
}

async function main() {
  const password = process.env.ACCOUNT_PASSWORD;
  if (!password) throw new Error("缺少密碼");

  const { adminAuth } = await import("@/service/firebase/admin");
  const auth = adminAuth();
  const user = await auth.getUserByEmail(EMAIL);
  await auth.updateUser(user.uid, { password, emailVerified: user.emailVerified });

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const token = await accessToken();
  const configUrl = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config`;
  const current = await fetch(configUrl, { headers: { Authorization: `Bearer ${token}` } });
  const config = (await current.json()) as {
    signIn?: { email?: { enabled?: boolean; passwordRequired?: boolean } };
    error?: { message?: string };
  };
  if (!current.ok) throw new Error(config.error?.message || "讀取 Auth 設定失敗");

  let emailEnabled = Boolean(config.signIn?.email?.enabled);
  if (!emailEnabled) {
    const updated = await fetch(`${configUrl}?updateMask=signIn.email.enabled,signIn.email.passwordRequired`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ signIn: { email: { enabled: true, passwordRequired: true } } }),
    });
    const body = (await updated.json()) as { error?: { message?: string }; signIn?: { email?: { enabled?: boolean } } };
    if (!updated.ok) throw new Error(body.error?.message || "無法開啟 email 登入");
    emailEnabled = Boolean(body.signIn?.email?.enabled);
  }

  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password, returnSecureToken: true }),
    },
  );
  const signed = (await signIn.json()) as { localId?: string; error?: { message?: string } };
  if (!signIn.ok) throw new Error(signed.error?.message || "密碼登入測試失敗");

  console.log(
    JSON.stringify({
      email: EMAIL,
      uid: user.uid,
      providers: (await auth.getUser(user.uid)).providerData.map((row) => row.providerId),
      emailEnabled,
      passwordSignIn: signed.localId === user.uid,
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
