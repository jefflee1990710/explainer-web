import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSelfSyncingJobKind,
  isStandalonePolledJobKind,
  isVideoLockJobKind,
  SELF_SYNCING_JOB_KINDS,
  STANDALONE_POLLED_JOB_KINDS,
} from "@/service/generation/job-registry";
import type { GenerationKind } from "@/model/generation-job";

describe("generation job registry classifications", () => {
  it("classifies self-syncing job kinds vs project pipeline job kinds", () => {
    for (const kind of SELF_SYNCING_JOB_KINDS) {
      assert.equal(isSelfSyncingJobKind(kind), true, `${kind} should be self-syncing`);
    }
    const pipelineKinds: GenerationKind[] = [
      "still",
      "frame",
      "video",
      "objectSheet",
      "backgroundPlate",
    ];
    for (const kind of pipelineKinds) {
      assert.equal(isSelfSyncingJobKind(kind), false, `${kind} should not be self-syncing`);
    }
  });

  it("excludes subtitlePlate from standalone poll list because it refreshes with project jobs", () => {
    assert.equal(isStandalonePolledJobKind("subtitlePlate"), false);
    for (const kind of STANDALONE_POLLED_JOB_KINDS) {
      assert.equal(isStandalonePolledJobKind(kind), true);
    }
  });

  it("identifies video lock kinds accurately", () => {
    assert.equal(isVideoLockJobKind("objectSheet"), true);
    assert.equal(isVideoLockJobKind("backgroundPlate"), true);
    assert.equal(isVideoLockJobKind("frame"), false);
    assert.equal(isVideoLockJobKind("video"), false);
  });
});
