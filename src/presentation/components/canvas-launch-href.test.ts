import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANVAS_PUBLIC_TEMPLATES,
  canvasLaunchHref,
} from "@/presentation/components/canvas-launch-href";
import { isCanvasStarterTemplateId } from "@/service/canvas/core/templates";

describe("canvasLaunchHref & public template metadata", () => {
  it("routes signed-in users directly to /app/canvas with optional template", () => {
    assert.equal(canvasLaunchHref(true), "/app/canvas");
    assert.equal(
      canvasLaunchHref(true, "talking-head"),
      "/app/canvas?template=talking-head",
    );
  });

  it("routes signed-out users via /sign-up?next=... preserving template query", () => {
    assert.equal(canvasLaunchHref(false), "/sign-up?next=%2Fapp%2Fcanvas");
    assert.equal(
      canvasLaunchHref(false, "explainer"),
      "/sign-up?next=%2Fapp%2Fcanvas%3Ftemplate%3Dexplainer",
    );
  });

  it("covers all 6 starter templates without exposing ComfyUI, OpenCut, or FFmpeg jargon", () => {
    assert.equal(CANVAS_PUBLIC_TEMPLATES.length, 6);
    for (const tpl of CANVAS_PUBLIC_TEMPLATES) {
      assert.equal(isCanvasStarterTemplateId(tpl.id), true);
      const visibleCopy = JSON.stringify({
        badge: tpl.badge,
        title: tpl.title,
        description: tpl.description,
        steps: tpl.steps,
        aiPromptExample: tpl.aiPromptExample,
      });
      assert.doesNotMatch(visibleCopy, /comfy|opencut|ffmpeg|multi-track/i);
    }
  });
});
