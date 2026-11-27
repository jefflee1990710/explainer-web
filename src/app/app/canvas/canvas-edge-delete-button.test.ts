import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Position, ReactFlowProvider, type EdgeProps } from "@xyflow/react";
import { I18nProvider } from "@/presentation/components/i18n-provider";
import {
  CANVAS_EDGE_TYPES,
  CanvasEdgeDeleteButton,
  CanvasSelectableEdge,
  connectionDeleteControl,
} from "@/app/app/canvas/canvas-edge-delete-button";

test("a connection shows a delete button only while it is selected", () => {
  assert.equal(connectionDeleteControl({ selected: false, deletable: true }), "hidden");
  assert.equal(connectionDeleteControl({ selected: true, deletable: true }), "ready");
  assert.equal(connectionDeleteControl({ selected: true, deletable: false }), "locked");
});

test("the delete button names the action and can be disabled", () => {
  const ready = renderToStaticMarkup(
    createElement(CanvasEdgeDeleteButton, { isZh: true, disabled: false, onDelete: () => {} }),
  );
  assert.match(ready, /aria-label="刪除連線"/);
  assert.match(ready, /data-canvas-edge-delete/);
  assert.doesNotMatch(ready, /disabled/);

  const locked = renderToStaticMarkup(
    createElement(CanvasEdgeDeleteButton, { isZh: false, disabled: true, onDelete: () => {} }),
  );
  assert.match(locked, /aria-label="Cannot delete this connection"/);
  assert.match(locked, /disabled/);
});

test("selecting a connection keeps the existing bezier stroke", () => {
  const style = { stroke: "#38bdf8", strokeWidth: 2 };
  const idle = renderEdge({ selected: false, style });
  const picked = renderEdge({ selected: true, style });
  assert.match(idle, /#38bdf8/);
  assert.match(idle, /stroke-width:2/);
  assert.equal(edgePathMarkup(idle), edgePathMarkup(picked));
  assert.equal(CANVAS_EDGE_TYPES.default, CanvasSelectableEdge);
});

function renderEdge(patch: Partial<EdgeProps>): string {
  const props: EdgeProps = {
    id: "e1",
    source: "a",
    target: "b",
    sourceX: 10,
    sourceY: 20,
    targetX: 210,
    targetY: 20,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    selected: false,
    deletable: true,
    ...patch,
  };
  return renderToStaticMarkup(shell(createElement(CanvasSelectableEdge, props)));
}

function shell(child: ReactNode) {
  return createElement(ReactFlowProvider, {
    children: createElement(I18nProvider, { initialLocale: "zh-Hant", children: child }),
  });
}

function edgePathMarkup(html: string): string {
  const match = html.match(/<path[^>]*class="react-flow__edge-path"[^>]*>/);
  assert.ok(match, html);
  return match[0];
}
