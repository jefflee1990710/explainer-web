import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioHeaderCanvasLink } from "@/presentation/studio/studio-header-canvas-link";

test("header Canvas link opens /app/canvas with the Output button style", () => {
  const html = renderToStaticMarkup(createElement(StudioHeaderCanvasLink));
  assert.match(html, /href="\/app\/canvas"/);
  assert.match(html, />Canvas</);
  assert.match(html, /inline-flex h-9 items-center gap-1\.5 rounded-lg px-2\.5 text-sm font-semibold transition/);
  assert.match(html, /text-\[var\(--studio-muted\)\] hover:bg-\[var\(--studio-fill\)\] hover:text-\[var\(--studio-ink\)\]/);
  assert.doesNotMatch(html, /aria-current/);
});

test("Canvas sits beside Output and Tasks in the studio header", () => {
  const header = readFileSync(path.join(process.cwd(), "src/presentation/studio/studio-header.tsx"), "utf8");
  const canvas = header.indexOf("<StudioHeaderCanvasLink />");
  const output = header.indexOf('href="/app/output"');
  const tasks = header.indexOf("<TasksHoverMenu");
  assert.ok(canvas > 0 && canvas < output && output < tasks);
});
