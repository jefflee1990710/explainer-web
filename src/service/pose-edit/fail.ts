import type { ObjectId } from "mongodb";

export function poseEditShouldRefund(modifiedCount: number) {
  return modifiedCount === 1;
}

export function poseEditFailureFilter(id: ObjectId) {
  return { _id: id, status: "pending" as const, spendKey: { $type: "string" as const } };
}
