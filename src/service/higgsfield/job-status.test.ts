import assert from "node:assert/strict";
import { test } from "node:test";
import { mediaUrlFromResponse } from "@/service/higgsfield/client";
import {
  jobNeedsRefresh,
  jobNeedsRefreshFilter,
  settleProviderStatus,
  userFacingJobError,
} from "@/service/higgsfield/job-status";

test("settleProviderStatus keeps completed-without-file in flight, but NSFW is terminal", () => {
  assert.equal(settleProviderStatus("completed"), "in_progress");
  assert.equal(settleProviderStatus("completed", ""), "in_progress");
  assert.equal(settleProviderStatus("nsfw"), "nsfw");
  assert.equal(settleProviderStatus("nsfw", "https://cdn.example/out.png"), "nsfw");
  assert.equal(settleProviderStatus("completed", "https://cdn.example/out.png"), "completed");
  assert.equal(settleProviderStatus("failed"), "failed");
  assert.equal(settleProviderStatus("in_progress"), "in_progress");
});

test("jobNeedsRefresh includes completed jobs that never stored a file, not NSFW", () => {
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
  assert.equal(jobNeedsRefresh({ status: "nsfw", statusUrl: "https://s" }), false);
  assert.equal(jobNeedsRefresh({ status: "completed" }), false);
  assert.equal(jobNeedsRefresh({ status: "failed", statusUrl: "https://s" }), false);
});

test("userFacingJobError explains NSFW for retry", () => {
  assert.match(userFacingJobError("nsfw"), /安全檢查/);
  assert.match(userFacingJobError("failed", "nsfw"), /安全檢查/);
  assert.match(
    userFacingJobError("failed", "Generation took too long to complete. Please try again later."),
    /逾時/,
  );
  assert.equal(userFacingJobError("failed", "boom"), "boom");
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

// Minimal Mongo matcher for the operators the refresh filter uses; a missing
// field compares as null, like Mongo's `$in: [null]`.
type Doc = Record<string, string | undefined>;
function matches(doc: Doc, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$or") {
      return (cond as Array<Record<string, unknown>>).some((branch) => matches(doc, branch));
    }
    const value = doc[key] ?? null;
    if (cond && typeof cond === "object" && "$in" in cond) {
      return (cond as { $in: unknown[] }).$in.includes(value);
    }
    if (cond && typeof cond === "object" && "$nin" in cond) {
      return !(cond as { $nin: unknown[] }).$nin.includes(value);
    }
    return value === cond;
  });
}

test("jobNeedsRefreshFilter selects exactly what jobNeedsRefresh accepts", () => {
  const filter = jobNeedsRefreshFilter();
  const statuses = ["pending", "submitting", "queued", "in_progress", "completed", "failed", "nsfw"];
  const urls = [undefined, "", "https://x"];
  for (const status of statuses) {
    for (const statusUrl of urls) {
      for (const outputUrl of urls) {
        for (const blobUrl of urls) {
          const job = { status, statusUrl, outputUrl, blobUrl };
          assert.equal(matches(job, filter), jobNeedsRefresh(job), JSON.stringify(job));
        }
      }
    }
  }
});
