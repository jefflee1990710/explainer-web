import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferUxEventCategory, sanitizeUxParams } from "@/model/ux-event";
import {
  buildRetrospectiveFunnel,
  classifyUserStuckStage,
  type UserJourneySnapshot,
} from "@/service/analytics/ux-classifier";

describe("UX Event Model & Sanitizer", () => {
  it("infers event category from event prefix or name", () => {
    assert.equal(inferUxEventCategory("page_view"), "navigation");
    assert.equal(inferUxEventCategory("sign_up"), "auth");
    assert.equal(inferUxEventCategory("legal_accepted"), "onboarding");
    assert.equal(inferUxEventCategory("character_created"), "character");
    assert.equal(inferUxEventCategory("wardrobe_item_created"), "wardrobe");
    assert.equal(inferUxEventCategory("life_shot_submitted"), "life");
    assert.equal(inferUxEventCategory("video_storyboard_generated"), "video");
    assert.equal(inferUxEventCategory("opencut_editor_opened"), "editor");
    assert.equal(inferUxEventCategory("insufficient_credits_shown"), "blocker");
    assert.equal(inferUxEventCategory("ux_blocker_generation_failed"), "blocker");
    assert.equal(inferUxEventCategory("billing_checkout_click"), "billing");
  });

  it("sanitizes params by stripping large strings and data URLs", () => {
    const clean = sanitizeUxParams({
      videoId: "abc123",
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
      longText: "x".repeat(600),
      count: 3,
      ok: true,
    });
    assert.equal(clean?.videoId, "abc123");
    assert.equal(clean?.image, "[redacted_data_url]");
    assert.equal((clean?.longText as string).length, 303);
    assert.equal(clean?.count, 3);
    assert.equal(clean?.ok, true);
  });
});

describe("User Stuck Stage Classifier & Funnel", () => {
  const baseSnapshot: UserJourneySnapshot = {
    clerkUserId: "u1",
    email: "user@example.com",
    name: "Test User",
    credits: 100,
    hasAcceptedLegal: false,
    folderCount: 0,
    characterCount: 0,
    completedCharacterCount: 0,
    lifeShotCount: 0,
    videoCount: 0,
    storyboardReadyCount: 0,
    keyframeReadyCount: 0,
    clipVideoReadyCount: 0,
    reelReadyCount: 0,
    failedJobCount: 0,
    creditBlockCount: 0,
    createdAt: new Date("2026-10-20T00:00:00Z"),
    lastActiveAt: new Date("2026-10-20T01:00:00Z"),
  };

  it("detects users stuck at legal acceptance", () => {
    const res = classifyUserStuckStage(baseSnapshot);
    assert.equal(res.stageId, "stuck_legal_terms");
    assert.equal(res.severity, "high");
  });

  it("detects users who accepted legal terms but never started a character or video", () => {
    const res = classifyUserStuckStage({
      ...baseSnapshot,
      hasAcceptedLegal: true,
    });
    assert.equal(res.stageId, "stuck_no_first_action");
  });

  it("detects users who created a character or video brief but stopped before storyboard/blueprint completed", () => {
    const res = classifyUserStuckStage({
      ...baseSnapshot,
      hasAcceptedLegal: true,
      videoCount: 1,
      storyboardReadyCount: 0,
    });
    assert.equal(res.stageId, "stuck_before_storyboard");
  });

  it("detects users who have a storyboard ready but never generated any keyframe images", () => {
    const res = classifyUserStuckStage({
      ...baseSnapshot,
      hasAcceptedLegal: true,
      videoCount: 1,
      storyboardReadyCount: 1,
      keyframeReadyCount: 0,
    });
    assert.equal(res.stageId, "stuck_storyboard_no_keyframes");
  });

  it("detects users who generated keyframes but never generated a video clip", () => {
    const res = classifyUserStuckStage({
      ...baseSnapshot,
      hasAcceptedLegal: true,
      videoCount: 1,
      storyboardReadyCount: 1,
      keyframeReadyCount: 1,
      clipVideoReadyCount: 0,
    });
    assert.equal(res.stageId, "stuck_keyframes_no_clip");
  });

  it("prioritizes credit exhaustion blocker when credits are low and user has not finished a video", () => {
    const res = classifyUserStuckStage({
      ...baseSnapshot,
      hasAcceptedLegal: true,
      credits: 2,
      videoCount: 1,
      storyboardReadyCount: 1,
      keyframeReadyCount: 1,
      clipVideoReadyCount: 0,
    });
    assert.equal(res.stageId, "blocked_insufficient_credits");
  });

  it("identifies activated users who produced video clips or Life photos", () => {
    const res = classifyUserStuckStage({
      ...baseSnapshot,
      hasAcceptedLegal: true,
      videoCount: 1,
      storyboardReadyCount: 1,
      keyframeReadyCount: 1,
      clipVideoReadyCount: 1,
    });
    assert.equal(res.stageId, "activated_producing");
  });

  it("builds a monotonically ordered conversion funnel from user snapshots", () => {
    const funnel = buildRetrospectiveFunnel([
      baseSnapshot,
      {
        ...baseSnapshot,
        clerkUserId: "u2",
        hasAcceptedLegal: true,
        characterCount: 1,
        completedCharacterCount: 1,
        videoCount: 1,
        storyboardReadyCount: 1,
        keyframeReadyCount: 1,
        clipVideoReadyCount: 1,
        reelReadyCount: 1,
      },
    ]);
    assert.equal(funnel[0]?.stepId, "signed_up");
    assert.equal(funnel[0]?.userCount, 2);
    assert.equal(funnel[1]?.stepId, "accepted_legal");
    assert.equal(funnel[1]?.userCount, 1);
    assert.equal(funnel[funnel.length - 1]?.stepId, "reel_or_life_completed");
    assert.equal(funnel[funnel.length - 1]?.userCount, 1);
  });
});
