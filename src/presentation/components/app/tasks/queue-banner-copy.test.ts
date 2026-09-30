import assert from "node:assert/strict";
import { test } from "node:test";
import {
  queueBannerMessage,
  queueBannerPending,
  shouldShowQueueBanner,
} from "@/presentation/components/app/tasks/queue-banner-copy";

test("queueBannerPending uses the server count until the first list lands", () => {
  assert.equal(queueBannerPending(0, false, 3), 3);
  assert.equal(queueBannerPending(0, true, 3), 0);
  assert.equal(queueBannerPending(2, false, 3), 2);
});

test("shouldShowQueueBanner hides the bar when nothing is queued", () => {
  assert.equal(shouldShowQueueBanner(0), false);
  assert.equal(shouldShowQueueBanner(1), true);
});

test("queueBannerMessage centers the current job, then the remaining count", () => {
  assert.equal(queueBannerMessage([], 2, "pending"), "2 pending");
  assert.equal(
    queueBannerMessage([{ title: "Scro", detail: "Clip 3 · 影片" }], 1, "pending"),
    "Clip 3 · 影片",
  );
  assert.equal(
    queueBannerMessage(
      [
        { title: "Scro", detail: "Clip 3 · 影片" },
        { title: "Scro", detail: "Clip 4 · 影片" },
      ],
      2,
      "pending",
    ),
    "Clip 3 · 影片 · 2 pending",
  );
});
