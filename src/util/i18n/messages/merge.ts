import type { Messages } from "@/util/i18n/messages/types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Fill missing keys from English so partial locale files stay type-safe at runtime.
export function mergeMessages(
  base: Messages,
  override: Partial<Messages>,
): Messages {
  const result: Record<string, unknown> = { ...base };

  for (const [key, overVal] of Object.entries(override)) {
    const baseVal = result[key];
    if (isPlainObject(overVal) && isPlainObject(baseVal)) {
      result[key] = { ...baseVal, ...overVal };
    } else if (overVal !== undefined) {
      result[key] = overVal;
    }
  }

  return result as Messages;
}
