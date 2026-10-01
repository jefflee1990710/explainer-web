import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { frameJobDocs, WAIT_FOR_START } from "@/service/generation/frame-jobs";

test("frameJobDocs queues the start now and parks the end until the start lands", () => {
  const projectId = new ObjectId();
  const now = new Date("2026-09-28T12:00:00.000Z");
  const docs = frameJobDocs(
    projectId,
    [{ clipNumber: 3, position: "start" }],
    [{ clipNumber: 3, position: "end" }],
    now,
  );
  assert.equal(docs.length, 2);
  assert.deepEqual(
    docs.map((doc) => `${doc.clipIndex}:${doc.framePosition}:${doc.awaits ?? "-"}`),
    ["2:start:-", "2:end:start"],
  );
  assert.equal(docs[0].nextAttemptAt, now);
  assert.equal(docs[1].nextAttemptAt, WAIT_FOR_START);
});

test("frameJobDocs parks a later start until the previous end lands", () => {
  const docs = frameJobDocs(
    new ObjectId(),
    [{ clipNumber: 1, position: "start" }],
    [
      { clipNumber: 1, position: "end" },
      { clipNumber: 2, position: "start" },
    ],
  );
  assert.deepEqual(
    docs.map((doc) => `${doc.clipIndex}:${doc.framePosition}:${doc.awaits ?? "-"}`),
    ["0:start:-", "0:end:start", "1:start:prev-end"],
  );
});

test("frameJobDocs with a start file already present sends both immediately", () => {
  const docs = frameJobDocs(
    new ObjectId(),
    [
      { clipNumber: 1, position: "start" },
      { clipNumber: 1, position: "end" },
    ],
    [],
  );
  assert.equal(docs.length, 2);
  assert.ok(docs.every((doc) => doc.awaits === undefined));
});
