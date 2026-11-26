import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { FFMPEG_STATIC_MODELS } from "@/service/canvas/catalog/ffmpeg-models";
import { STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { buildCanvasAgentSystemPrompt } from "@/service/canvas-agent/prompt";
import { CANVAS_AGENT_TOOL_HANDLERS as H } from "@/service/canvas-agent/tools";
import { agentToolParamKeys, createWorkingGraph } from "@/service/canvas-agent/working-graph";

function graph() {
  let i = 0;
  return createWorkingGraph({ nodes: [], edges: [], catalog: STATIC_CANVAS_MODELS, assets: [], nextId: () => `n${++i}` });
}

// Every toolParams key the FFmpeg worker reads, scraped from the execution sources.
function keysReadByWorker(): string[] {
  const dir = path.join(process.cwd(), "src/service/canvas/execution");
  const keys = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.startsWith("ffmpeg-") && !f.endsWith(".test.ts"))) {
    for (const m of readFileSync(path.join(dir, file), "utf8").matchAll(/"(ffmpeg[A-Z][A-Za-z]+|gradeLook)"/g)) {
      keys.add(m[1]!);
    }
  }
  return [...keys];
}

describe("FFmpeg edit node allowlist", () => {
  it("every FFmpeg spec declares its toolParams and an agent hint", () => {
    for (const spec of FFMPEG_STATIC_MODELS) {
      assert.ok(Array.isArray(spec.toolParams), `${spec.id} toolParams`);
      assert.ok(spec.agentHint, `${spec.id} agentHint`);
    }
  });

  it("every key the worker reads is settable on some FFmpeg node", () => {
    const declared = new Set(FFMPEG_STATIC_MODELS.flatMap((s) => (s.toolParams ?? []).map((p) => p.key)));
    for (const key of keysReadByWorker()) assert.ok(declared.has(key), `${key} is read by the worker but not declared`);
  });

  it("every key named in the system prompt is accepted by update_node", () => {
    const g = graph();
    const prompt = buildCanvasAgentSystemPrompt({ language: "en", graph: g });
    for (const spec of FFMPEG_STATIC_MODELS) {
      const line = prompt.split("\n").find((l) => l.includes(`"${spec.id}"`));
      assert.ok(line, `${spec.id} listed in prompt`);
      const allowed = new Set(agentToolParamKeys(g, spec.id));
      for (const m of line!.matchAll(/(ffmpeg[A-Z][A-Za-z]+|gradeLook) \(/g)) assert.ok(allowed.has(m[1]!), `${spec.id}.${m[1]}`);
    }
  });

  it("update_node sets each declared key and rejects unknown or out-of-range values", () => {
    const g = graph();
    const trim = H.add_model_node(g, { modelId: "ffmpeg:trim-speed" });
    assert.ok("nodeId" in trim);
    const id = (trim as { nodeId: string }).nodeId;
    assert.ok(!("error" in H.update_node(g, { nodeId: id, toolParams: { ffmpegStartSec: 2, ffmpegEndSec: 6, ffmpegSpeed: 1.5 } })));
    assert.deepEqual(g.nodes.find((n) => n.id === id)?.data.toolParams?.ffmpegEndSec, 6);
    const unknown = H.update_node(g, { nodeId: id, toolParams: { ffmpegRanges: "0-3" } });
    assert.match(String((unknown as { error?: string }).error), /ffmpegStartSec/);
    const range = H.update_node(g, { nodeId: id, toolParams: { ffmpegSpeed: 9 } });
    assert.ok("error" in range);

    const crop = (H.add_model_node(g, { modelId: "ffmpeg:crop" }) as { nodeId: string }).nodeId;
    assert.ok(!("error" in H.update_node(g, { nodeId: crop, toolParams: { ffmpegCropMode: "custom", ffmpegCropW: 320 } })));
    assert.ok("error" in H.update_node(g, { nodeId: crop, toolParams: { ffmpegCropMode: "zoom" } }));
  });
});
