import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeExecutionWaves, validateEdgeConnection } from "@/service/canvas/graph";
import { STATIC_CANVAS_MODELS, findCanvasModel } from "@/service/canvas/model-catalog";
import {
  CANVAS_STARTER_TEMPLATES,
  instantiateCanvasTemplate,
} from "@/service/canvas/templates";

describe("canvas starter templates", () => {
  it("exposes 3 curated starter templates with valid models, edges, and execution waves", () => {
    assert.equal(CANVAS_STARTER_TEMPLATES.length, 3);

    for (const template of CANVAS_STARTER_TEMPLATES) {
      const { nodes, edges } = instantiateCanvasTemplate(template.id, `test-${template.id}`);
      assert.ok(nodes.length >= 2, `${template.id} should contain at least 2 nodes`);
      assert.ok(edges.length >= 1, `${template.id} should contain at least 1 edge`);

      // Verify every model node points to an existing catalog model & valid preset.
      for (const node of nodes) {
        if (node.type === "model") {
          const spec = findCanvasModel(node.data.modelId || "", STATIC_CANVAS_MODELS);
          assert.ok(spec, `template ${template.id} references unknown model ${node.data.modelId}`);
          assert.equal(spec.provider, "openrouter");
          if (node.data.presetId) {
            assert.ok(
              spec.presets.includes(node.data.presetId),
              `template ${template.id} preset ${node.data.presetId} invalid for ${spec.id}`,
            );
          }
        }
      }

      // Verify every edge validates cleanly against preceding edges.
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i]!;
        const verdict = validateEdgeConnection(
          nodes,
          edges.slice(0, i),
          edge,
          STATIC_CANVAS_MODELS,
        );
        assert.equal(verdict.valid, true, `template ${template.id} edge ${edge.id} invalid`);
      }

      // Verify Kahn topological wave planner produces 2 sequential waves for each 2-stage chain.
      const waves = computeExecutionWaves(nodes, edges);
      assert.equal(waves.length, 2, `template ${template.id} should resolve to 2 waves`);
      assert.equal(waves[0]?.length, 1);
      assert.equal(waves[1]?.length, 1);
    }
  });
});
