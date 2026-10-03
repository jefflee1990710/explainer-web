import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { testStyle } from "@/service/style/test-styles";
import { buildUserStyleInsert } from "@/service/style/user-style-actions";

test("buildUserStyleInsert copies the template fields onto an owned document", () => {
  const template = testStyle("chalkboard", { look: "white chalk", letteringLine1: "white chalk line" });
  const doc = buildUserStyleInsert({
    ownerClerkUserId: "user_1",
    baseStyleId: "chalkboard",
    name: "My chalk",
    description: "dusty",
    template,
    now: new Date("2026-10-03T00:00:00Z"),
  });
  assert.equal(doc.ownerClerkUserId, "user_1");
  assert.equal(doc.baseStyleId, "chalkboard");
  assert.equal(doc.look, "white chalk");
  assert.equal(doc.letteringLine1, "white chalk line");
  assert.equal(doc.previewStatus, "idle");
  assert.equal(doc.deletedAt, undefined);
  assert.ok(doc._id instanceof ObjectId);
  template.look = "mutated";
  assert.equal(doc.look, "white chalk");
});
