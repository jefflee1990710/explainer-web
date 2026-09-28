import assert from "node:assert/strict";
import { test } from "node:test";
import { notifyTasksChanged, subscribeTaskChanges } from "@/presentation/components/app/tasks/task-signal";

test("notifyTasksChanged reaches every live subscriber and none after unsubscribe", () => {
  let hits = 0;
  const off = subscribeTaskChanges(() => {
    hits += 1;
  });
  notifyTasksChanged();
  assert.equal(hits, 1);
  off();
  notifyTasksChanged();
  assert.equal(hits, 1);
});
