import assert from "node:assert/strict";
import { test } from "node:test";
import { atempoChain } from "@/service/reel/retime";

test("atempoChain keeps a single stage inside 0.5–2", () => {
  assert.equal(atempoChain(1.6667), "atempo=1.6667");
});

test("atempoChain splits speeds above 2 into stages", () => {
  assert.equal(atempoChain(2.5), "atempo=2,atempo=1.25");
});
