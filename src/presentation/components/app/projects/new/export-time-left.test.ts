import assert from "node:assert/strict";
import test from "node:test";
import type { ExportPhase } from "@/presentation/components/app/projects/new/browser-video-export";
import {
  formatExportTimeLeft,
  overallExportRatio,
  rawExportSecondsLeft,
  smoothExportSecondsLeft,
} from "@/presentation/components/app/projects/new/export-time-left";

const phases: ExportPhase[] = ["encoder", "join", "save"];

test("overall progress counts finished stages plus the current one", () => {
  const halfway = overallExportRatio({ phases, phase: "join", ratio: 0.5 });
  assert.equal(Math.round(halfway * 100), 54);
  assert.equal(overallExportRatio({ phases, phase: "encoder", ratio: 0 }), 0);
  assert.equal(overallExportRatio({ phases, phase: "save", ratio: 1 }), 1);
});

test("remaining time waits for a real sample, then scales with progress", () => {
  assert.equal(rawExportSecondsLeft(500, 0.5), null);
  assert.equal(rawExportSecondsLeft(5000, 0.02), null);
  assert.equal(rawExportSecondsLeft(10_000, 0.5), 10);
  assert.equal(rawExportSecondsLeft(5000, 0.999), 0);
});

test("a new sample is blended into the previous estimate", () => {
  assert.equal(smoothExportSecondsLeft(null, 10), 10);
  assert.equal(smoothExportSecondsLeft(10, null), 10);
  assert.equal(smoothExportSecondsLeft(10, 20), 13.5);
});

test("the countdown is a clock", () => {
  assert.equal(formatExportTimeLeft(45), "0:45");
  assert.equal(formatExportTimeLeft(90), "1:30");
  assert.equal(formatExportTimeLeft(3661), "1:01:01");
});
