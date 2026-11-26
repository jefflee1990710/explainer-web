import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasFlowStatusBar } from "./canvas-flow-status-bar";
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
      activeTitle: "Launch canvas",
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

test("flow status leaves the header and renders under it", () => {
  const html = renderTopbar(
    status({ status: "completed", scope: "flow", current: 2, total: 5 }),
  );
  const headerEnd = html.indexOf("</header>");
  assert.ok(headerEnd > 0);
  const header = html.slice(0, headerEnd);
  const below = html.slice(headerEnd + "</header>".length);
  assert.match(header, />Saved</);
  assert.doesNotMatch(header, /Flow finished|Flow running|Flow stopped/);
  assert.match(below, /^<div role="status"/);
  assert.match(below, /data-flow-status="completed"/);
  assert.match(below, /Flow finished 2\/5/);
  assert.match(below, /text-emerald-200/);
  assert.match(below, /lucide-check/);
  assert.doesNotMatch(below, /rounded-full/);
});

test("in-progress, failed, stopped, and node states use live counts", () => {
  const running = renderToStaticMarkup(
    createElement(CanvasFlowStatusBar, {
      isZh: false,
      status: status({ status: "running", scope: "flow", current: 2, total: 7 }),
    }),
  );
  assert.match(running, /Flow running 2\/7/);
  assert.match(running, /animate-spin/);
  assert.match(running, /data-flow-status="running"/);
  assert.doesNotMatch(running, /4\/4/);

  const nodes = renderToStaticMarkup(
    createElement(CanvasFlowStatusBar, {
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
  assert.match(nodes, /aria-expanded="false"/);
  assert.doesNotMatch(nodes, /timeout/);

  const failed = renderToStaticMarkup(
    createElement(CanvasFlowStatusBar, {
      isZh: false,
      status: status({
        status: "failed",
        scope: "flow",
        current: 4,
        total: 4,
        failedCount: 2,
        failures: [{ name: "A" }, { name: "B" }],
      }),
    }),
  );
  assert.match(failed, /Flow finished · 2 failed/);
  assert.match(failed, /text-rose-200/);

  const cardFailed = renderToStaticMarkup(
    createElement(CanvasFlowStatusBar, {
      isZh: false,
      status: status({
        status: "failed",
        scope: "nodes",
        current: 0,
        total: 0,
        failedCount: 1,
        failures: [{ name: "Voice" }],
      }),
    }),
  );
  assert.match(cardFailed, />1 failed</);

  const stopped = renderToStaticMarkup(
    createElement(CanvasFlowStatusBar, {
      isZh: false,
      status: status({ status: "stopped", scope: "flow", current: 1, total: 4 }),
    }),
  );
  assert.match(stopped, /Flow stopped/);
  assert.doesNotMatch(stopped, /1\/4/);

  const stoppedFailed = renderToStaticMarkup(
    createElement(CanvasFlowStatusBar, {
      isZh: true,
      status: status({
        status: "stopped",
        scope: "flow",
        current: 1,
        total: 4,
        failedCount: 1,
        failures: [{ name: "影片 1" }],
      }),
    }),
  );
  assert.match(stoppedFailed, /流程已停止 · 1 個失敗/);
});

test("an idle canvas renders no status bar", () => {
  const html = renderTopbar(null);
  assert.match(html, />Saved</);
  assert.doesNotMatch(html, /data-flow-status|Flow finished|Flow running/);
  assert.equal(
    renderToStaticMarkup(createElement(CanvasFlowStatusBar, { status: null, isZh: false })),
    "",
  );
});

test("Traditional Chinese labels stay on the bar", () => {
  const html = renderTopbar(
    status({ status: "running", scope: "flow", current: 1, total: 3 }),
    "zh-Hant",
  );
  const header = html.slice(0, html.indexOf("</header>"));
  assert.match(header, /已自動儲存/);
  assert.doesNotMatch(header, /流程執行中/);
  assert.match(html, /流程執行中 1\/3/);
});
