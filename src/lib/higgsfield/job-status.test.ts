import assert from "node:assert/strict";
import { test } from "node:test";
import { mediaUrlFromResponse } from "./client";
import { jobNeedsRefresh, settleProviderStatus } from "./job-status";

test("settleProviderStatus does not finalize completed/nsfw without a file", () => {
  assert.equal(settleProviderStatus("completed"), "in_progress");
  assert.equal(settleProviderStatus("nsfw"), "in_progress");
  assert.equal(settleProviderStatus("completed", ""), "in_progress");
  assert.equal(settleProviderStatus("completed", "https://cdn.example/out.png"), "completed");
  assert.equal(settleProviderStatus("failed"), "failed");
  assert.equal(settleProviderStatus("in_progress"), "in_progress");
});

test("jobNeedsRefresh includes completed jobs that never stored a file", () => {
  assert.equal(jobNeedsRefresh({ status: "queued", statusUrl: "https://s" }), true);
  assert.equal(jobNeedsRefresh({ status: "in_progress", statusUrl: "https://s" }), true);
  assert.equal(
    jobNeedsRefresh({ status: "completed", statusUrl: "https://s" }),
    true,
  );
  assert.equal(
    jobNeedsRefresh({
      status: "completed",
      statusUrl: "https://s",
      blobUrl: "https://blob/a.png",
    }),
    false,
  );
  assert.equal(jobNeedsRefresh({ status: "completed" }), false);
  assert.equal(jobNeedsRefresh({ status: "failed", statusUrl: "https://s" }), false);
});

test("mediaUrlFromResponse reads the standard V2 fields and common aliases", () => {
  assert.equal(
    mediaUrlFromResponse({ images: [{ url: "https://img" }] }),
    "https://img",
  );
  assert.equal(
    mediaUrlFromResponse({ video: { url: "https://vid" } }),
    "https://vid",
  );
  assert.equal(mediaUrlFromResponse({ video: "https://vid-string" }), "https://vid-string");
  assert.equal(
    mediaUrlFromResponse({ videos: [{ url: "https://vids" }] }),
    "https://vids",
  );
  assert.equal(
    mediaUrlFromResponse({ images: ["https://img-string"] }),
    "https://img-string",
  );
  assert.equal(
    mediaUrlFromResponse({ data: { video: { url: "https://nested" } } }),
    "https://nested",
  );
  assert.equal(mediaUrlFromResponse({}), undefined);
});
