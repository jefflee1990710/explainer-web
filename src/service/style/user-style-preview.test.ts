import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { renderableFromSystem } from "@/service/style/renderable-style";
import { testStyle } from "@/service/style/test-styles";
import {
  applyPreviewToChat,
  ownedPreviewFilter,
  previewClaimFilter,
  previewSlotAvailable,
  shouldChargeAfterClaim,
  shouldClearPreviewCharge,
  shouldRefundUnqueuedSpend,
  stylePreviewInFlight,
  stylePreviewPrompt,
} from "@/service/style/user-style-preview";

test("stylePreviewPrompt uses the saved look and the shared IDEA scene", () => {
  const prompt = stylePreviewPrompt(renderableFromSystem(testStyle("paper-cutout", {
    look: "torn kraft",
    letteringLine1: "Line 1 is torn paper.",
  })));
  assert.match(prompt, /torn kraft/);
  assert.match(prompt, /Line 1 is torn paper/);
  assert.match(prompt, /IDEA/);
  assert.match(prompt, /16:9/);
});

test("stylePreviewInFlight is true only for a generating preview younger than 15 minutes", () => {
  const now = new Date("2026-10-03T01:00:00Z");
  const base = { previewStatus: "generating" as const, previewStartedAt: new Date("2026-10-03T00:50:00Z") };
  assert.equal(stylePreviewInFlight(base, now), true);
  assert.equal(stylePreviewInFlight({ ...base, previewStartedAt: new Date("2026-10-03T00:40:00Z") }, now), false);
  assert.equal(stylePreviewInFlight({ previewStatus: "idle" }, now), false);
});

test("a second overlapping claim that loses the conditional update does not charge", () => {
  const now = new Date("2026-10-03T01:00:00Z");
  const young = new Date("2026-10-03T00:50:00Z");
  assert.equal(
    previewSlotAvailable({ previewStatus: "generating", previewStartedAt: young }, now),
    false,
  );
  assert.equal(shouldChargeAfterClaim(0), false);

  const filter = previewClaimFilter({
    styleId: new ObjectId(),
    ownerClerkUserId: "user_1",
    now,
  });
  const staleAt = new Date(now.getTime() - 15 * 60 * 1000);
  const staleClause = filter.$or.find(
    (clause) =>
      "previewStartedAt" in clause &&
      clause.previewStartedAt != null &&
      typeof clause.previewStartedAt === "object" &&
      "$lte" in clause.previewStartedAt,
  );
  assert.ok(staleClause && "previewStartedAt" in staleClause);
  const bound = staleClause.previewStartedAt as { $lte: Date };
  assert.equal(bound.$lte.getTime(), staleAt.getTime());
  assert.ok(young.getTime() > bound.$lte.getTime());
});

test("an insert failure still requests one refund when the status reset throws", () => {
  assert.equal(
    shouldRefundUnqueuedSpend({
      spendCaptured: true,
      jobQueued: false,
      writeThrew: true,
      resetMatchedCount: 0,
    }),
    true,
  );
  assert.equal(
    shouldRefundUnqueuedSpend({
      spendCaptured: true,
      jobQueued: false,
      writeThrew: false,
      resetMatchedCount: 0,
    }),
    false,
  );
  assert.equal(
    shouldRefundUnqueuedSpend({
      spendCaptured: true,
      jobQueued: true,
      writeThrew: true,
      resetMatchedCount: 0,
    }),
    false,
  );
});

test("a completion update whose previewStartedAt no longer matches does not clear previewCreditsCharged", () => {
  const started = new Date("2026-10-03T00:50:00Z");
  const newer = new Date("2026-10-03T01:00:00Z");
  const filter = ownedPreviewFilter(new ObjectId(), started);
  assert.equal(filter.previewStartedAt.getTime(), started.getTime());
  assert.notEqual(filter.previewStartedAt.getTime(), newer.getTime());
  assert.equal(shouldClearPreviewCharge(0), false);
  assert.equal(shouldClearPreviewCharge(1), true);
});

test("applyPreviewToChat stamps the matching assistant turn, else the latest", () => {
  const first = new Date("2026-10-04T01:00:00Z");
  const second = new Date("2026-10-04T01:01:00Z");
  const chat = [
    { role: "user" as const, content: "warmer", createdAt: first },
    { role: "assistant" as const, content: "ok", createdAt: first },
    { role: "user" as const, content: "again", createdAt: second },
    { role: "assistant" as const, content: "done", createdAt: second },
  ];
  const targeted = applyPreviewToChat(chat, "https://blob/first.png", first);
  assert.equal(targeted[1].previewUrl, "https://blob/first.png");
  assert.equal(targeted[3].previewUrl, undefined);
  const latest = applyPreviewToChat(chat, "https://blob/latest.png");
  assert.equal(latest[3].previewUrl, "https://blob/latest.png");
  assert.deepEqual(applyPreviewToChat(undefined, "https://blob/x.png"), []);
});
