/** fal.ai API key helpers (`FAL_KEY`). */

export function falApiKey() {
  return (process.env.FAL_KEY || process.env.FAL_API_KEY || "").trim();
}

export function hasFalKey() {
  return Boolean(falApiKey());
}

export function assertFalKey() {
  const key = falApiKey();
  if (!key) {
    throw new Error("尚未設定 FAL_KEY");
  }
  return key;
}

export function falAuthHeaders(key = assertFalKey()): Record<string, string> {
  return {
    Authorization: `Key ${key}`,
    Accept: "application/json",
  };
}
