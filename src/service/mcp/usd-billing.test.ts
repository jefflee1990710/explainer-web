import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { mcpToolCallSchema } from "@/model/mcp";
import { summarizeMcpToolCalls } from "@/service/mcp/key-actions";
import { videoBriefFields } from "@/service/mcp/video-brief";

test("mcpToolCallSchema accepts chargedUsd without requiring legacy creditsCharged", () => {
  const parsed = mcpToolCallSchema.parse({
    _id: new ObjectId(),
    clerkUserId: "uid_1",
    apiKeyId: new ObjectId(),
    tool: "generate_life_shot",
    ok: true,
    latencyMs: 120,
    chargedUsd: 0.15,
    createdAt: new Date("2026-11-19T00:00:00Z"),
  });
  assert.equal(parsed.chargedUsd, 0.15);
  assert.equal(parsed.creditsCharged, undefined);
});

test("summarizeMcpToolCalls sums USD costs without float drift and converts legacy rows", () => {
  const summary = summarizeMcpToolCalls([
    { tool: "regenerate_frame", ok: true, chargedUsd: 0.15 },
    { tool: "regenerate_frame", ok: true, chargedUsd: 0.15 },
    { tool: "create_character", ok: true, chargedUsd: 0.3 },
    { tool: "create_character", ok: false, chargedUsd: 0 },
    // Legacy integer credit row (10 credits * $0.04 = $0.40)
    { tool: "generate_clip_video", ok: true, creditsCharged: 10 },
  ]);

  assert.equal(summary.total, 5);
  assert.equal(summary.costUsd, 1);
  assert.equal(summary.errorRate, 20);

  const byTool = new Map(summary.byTool.map((row) => [row.tool, row]));
  assert.deepEqual(byTool.get("regenerate_frame"), {
    tool: "regenerate_frame",
    calls: 2,
    errors: 0,
    costUsd: 0.3,
  });
  assert.deepEqual(byTool.get("create_character"), {
    tool: "create_character",
    calls: 2,
    errors: 1,
    costUsd: 0.3,
  });
  assert.deepEqual(byTool.get("generate_clip_video"), {
    tool: "generate_clip_video",
    calls: 1,
    errors: 0,
    costUsd: 0.4,
  });
});

test("videoBriefFields describes USD pricing instead of legacy credits", () => {
  const description = videoBriefFields.videoQualityTier.description ?? "";
  assert.match(description, /\$0\.10\/s/);
  assert.doesNotMatch(description, /credits\/s/i);
});
