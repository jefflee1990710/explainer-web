import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  POST_ACTIVATION_EVENTS,
  buildPostActivationBehavior,
} from "@/service/analytics/post-activation";

describe("post-activation behavior", () => {
  it("counts only catalog events from activated users, including zeros", () => {
    const report = buildPostActivationBehavior(["activated"], [
      {
        event: "opencut_export_done",
        clerkUserId: "activated",
        createdAt: new Date("2026-10-30T01:00:00Z"),
      },
      {
        event: "opencut_export_done",
        clerkUserId: "activated",
        createdAt: new Date("2026-10-30T02:00:00Z"),
      },
      {
        event: "video_share_target_clicked",
        clerkUserId: "other",
        createdAt: new Date("2026-10-30T03:00:00Z"),
        params: { target: "tiktok" },
      },
      {
        event: "page_view",
        clerkUserId: "activated",
        createdAt: new Date("2026-10-30T04:00:00Z"),
      },
    ]);

    const exportDone = report.actions.find((item) => item.event === "opencut_export_done");
    const share = report.actions.find((item) => item.event === "video_share_target_clicked");
    assert.equal(report.activatedUserCount, 1);
    assert.equal(exportDone?.count, 2);
    assert.equal(exportDone?.uniqueUsers, 1);
    assert.equal(share?.count, 0);
    assert.equal(share?.uniqueUsers, 0);
    assert.equal(report.actions.length, POST_ACTIVATION_EVENTS.length);
    assert.equal(
      report.actions.every((item) =>
        (POST_ACTIVATION_EVENTS as readonly string[]).includes(item.event),
      ),
      true,
    );
    assert.ok(report.actions.every((item) => item.count <= (exportDone?.count ?? 0) || item.count === 0));
  });

  it("keeps the three newest post-output actions per activated user", () => {
    const report = buildPostActivationBehavior(["activated"], [
      {
        event: "life_shot_submitted",
        clerkUserId: "activated",
        createdAt: new Date("2026-10-30T01:00:00Z"),
      },
      {
        event: "video_created",
        clerkUserId: "activated",
        createdAt: new Date("2026-10-30T02:00:00Z"),
      },
      {
        event: "opencut_editor_opened",
        clerkUserId: "activated",
        createdAt: new Date("2026-10-30T03:00:00Z"),
      },
      {
        event: "video_share_target_clicked",
        clerkUserId: "activated",
        createdAt: new Date("2026-10-30T04:00:00Z"),
        params: { target: "youtube" },
      },
    ]);

    assert.deepEqual(report.recentByUser.activated, [
      "分享到平台 · youtube",
      "開啟剪輯器",
      "再建立影片",
    ]);
  });
});
