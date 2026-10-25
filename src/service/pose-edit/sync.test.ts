import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { PoseEdit } from "@/model/pose-edit";
import type { PoseEditSyncDeps } from "@/service/pose-edit/sync";
import { failPoseEdit, refundFailedPoseEdit } from "@/service/pose-edit/sync";

type UpdateLog = { filter: Record<string, unknown>; update: Record<string, unknown> };

function editDoc(status: PoseEdit["status"], spendKey?: string): PoseEdit {
  const now = new Date("2026-10-25T00:00:00.000Z");
  return {
    _id: new ObjectId(),
    clerkUserId: "uid",
    sourceUrl: "https://cdn.example/source.jpg",
    wardrobe: {},
    aspect: "3:4",
    status,
    ...(spendKey ? { spendKey } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

function matches(doc: PoseEdit, filter: Record<string, unknown>) {
  if ("_id" in filter && !doc._id.equals(filter._id as ObjectId)) return false;
  if (typeof filter.status === "string" && doc.status !== filter.status) return false;
  if (!("spendKey" in filter)) return true;
  const expected = filter.spendKey;
  if (expected && typeof expected === "object") {
    const spec = expected as { $type?: string; $exists?: boolean };
    if ("$type" in spec) return typeof doc.spendKey === "string";
    if ("$exists" in spec) {
      return spec.$exists === false ? doc.spendKey === undefined : doc.spendKey !== undefined;
    }
    return false;
  }
  return doc.spendKey === expected;
}

function apply(doc: PoseEdit, update: Record<string, unknown>) {
  const next = { ...doc, wardrobe: { ...doc.wardrobe } };
  const record = next as unknown as Record<string, unknown>;
  const set = update.$set as Record<string, unknown> | undefined;
  if (set) {
    for (const [key, value] of Object.entries(set)) record[key] = value;
  }
  const unset = update.$unset as Record<string, unknown> | undefined;
  if (unset) {
    for (const key of Object.keys(unset)) delete record[key];
  }
  return next;
}

function memoryRows(initial: PoseEdit) {
  let doc = { ...initial, wardrobe: { ...initial.wardrobe } };
  const updates: UpdateLog[] = [];
  return {
    updates,
    current() {
      return doc;
    },
    async findOne(filter: object) {
      if (!matches(doc, filter as Record<string, unknown>)) return null;
      return { ...doc, wardrobe: { ...doc.wardrobe } };
    },
    async updateOne(filter: object, update: object) {
      const typedFilter = filter as Record<string, unknown>;
      const typedUpdate = update as Record<string, unknown>;
      updates.push({ filter: typedFilter, update: typedUpdate });
      if (!matches(doc, typedFilter)) return { modifiedCount: 0 };
      doc = apply(doc, typedUpdate);
      return { modifiedCount: 1 };
    },
  };
}

function harness(doc: PoseEdit, refundImpl: () => Promise<void>) {
  const rows = memoryRows(doc);
  const refunds: string[] = [];
  const deps: PoseEditSyncDeps = {
    rows: async () => rows,
    refund: async (_clerkUserId, _cost, spendKey) => {
      refunds.push(`${rows.current().status}:${spendKey}`);
      await refundImpl();
    },
  };
  return { rows, refunds, deps };
}

function assertStaysFailed(rows: ReturnType<typeof memoryRows>) {
  for (const entry of rows.updates) {
    const set = entry.update.$set as { status?: string } | undefined;
    assert.notEqual(set?.status, "pending");
    if (set && Object.prototype.hasOwnProperty.call(set, "spendKey")) {
      assert.equal(entry.filter.status, "failed");
      assert.deepEqual(entry.filter.spendKey, { $exists: false });
    }
    const unset = entry.update.$unset as Record<string, unknown> | undefined;
    assert.equal(unset?.error, undefined);
  }
}

test("failPoseEdit refunds once and leaves a failed row without its spend key", async () => {
  const doc = editDoc("pending", "spend-1");
  const { rows, refunds, deps } = harness(doc, async () => undefined);
  await failPoseEdit(doc._id, "改圖失敗", deps);
  assert.deepEqual(refunds, ["failed:spend-1"]);
  assert.equal(rows.current().status, "failed");
  assert.equal(rows.current().error, "改圖失敗");
  assert.equal(rows.current().spendKey, undefined);
  assertStaysFailed(rows);
});

test("failPoseEdit keeps the edit failed when the first refund throws", async () => {
  const doc = editDoc("pending", "spend-1");
  let calls = 0;
  const { rows, refunds, deps } = harness(doc, async () => {
    calls += 1;
    if (calls === 1) throw new Error("refund down");
  });
  await failPoseEdit(doc._id, "這張圖無法產生", deps);
  assert.deepEqual(refunds, ["failed:spend-1", "failed:spend-1"]);
  assert.equal(rows.current().status, "failed");
  assert.equal(rows.current().error, "這張圖無法產生");
  assert.equal(rows.current().spendKey, undefined);
  assertStaysFailed(rows);
});

test("failPoseEdit restores the spend key when the second refund throws", async () => {
  const doc = editDoc("pending", "spend-1");
  let calls = 0;
  const { rows, refunds, deps } = harness(doc, async () => {
    calls += 1;
    throw new Error(calls === 1 ? "refund down" : "refund again");
  });
  await assert.rejects(() => failPoseEdit(doc._id, "改圖失敗", deps), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, "refund again");
    return true;
  });
  assert.equal(refunds.length, 2);
  assert.equal(rows.current().status, "failed");
  assert.equal(rows.current().error, "改圖失敗");
  assert.equal(rows.current().spendKey, "spend-1");
  assertStaysFailed(rows);
});

test("refundFailedPoseEdit refunds a failed spend key once", async () => {
  const doc = editDoc("failed", "spend-1");
  doc.error = "改圖失敗";
  let refunds = 0;
  const rows = memoryRows(doc);
  const deps: PoseEditSyncDeps = {
    rows: async () => rows,
    refund: async () => {
      refunds += 1;
    },
  };
  await Promise.all([refundFailedPoseEdit(doc._id, deps), refundFailedPoseEdit(doc._id, deps)]);
  await refundFailedPoseEdit(doc._id, deps);
  assert.equal(refunds, 1);
  assert.equal(rows.current().status, "failed");
  assert.equal(rows.current().error, "改圖失敗");
  assert.equal(rows.current().spendKey, undefined);
});

test("refundFailedPoseEdit ignores pending and completed rows", async () => {
  for (const status of ["pending", "completed"] as const) {
    const doc = editDoc(status, "spend-1");
    let refunds = 0;
    const rows = memoryRows(doc);
    await refundFailedPoseEdit(doc._id, {
      rows: async () => rows,
      refund: async () => {
        refunds += 1;
      },
    });
    assert.equal(refunds, 0);
    assert.equal(rows.current().status, status);
    assert.equal(rows.current().spendKey, "spend-1");
    assert.equal(rows.updates.length, 0);
  }
});

test("refundFailedPoseEdit puts the spend key back when the refund throws", async () => {
  const doc = editDoc("failed", "spend-1");
  doc.error = "這張圖無法產生";
  const { rows, deps } = harness(doc, async () => {
    throw new Error("refund down");
  });
  await assert.rejects(() => refundFailedPoseEdit(doc._id, deps), /refund down/);
  assert.equal(rows.current().status, "failed");
  assert.equal(rows.current().error, "這張圖無法產生");
  assert.equal(rows.current().spendKey, "spend-1");
  assertStaysFailed(rows);
});
