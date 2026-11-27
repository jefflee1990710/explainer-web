import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasHeaderFlowStatus } from "./canvas-header-flow-status";
import { CanvasTopbar } from "./canvas-topbar";
import type { CanvasFlowHeaderStatus } from "./flow-header-status";

function status(
  partial: Pick<CanvasFlowHeaderStatus, "status" | "scope" | "current" | "total"> &
    Partial<CanvasFlowHeaderStatus>,
): CanvasFlowHeaderStatus {
  return {
    failedCount: 0,
    failures: [],
    ...partial,
  };
}

const topbarHandlers = {
  onSelectProject: () => {},
  onCreateProject: () => {},
  onRenameProject: () => {},
  onDeleteProject: () => {},
  onMoveProject: () => {},
  onCreateFolder: () => {},
  onRenameFolder: () => {},
  onDeleteFolder: () => {},
  onRunFlow: () => {},
  onStopFlow: () => {},
};

function renderTopbar(flowStatus: CanvasFlowHeaderStatus | null, locale = "en") {
  return renderToStaticMarkup(
    createElement(CanvasTopbar, {
      locale,
      projects: [],
      folders: [],
      activeProjectId: "canvas-1",
      activeTitle: "Untitled Canvas",
      saveStatus: "saved",
      creditUsd: 12,
      flowModelCount: 4,
      isFlowRunning: false,
      flowWaveProgress: null,
      flowStatus,
      ...topbarHandlers,
    }),
  );
}

function headerOf(html: string) {
  const headerEnd = html.indexOf("</header>");
  assert.ok(headerEnd > 0);
  return {
    header: html.slice(0, headerEnd),
    below: html.slice(headerEnd + "</header>".length),
  };
}

test("finished and running status sit centered in the header as white text", () => {
  const finished = renderTopbar(
    status({ status: "completed", scope: "flow", current: 2, total: 2 }),
  );
  const finishedParts = headerOf(finished);
  assert.match(finishedParts.header, />Saved</);
  assert.match(finishedParts.header, /Untitled Canvas/);
  assert.match(finishedParts.header, /justify-center/);
  assert.match(finishedParts.header, /text-white/);
  assert.match(finishedParts.header, /Flow finished 2\/2/);
  assert.doesNotMatch(finishedParts.header, /emerald|bg-\[#c6f24b\]\/12|border-emerald/);
  assert.doesNotMatch(finishedParts.below, /Flow finished|role="status"/);

  const running = renderTopbar(
    status({ status: "running", scope: "flow", current: 1, total: 4 }),
  );
  const runningParts = headerOf(running);
  assert.match(runningParts.header, /Flow running 1\/4/);
  assert.doesNotMatch(runningParts.header, /Flow running 2\/2/);
  assert.doesNotMatch(runningParts.below, /Flow running/);
});

test("other live states stay in the header and keep their counts", () => {
  const nodes = renderToStaticMarkup(
    createElement(CanvasHeaderFlowStatus, {
      isZh: false,
      status: status({
        status: "running",
        scope: "nodes",
        current: 3,
        total: 3,
        failedCount: 1,
        failures: [{ name: "Frame 2", error: "timeout" }],
      }),
    }),
  );
  assert.match(nodes, /3 running · 1 failed/);
  assert.match(nodes, /text-white/);
  assert.match(nodes, /aria-expanded="false"/);
  assert.doesNotMatch(nodes, /emerald|rose-200|timeout/);

  const failed = renderToStaticMarkup(
    createElement(CanvasHeaderFlowStatus, {
      isZh: false,
      status: status({
        status: "failed",
        scope: "flow",
        current: 2,
        total: 2,
        failedCount: 1,
        failures: [{ name: "Video 1" }],
      }),
    }),
  );
  assert.match(failed, /Flow finished · 1 failed/);

  const stopped = renderToStaticMarkup(
    createElement(CanvasHeaderFlowStatus, {
      isZh: false,
      status: status({ status: "stopped", scope: "flow", current: 1, total: 4 }),
    }),
  );
  assert.match(stopped, /Flow stopped/);
  assert.doesNotMatch(stopped, /1\/4/);
});

test("canvas name is plain text beside a separate list button", () => {
  const { header } = headerOf(renderTopbar(null));
  assert.match(header, />Untitled Canvas</);
  const opener = header.match(
    /<button(?=[^>]*title="Open or manage canvases")[^>]*>[\s\S]*?<\/button>/,
  );
  assert.ok(opener);
  assert.doesNotMatch(opener[0], /Untitled Canvas/);
  assert.match(opener[0], /lucide-chevron-down/);
});

test("an idle canvas keeps Saved and has no flow status", () => {
  const html = renderTopbar(null);
  const parts = headerOf(html);
  assert.match(parts.header, />Saved</);
  assert.doesNotMatch(html, /Flow finished|Flow running|role="status"/);
  assert.equal(
    renderToStaticMarkup(createElement(CanvasHeaderFlowStatus, { status: null, isZh: false })),
    "",
  );
});

test("Traditional Chinese running and finished labels stay in the header", () => {
  const running = renderTopbar(
    status({ status: "running", scope: "flow", current: 1, total: 3 }),
    "zh-Hant",
  );
  const runningParts = headerOf(running);
  assert.match(runningParts.header, /已自動儲存/);
  assert.match(runningParts.header, /流程執行中 1\/3/);
  assert.doesNotMatch(runningParts.below, /流程執行中/);

  const finished = renderTopbar(
    status({ status: "completed", scope: "flow", current: 2, total: 2 }),
    "zh-Hant",
  );
  assert.match(headerOf(finished).header, /流程已完成 2\/2/);
});
