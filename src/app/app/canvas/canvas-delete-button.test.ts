import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasDeleteButton } from "./canvas-delete-button";

test("the first look of the canvas trash button is the idle delete control", () => {
  const html = renderToStaticMarkup(
    createElement(CanvasDeleteButton, {
      armed: false,
      isZh: false,
      onArm: () => {},
      onConfirm: () => {},
    }),
  );
  assert.match(html, /title="Delete canvas"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /hover:text-rose-300/);
  assert.match(html, /data-canvas-delete/);
});

test("an armed canvas trash button asks for the second click", () => {
  const html = renderToStaticMarkup(
    createElement(CanvasDeleteButton, {
      armed: true,
      isZh: false,
      onArm: () => {},
      onConfirm: () => {},
    }),
  );
  assert.match(html, /title="Click again to delete"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /text-rose-200/);
  assert.doesNotMatch(html, /title="Delete canvas"/);
});
