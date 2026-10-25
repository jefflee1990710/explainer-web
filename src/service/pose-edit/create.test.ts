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
  let fails = 0;
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
            throw new Error("insert down");
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
    /insert down/,
  );
  assert.equal(fails, 0);
  assert.equal(FRAME_COST, 4);
  assert.deepEqual(refunds, [{ clerkUserId: "uid", cost: FRAME_COST, spendKey: "spend-1" }]);
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
