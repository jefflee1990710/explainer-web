import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_HOT_TOPICS } from "@/model/hot-topic";
import {
  buildHotTopicsPromptFromHistory,
  HOT_TOPICS_TTL_MS,
  isHotTopicsCacheFresh,
} from "@/service/home/hot-topics";

test("isHotTopicsCacheFresh enforces a 4-hour TTL window", () => {
  const now = Date.now();
  assert.equal(HOT_TOPICS_TTL_MS, 4 * 60 * 60 * 1000);
  assert.equal(isHotTopicsCacheFresh(undefined, now), false);

  const fresh = {
    generatedAt: new Date(now - 2 * 60 * 60 * 1000),
    topics: [...DEFAULT_HOT_TOPICS],
  };
  assert.equal(isHotTopicsCacheFresh(fresh, now), true);

  const expired = {
    generatedAt: new Date(now - (4 * 60 * 60 * 1000 + 1000)),
    topics: [...DEFAULT_HOT_TOPICS],
  };
  assert.equal(isHotTopicsCacheFresh(expired, now), false);
});

test("buildHotTopicsPromptFromHistory embeds recent user videos, characters, and posters", () => {
  const prompt = buildHotTopicsPromptFromHistory({
    videoSummaries: ["VOO vs VT — Index fund comparison"],
    characterSummaries: ["Aera: Tech & finance creator in Hong Kong"],
    postSummaries: ["2K Poster: ETF compound growth"],
  });
  assert.match(prompt, /VOO vs VT/);
  assert.match(prompt, /Aera: Tech & finance creator/);
  assert.match(prompt, /2K Poster: ETF compound growth/);
});
