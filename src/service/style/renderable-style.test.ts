import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { installTestStyles, testStyle, uninstallTestStyles } from "@/service/style/test-styles";
import { loadRenderableStyle } from "@/service/style/renderable-style";
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

test("missing styleId is doodle; a system id is that style; a user id uses the doc even if deleted", async () => {
  installTestStyles();
  const id = new ObjectId();
  const findUserStyle = async (styleId: string, clerkUserId: string) => {
    if (styleId === id.toHexString() && clerkUserId === owner) return userDoc(id, "torn paper", new Date());
    return null;
  };
  const missing = await loadRenderableStyle({ ownerClerkUserId: owner, findUserStyle });
  assert.equal(missing.id, "doodle");
  const pixel = await loadRenderableStyle({ styleId: "pixel", ownerClerkUserId: owner, findUserStyle });
  assert.match(pixel.look, /pixel/);
  const custom = await loadRenderableStyle({ styleId: id.toHexString(), ownerClerkUserId: owner, findUserStyle });
  assert.equal(custom.look, "torn paper");
  assert.equal(custom.letteringLine1, "Line 1 is torn paper.");
  await assert.rejects(
    () => loadRenderableStyle({ styleId: new ObjectId().toHexString(), ownerClerkUserId: "other", findUserStyle }),
    /style/i,
  );
  await assert.rejects(
    () => loadRenderableStyle({ styleId: "not-a-style", ownerClerkUserId: owner, findUserStyle }),
    /style/i,
  );
  uninstallTestStyles();
});
