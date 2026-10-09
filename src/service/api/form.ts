import { readJson } from "@/service/api/respond";

// Keys whose value the FormData-based actions expect as one JSON string.
const JSON_STRING_KEYS = new Set(["referenceImages", "voice"]);

// Turn a JSON object into the FormData the existing server actions read.
// Arrays append one entry per item (characterIds, productIds, referenceImageUrl…).
export function jsonToFormData(input: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (JSON_STRING_KEYS.has(key) && typeof value !== "string") {
      form.append(key, JSON.stringify(value));
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) form.append(key, String(item));
      continue;
    }
    if (typeof value === "boolean") {
      form.append(key, value ? "1" : "");
      continue;
    }
    if (typeof value === "object") {
      form.append(key, JSON.stringify(value));
      continue;
    }
    form.append(key, String(value));
  }
  return form;
}

// Accept either multipart/form-data (file uploads) or application/json.
// Extra fixed fields (e.g. route ids) are merged in.
export async function readFormData(
  request: Request,
  extra: Record<string, string> = {},
): Promise<FormData> {
  const type = request.headers.get("content-type") || "";
  let form: FormData;
  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
    form = await request.formData();
  } else {
    form = jsonToFormData(await readJson(request));
  }
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}
