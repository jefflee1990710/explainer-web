import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { toPoseEditDto } from "@/service/pose-edit/dto";
import { poseEditFailureFilter, poseEditShouldRefund } from "@/service/pose-edit/fail";
import type { PoseEdit } from "@/model/pose-edit";

test("toPoseEditDto hides the spend key and uses the result only when completed", () => {
  const createdAt = new Date("2026-10-25T00:00:00.000Z");
  const edit: PoseEdit = {
    _id: new ObjectId(),
    clerkUserId: "uid",
    sourceUrl: "https://cdn.example/source.jpg",
    poseId: "standing-arms-relaxed",
    wardrobe: { top: "alredscoopdress" },
    aspect: "3:4",
    status: "pending",
    spendKey: "spend-1",
    createdAt,
    updatedAt: createdAt,
  };
  const dto = toPoseEditDto(edit);
  assert.equal(dto.status, "pending");
  assert.equal(dto.resultUrl, undefined);
  assert.equal("spendKey" in dto, false);
  assert.equal("aspect" in dto, false);
  assert.equal(dto.createdAt, "2026-10-25T00:00:00.000Z");
});

test("poseEditShouldRefund is true only for the update that cleared spendKey", () => {
  assert.equal(poseEditShouldRefund(1), true);
  assert.equal(poseEditShouldRefund(0), false);
  const id = new ObjectId();
  assert.deepEqual(poseEditFailureFilter(id), {
    _id: id,
    status: "pending",
    spendKey: { $type: "string" },
  });
});
