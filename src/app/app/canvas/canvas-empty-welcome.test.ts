import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasEmptyWelcome, showEmptyCanvasWelcome } from "./canvas-empty-welcome";
import { toDomainNodes, type FlowNode } from "@/app/app/canvas/workspace/canvas-graph-state";

const failedUpload: FlowNode = {
  id: "bad",
  type: "media",
  position: { x: 0, y: 0 },
  data: { mediaKind: "image", fileName: "shot.png", mediaUpload: { phase: "failed", error: "nope" } },
};

test("the welcome is only for a canvas with no nodes", () => {
  assert.equal(showEmptyCanvasWelcome(0), true);
  assert.equal(showEmptyCanvasWelcome(1), false);
});

test("a failed upload card hides the welcome even though it is left out of the saved graph", () => {
  assert.equal(toDomainNodes([failedUpload]).length, 0);
  assert.equal(showEmptyCanvasWelcome(1), false);

  const html = renderToStaticMarkup(
    createElement(CanvasEmptyWelcome, {
      nodeCount: 1,
      isZh: false,
      onApplyTemplate: () => {},
    }),
  );
  assert.equal(html, "");
});

test("an empty canvas still shows the welcome copy and try buttons", () => {
  const html = renderToStaticMarkup(
    createElement(CanvasEmptyWelcome, {
      nodeCount: 0,
      isZh: false,
      onApplyTemplate: () => {},
    }),
  );
  assert.match(html, /Build Your AI Visual Workflow/);
  assert.match(html, /Drop local images\/videos onto the canvas/);
  assert.match(html, /Try: Talking Head Director/);
  assert.match(html, /Try: AI Explainer/);
  assert.match(html, /Try: Text → Image → Video/);
});
