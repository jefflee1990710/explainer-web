import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { installTestStyles, testStyle, uninstallTestStyles } from "@/service/style/test-styles";
import { loadRenderableStyle, renderableFromUserStyle } from "@/service/style/renderable-style";
import type { UserStyleDoc } from "@/model/user-style";

const owner = "user_1";

function userDoc(id: ObjectId, look: string, deletedAt?: Date): UserStyleDoc {
  const fields = { ...testStyle("doodle"), look, letteringLine1: "Line 1 is torn paper." };
  return {
    _id: id,
    ownerClerkUserId: owner,
    baseStyleId: "doodle",
    ...fields,
    letteringLayout: fields.letteringLayout ?? "",
    letteringLine1: fields.letteringLine1 ?? "",
    letteringLine2: fields.letteringLine2 ?? "",
    beatTitleLayout: fields.beatTitleLayout ?? "",
    reelLayout: fields.reelLayout ?? "",
    previewStatus: "idle",
    ...(deletedAt ? { deletedAt } : {}),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("missing or unknown styleId falls back to doodle; a system id returns that style", async () => {
  installTestStyles();
  const missing = await loadRenderableStyle({ ownerClerkUserId: owner });
  assert.equal(missing.id, "doodle");
  const pixel = await loadRenderableStyle({ styleId: "pixel", ownerClerkUserId: owner });
  assert.match(pixel.look, /pixel/);
  const legacyCustom = await loadRenderableStyle({
    styleId: new ObjectId().toHexString(),
    ownerClerkUserId: owner,
  });
  assert.equal(legacyCustom.id, "doodle");
  const unknown = await loadRenderableStyle({ styleId: "not-a-style", ownerClerkUserId: owner });
  assert.equal(unknown.id, "doodle");
  uninstallTestStyles();
});

test("user renderable style keeps baseStyleId", () => {
  const style = renderableFromUserStyle({
    ...userDoc(new ObjectId(), "cinematic look"),
    baseStyleId: "realistic",
    name: "My look",
  });
  assert.equal(style.baseStyleId, "realistic");
});
