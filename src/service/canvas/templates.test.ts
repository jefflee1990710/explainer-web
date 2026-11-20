import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeExecutionWaves, validateEdgeConnection } from "@/service/canvas/graph";
import { STATIC_CANVAS_MODELS, findCanvasModel } from "@/service/canvas/model-catalog";
import {
  CANVAS_STARTER_TEMPLATES,
  instantiateCanvasTemplate,
  isCanvasStarterTemplateId,
} from "@/service/canvas/templates";

describe("canvas starter templates", () => {
  it("exposes 6 curated starter templates with valid models, edges, and execution waves", () => {
    assert.equal(CANVAS_STARTER_TEMPLATES.length, 6);
    assert.deepEqual(
      CANVAS_STARTER_TEMPLATES.map((t) => t.id),
      [
        "talking-head",
        "explainer",
        "scro-swap",
        "teleport",
        "ffmpeg-reel",
        "text-image-video",
      ],
    );
    assert.equal(isCanvasStarterTemplateId("talking-head"), true);
    assert.equal(isCanvasStarterTemplateId("unknown-tpl"), false);

    for (const template of CANVAS_STARTER_TEMPLATES) {
      const { nodes, edges } = instantiateCanvasTemplate(template.id, `test-${template.id}`);
      assert.ok(nodes.length >= 2, `${template.id} should contain at least 2 nodes`);
      assert.ok(edges.length >= 1, `${template.id} should contain at least 1 edge`);

      for (const node of nodes) {
        if (node.type === "model") {
          const spec = findCanvasModel(node.data.modelId || "", STATIC_CANVAS_MODELS);
          assert.ok(spec, `template ${template.id} references unknown model ${node.data.modelId}`);
          assert.ok(
            spec.provider === "openrouter" || spec.provider === "scro" || spec.provider === "ffmpeg",
            `unexpected provider ${spec.provider}`,
          );
          if (node.data.presetId) {
            assert.ok(
              spec.presets.includes(node.data.presetId),
              `template ${template.id} preset ${node.data.presetId} invalid for ${spec.id}`,
            );
          }
        }
      }

      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i]!;
        const verdict = validateEdgeConnection(
          nodes,
          edges.slice(0, i),
          edge,
          STATIC_CANVAS_MODELS,
        );
        assert.equal(verdict.valid, true, `template ${template.id} edge ${edge.id} invalid: ${!verdict.valid ? verdict.reason : ""}`);
      }

      const waves = computeExecutionWaves(nodes, edges);
      assert.ok(waves.length >= 1, `template ${template.id} should resolve to >= 1 wave`);
    }
  });
});
