import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SCRO_SWAP_STANDALONE_SKILL_SLUG,
  TELEPORT_STANDALONE_SKILL_SLUG,
} from "@/service/opencut/standalone-engine-slugs";
import {
  inferVideoUseCaseFromSkillSlug,
  resolveVideoRestartTarget,
} from "@/service/video/restart-target";

describe("resolveVideoRestartTarget", () => {
  it("redirects Scro Swap standalone videos back to /app/scroswap", () => {
    assert.deepEqual(
      resolveVideoRestartTarget({ skillSlug: SCRO_SWAP_STANDALONE_SKILL_SLUG }),
      { kind: "redirect", href: "/app/scroswap" },
    );
  });

  it("redirects Teleport standalone videos back to /app/teleport", () => {
    assert.deepEqual(
      resolveVideoRestartTarget({ skillSlug: TELEPORT_STANDALONE_SKILL_SLUG }),
      { kind: "redirect", href: "/app/teleport" },
    );
  });

  it("reopens the matching use-case form for explainer and talking-head videos", () => {
    assert.deepEqual(
      resolveVideoRestartTarget({ skillSlug: "talking-head-director" }),
      { kind: "form", useCase: "talking-head" },
    );
    assert.deepEqual(
      resolveVideoRestartTarget({ skillSlug: "paper-cutout-explainer-video-director" }),
      { kind: "form", useCase: "explainer" },
    );
    assert.deepEqual(
      resolveVideoRestartTarget({ skillSlug: "cartoon-explainer-video-director" }),
      { kind: "form", useCase: "explainer" },
    );
  });

  it("reopens the full studio form for general studio directors", () => {
    assert.deepEqual(
      resolveVideoRestartTarget({ skillSlug: "dialogue-qa-director" }),
      { kind: "form", useCase: undefined },
    );
    assert.equal(inferVideoUseCaseFromSkillSlug("dialogue-qa-director"), undefined);
  });
});
