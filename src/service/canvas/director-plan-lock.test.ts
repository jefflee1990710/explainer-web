import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { directorPlanningLocks } from "@/service/canvas/director-plan-lock";

function director(id: string, modelId: string, planStatus?: string) {
  return {
    id,
    type: "model",
    data: {
      modelId,
      toolParams: { plannerMode: true, ...(planStatus ? { planStatus } : {}) },
    },
  };
}

describe("directorPlanningLocks", () => {
  const groups = [
    { id: "g1", memberIds: ["dir", "frame", "video"] },
    { id: "g2", memberIds: ["other"] },
  ];

  it("locks every row except the Director while a plan is in progress", () => {
    const locks = directorPlanningLocks(
      [director("dir", "scro:explainer", "planning"), { id: "frame", type: "model", data: {} }, { id: "video", type: "model", data: {} }],
      groups,
    );
    assert.deepEqual([...locks.nodeIds], ["frame", "video"]);
    assert.deepEqual([...locks.groupIds], ["g1"]);
  });

  it("locks Talking Head rows the same way", () => {
    const locks = directorPlanningLocks(
      [director("dir", "scro:talking-head", "planning"), { id: "frame", type: "model", data: {} }],
      [{ id: "g1", memberIds: ["dir", "frame"] }],
    );
    assert.deepEqual([...locks.nodeIds], ["frame"]);
  });

  it("unlocks once the plan is ready or has failed", () => {
    for (const status of ["planned", "failed", undefined]) {
      const locks = directorPlanningLocks([director("dir", "scro:explainer", status)], groups);
      assert.equal(locks.nodeIds.size, 0);
      assert.equal(locks.groupIds.size, 0);
    }
  });
});
