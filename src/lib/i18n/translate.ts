import type { Messages } from "./messages/types";

export type TranslateParams = Record<string, string | number>;

export type TranslateFn = (key: string, params?: TranslateParams) => string;

function lookup(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in (node as object)) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);
}

export function createTranslate(messages: Messages): TranslateFn {
  return function t(key: string, params?: TranslateParams) {
    const value = lookup(messages, key);
    if (typeof value !== "string") return key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(params[name] ?? `{${name}}`),
    );
  };
}
