import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { AppUser } from "@/model/user";
import { FRAME_COST } from "@/service/credit-costs";
import { createPoseEdit } from "@/service/pose-edit/create";

test("createPoseEdit does not upload when credits are refused", async () => {
  let uploaded = false;
  const result = await createPoseEdit({
    user: { clerkUserId: "uid", credits: 0 } as AppUser,
    bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0x00),
    fields: { poseId: "standing-arms-relaxed" },
    deps: {
      assertCanSpend: async () => {
        throw new Error("credits 不足，請加購或升級方案");
      },
      upload: async () => {
        uploaded = true;
        return "https://cdn.example/source.jpg";
      },
      consume: async () => "spend",
      insert: async () => {
        throw new Error("insert should not run");
      },
      enqueue: async () => undefined,
      fail: async () => undefined,
      readSize: async () => ({ width: 300, height: 400 }),
    },
  });
  assert.deepEqual(result, { ok: false, status: 400, error: "credits 不足，請加購或升級方案" });
  assert.equal(uploaded, false);
});

test("createPoseEdit fails the edit once when enqueue throws", async () => {
  let fails = 0;
  let refunds = 0;
  const result = await createPoseEdit({
    user: { clerkUserId: "uid", credits: 4 } as AppUser,
    bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0x00),
    fields: { poseId: "standing-arms-relaxed" },
    deps: {
      assertCanSpend: async () => undefined,
      upload: async () => "https://cdn.example/source.jpg",
      consume: async () => "spend-1",
      insert: async (draft) => ({
        ...draft,
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      enqueue: async () => {
        throw new Error("queue down");
      },
      fail: async () => {
        fails += 1;
      },
      refund: async () => {
        refunds += 1;
      },
      readSize: async () => ({ width: 300, height: 400 }),
    },
  });
  assert.equal(fails, 1);
  assert.equal(refunds, 0);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.dto.status, "failed");
});

test("createPoseEdit refunds once when insert throws after consume", async () => {
  const refunds: Array<{ clerkUserId: string; cost: number; spendKey: string }> = [];
  const insertError = new Error("insert down");
  let fails = 0;
  let inserts = 0;
  await assert.rejects(
    () =>
      createPoseEdit({
        user: { clerkUserId: "uid", credits: 4 } as AppUser,
        bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0x00),
        fields: { poseId: "standing-arms-relaxed" },
        deps: {
          assertCanSpend: async () => undefined,
          upload: async () => "https://cdn.example/source.jpg",
          consume: async () => "spend-1",
          insert: async () => {
            inserts += 1;
            throw insertError;
          },
          enqueue: async () => {
            throw new Error("enqueue should not run");
          },
          fail: async () => {
            fails += 1;
          },
          refund: async (clerkUserId, cost, spendKey) => {
            refunds.push({ clerkUserId, cost, spendKey });
          },
          readSize: async () => ({ width: 300, height: 400 }),
        },
      }),
    (error: unknown) => error === insertError,
  );
  assert.equal(inserts, 1);
  assert.equal(fails, 0);
  assert.equal(FRAME_COST, 4);
  assert.deepEqual(refunds, [{ clerkUserId: "uid", cost: FRAME_COST, spendKey: "spend-1" }]);
});

test("createPoseEdit reports the spend key when the insert refund throws", async () => {
  const refunds: string[] = [];
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };
  const insertError = new Error("insert down");
  let inserts = 0;
  let fails = 0;
  try {
    await assert.rejects(
      () =>
        createPoseEdit({
          user: { clerkUserId: "uid", credits: 4 } as AppUser,
          bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0x00),
          fields: { poseId: "standing-arms-relaxed" },
          deps: {
            assertCanSpend: async () => undefined,
            upload: async () => "https://cdn.example/source.jpg",
            consume: async () => "spend-1",
            insert: async () => {
              inserts += 1;
              throw insertError;
            },
            enqueue: async () => {
              throw new Error("enqueue should not run");
            },
            fail: async () => {
              fails += 1;
            },
            refund: async (_clerkUserId, _cost, spendKey) => {
              refunds.push(spendKey);
              throw new Error("refund down");
            },
            readSize: async () => ({ width: 300, height: 400 }),
          },
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.notEqual(error, insertError);
        assert.match(error.message, /spend-1/);
        assert.match(error.message, /insert down/);
        return true;
      },
    );
  } finally {
    console.error = original;
  }
  assert.equal(inserts, 1);
  assert.equal(fails, 0);
  assert.deepEqual(refunds, ["spend-1"]);
  assert.equal(logged.length, 1);
  const payload = logged[0]?.[1] as { spendKey?: string; insertError?: Error; refundError?: Error };
  assert.equal(payload.spendKey, "spend-1");
  assert.equal(payload.insertError?.message, "insert down");
  assert.equal(payload.refundError?.message, "refund down");
});

test("createPoseEdit rejects an empty selection before the credit check", async () => {
  let checked = false;
  const result = await createPoseEdit({
    user: { clerkUserId: "uid", credits: 4 } as AppUser,
    bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0x00),
    fields: {},
    deps: {
      assertCanSpend: async () => {
        checked = true;
      },
      upload: async () => "https://cdn.example/source.jpg",
      consume: async () => "spend-1",
      insert: async () => {
        throw new Error("insert should not run");
      },
      enqueue: async () => undefined,
      fail: async () => undefined,
      readSize: async () => ({ width: 300, height: 400 }),
    },
  });
  assert.deepEqual(result, { ok: false, status: 400, error: "請選姿勢或至少一件衣服" });
  assert.equal(checked, false);
});
