import type { ObjectId } from "mongodb";

export function poseEditShouldRefund(modifiedCount: number) {
  return modifiedCount === 1;
}

export function poseEditFailureFilter(id: ObjectId) {
  return { _id: id, status: "pending" as const, spendKey: { $type: "string" as const } };
}

// A failed row can be refunded only while its original spend key is still stored.
export function poseEditFailedSpendQuery(id: ObjectId) {
  return { _id: id, status: "failed" as const, spendKey: { $type: "string" as const } };
}

// Unset that exact key. A second caller loses the claim and must not refund again.
export function poseEditFailedSpendFilter(id: ObjectId, spendKey: string) {
  return { _id: id, status: "failed" as const, spendKey };
}

// Put the key back only on a failed row that no longer has one. Never return it to pending.
export function poseEditRefundRestoreFilter(id: ObjectId) {
  return { _id: id, status: "failed" as const, spendKey: { $exists: false as const } };
}

// Pending and completed rows are not refunded from a read.
export function poseEditStillNeedsRefund(edit: { status: string; spendKey?: string }) {
  return edit.status === "failed" && typeof edit.spendKey === "string" && edit.spendKey.length > 0;
}
