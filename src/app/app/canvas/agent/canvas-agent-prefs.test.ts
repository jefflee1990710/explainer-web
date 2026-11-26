import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CANVAS_AGENT_LANGUAGE_KEY,
  languageFromStorage,
  readCanvasAgentLanguage,
  writeCanvasAgentLanguage,
} from "@/app/app/canvas/agent/canvas-agent-prefs";

describe("canvas agent language preference", () => {
  it("keeps a saved chat language and ignores anything else", () => {
    assert.equal(languageFromStorage("yue", "zh-Hant"), "yue");
    assert.equal(languageFromStorage("en", "zh-Hant"), "en");
    assert.equal(languageFromStorage("English", "zh-Hant"), "zh-Hant");
    assert.equal(languageFromStorage(null, "ja"), "ja");
  });

  it("writes the choice to localStorage and reads it back", () => {
    const store = new Map<string, string>();
    const target = globalThis as { localStorage?: Storage; dispatchEvent?: (event: Event) => boolean };
    const previousStorage = target.localStorage;
    const previousDispatch = target.dispatchEvent;
    target.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    } as Storage;
    target.dispatchEvent = () => true;
    try {
      writeCanvasAgentLanguage("ko");
      assert.equal(store.get(CANVAS_AGENT_LANGUAGE_KEY), "ko");
      assert.equal(readCanvasAgentLanguage("zh-Hant"), "ko");

      store.set(CANVAS_AGENT_LANGUAGE_KEY, "not-a-language");
      assert.equal(readCanvasAgentLanguage("en"), "en");
    } finally {
      target.localStorage = previousStorage;
      target.dispatchEvent = previousDispatch;
    }
  });
});
