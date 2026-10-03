import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { selectableUserStyleFilter, toPublicUserStyle } from "@/service/style/list-selectable";
import type { UserStyleDoc } from "@/model/user-style";

test("picker query hides deleted styles and other owners", () => {
  assert.deepEqual(selectableUserStyleFilter("user_1"), {
    ownerClerkUserId: "user_1",
    deletedAt: { $exists: false },
  });
});

test("a user style without a preview inherits the template still", () => {
  const doc = {
    _id: new ObjectId(),
    ownerClerkUserId: "user_1",
    baseStyleId: "pixel",
    name: "Mine",
    description: "pixels",
    canvasColor: "#111111",
    previewStatus: "idle",
  } as UserStyleDoc;
  const pub = toPublicUserStyle(doc, "https://template", "Pixel");
  assert.equal(pub.isCustom, true);
  assert.equal(pub.previewUrl, "https://template");
  assert.equal(pub.templateName, "Pixel");
  assert.equal(pub.id, doc._id.toHexString());
});
