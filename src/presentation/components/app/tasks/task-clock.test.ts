import assert from "node:assert/strict";
import { test } from "node:test";
import { formatElapsed, taskElapsedMs } from "@/presentation/components/app/tasks/task-clock";

test("elapsed time runs until now while the task is active", () => {
  const ms = taskElapsedMs(
    "2026-09-30T12:00:00.000Z",
    "2026-09-30T12:00:10.000Z",
    false,
    Date.parse("2026-09-30T12:01:05.000Z"),
  );
  assert.equal(ms, 65_000);
  assert.equal(formatElapsed(ms), "1 分 05 秒");
});

test("elapsed time stops at the settle time once the task is done", () => {
  const ms = taskElapsedMs(
    "2026-09-30T12:00:00.000Z",
    "2026-09-30T12:04:02.000Z",
    true,
    Date.parse("2026-09-30T13:00:00.000Z"),
  );
  assert.equal(ms, 242_000);
  assert.equal(formatElapsed(ms), "4 分 02 秒");
});

test("elapsed time includes hours and never goes negative", () => {
  assert.equal(formatElapsed(3_662_000), "1 小時 1 分 02 秒");
  assert.equal(formatElapsed(-500), "0 秒");
  assert.equal(
    taskElapsedMs("2026-09-30T12:00:10.000Z", "2026-09-30T12:00:00.000Z", false, Date.parse("2026-09-30T12:00:00.000Z")),
    0,
  );
});
