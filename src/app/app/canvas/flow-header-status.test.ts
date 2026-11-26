import assert from "node:assert/strict";
import test from "node:test";
import { deriveCanvasFlowHeaderStatus, type FlowHeaderNode } from "./flow-header-status";

function node(id: string, status: string, lastError?: string): FlowHeaderNode {
  return {
    id,
    type: "model",
    data: { label: id, status, ...(lastError ? { lastError } : {}) },
  };
}

const base = {
  models: [],
  locale: "en",
  wave: { current: 4, total: 4 },
  runFailureIds: [] as string[],
};

test("finished flow pill follows cards that are still failed", () => {
  const status = deriveCanvasFlowHeaderStatus({
    ...base,
    nodes: [node("a", "failed", "timeout"), node("b", "completed"), node("c", "failed", "refunded")],
    isFlowRunning: false,
    settled: "finished",
  });
  assert.equal(status?.status, "failed");
  assert.equal(status?.scope, "flow");
  assert.equal(status?.failedCount, 2);
  assert.deepEqual(
    status?.failures.map((failure) => failure.name),
    ["a", "c"],
  );
});

test("pill turns finished once every failed card has recovered", () => {
  const status = deriveCanvasFlowHeaderStatus({
    ...base,
    nodes: [node("a", "completed"), node("b", "completed")],
    isFlowRunning: false,
    settled: "finished",
  });
  assert.equal(status?.status, "completed");
  assert.equal(status?.failedCount, 0);
});

test("a card retry replaces the finished summary with the live running count", () => {
  const status = deriveCanvasFlowHeaderStatus({
    ...base,
    nodes: [node("a", "running"), node("b", "failed", "old"), node("c", "queued")],
    isFlowRunning: false,
    settled: "finished",
  });
  assert.equal(status?.status, "running");
  assert.equal(status?.scope, "nodes");
  assert.equal(status?.current, 2);
  assert.equal(status?.failedCount, 1);
  assert.equal(status?.failures[0]?.error, "old");
});

test("an active flow reports this run's failures, not leftover card failures", () => {
  const status = deriveCanvasFlowHeaderStatus({
    ...base,
    nodes: [node("a", "failed", "previous"), node("b", "queued")],
    isFlowRunning: true,
    settled: null,
    wave: { current: 1, total: 4 },
    runFailureIds: [],
  });
  assert.equal(status?.status, "running");
  assert.equal(status?.scope, "flow");
  assert.equal(status?.current, 1);
  assert.equal(status?.failedCount, 0);
});

test("an active flow lists failures recorded by this run", () => {
  const status = deriveCanvasFlowHeaderStatus({
    ...base,
    nodes: [node("a", "failed", "this run"), node("b", "running")],
    isFlowRunning: true,
    settled: null,
    wave: { current: 2, total: 4 },
    runFailureIds: ["a"],
  });
  assert.equal(status?.failedCount, 1);
  assert.equal(status?.failures[0]?.error, "this run");
});

test("stop keeps the cards that are still failed", () => {
  const status = deriveCanvasFlowHeaderStatus({
    ...base,
    nodes: [node("a", "failed", "stopped mid-run"), node("b", "idle")],
    isFlowRunning: false,
    settled: "stopped",
  });
  assert.equal(status?.status, "stopped");
  assert.equal(status?.failedCount, 1);
  assert.equal(status?.failures[0]?.error, "stopped mid-run");
});

test("stop with no remaining failures shows stopped", () => {
  const status = deriveCanvasFlowHeaderStatus({
    ...base,
    nodes: [node("a", "completed"), node("b", "idle")],
    isFlowRunning: false,
    settled: "stopped",
  });
  assert.equal(status?.status, "stopped");
});

test("a failed card with no flow yet still shows the current failure", () => {
  const status = deriveCanvasFlowHeaderStatus({
    ...base,
    nodes: [node("a", "failed", "credit")],
    isFlowRunning: false,
    settled: null,
    wave: null,
  });
  assert.equal(status?.status, "failed");
  assert.equal(status?.scope, "nodes");
  assert.equal(status?.failedCount, 1);
});

test("an untouched canvas has no flow pill", () => {
  const status = deriveCanvasFlowHeaderStatus({
    ...base,
    nodes: [node("a", "idle"), { id: "media", type: "media", data: {} }],
    isFlowRunning: false,
    settled: null,
    wave: null,
  });
  assert.equal(status, null);
});
