import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ObjectId } from "mongodb";
import { videoStyle } from "@/service/higgsfield/frame-prompts";
import { resolvedStyle } from "@/service/style/load-style";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { installTestStyles, testStyle, uninstallTestStyles } from "@/service/style/test-styles";
import type { UserStyleDoc } from "@/model/user-style";

const here = path.dirname(fileURLToPath(import.meta.url));

function functionBody(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  // Skip `{...}` inside the parameter list; the body starts at `) {`.
  const signatureEnd = source.indexOf(") {", start);
  assert.ok(signatureEnd >= 0, `missing body ${name}`);
  const open = signatureEnd + 2;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed ${name}`);
}

function userDoc(id: ObjectId, canvasColor: string): UserStyleDoc {
  const fields = { ...testStyle("doodle"), canvasColor, look: "ink wash" };
  return {
    _id: id,
    ownerClerkUserId: "user_1",
    baseStyleId: "doodle",
    ...fields,
    letteringLayout: fields.letteringLayout ?? "",
    letteringLine1: fields.letteringLine1 ?? "",
    letteringLine2: fields.letteringLine2 ?? "",
    beatTitleLayout: fields.beatTitleLayout ?? "",
    reelLayout: fields.reelLayout ?? "",
    previewStatus: "idle",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("phase A and blueprint crop load a user style instead of videoStyle or resolvedStyle", async () => {
  installTestStyles();
  const id = new ObjectId();
  const styleId = id.toHexString();
  const findUserStyle = async (requestedId: string, clerkUserId: string) => {
    if (requestedId === styleId && clerkUserId === "user_1") return userDoc(id, "#112233");
    return null;
  };

  const loaded = await loadRenderableStyle({
    styleId,
    ownerClerkUserId: "user_1",
    findUserStyle,
  });
  assert.equal(loaded.canvasColor, "#112233");
  assert.equal(loaded.look, "ink wash");
  // The old helpers would fail the storyboard or crop onto doodle white.
  assert.equal(resolvedStyle(styleId).id, "doodle");
  assert.equal(resolvedStyle(styleId).canvasColor, "#ffffff");
  assert.throws(() => videoStyle({ styleId }), /must be loaded/);

  const missing = await loadRenderableStyle({ ownerClerkUserId: "user_1", findUserStyle });
  assert.equal(missing.id, "doodle");
  await assert.rejects(
    () => loadRenderableStyle({ styleId: "not-a-style", ownerClerkUserId: "user_1", findUserStyle }),
    /missing/i,
  );

  const phaseA = functionBody(
    readFileSync(path.join(here, "../director/jobs.ts"), "utf8"),
    "runPhaseAJob",
  );
  assert.match(phaseA, /loadRenderableStyle\(\{[\s\S]*styleId: project\.styleId/);
  assert.match(phaseA, /ownerClerkUserId: project\.clerkUserId/);
  assert.doesNotMatch(phaseA, /videoStyle\s*\(/);

  const crop = functionBody(
    readFileSync(path.join(here, "../character/sync.ts"), "utf8"),
    "syncCharacterJob",
  );
  assert.match(crop, /loadRenderableStyle\(\{[\s\S]*styleId: versionStyleId\(character, version\)/);
  assert.match(crop, /ownerClerkUserId: character\.clerkUserId/);
  assert.match(crop, /loaded\.canvasColor/);
  assert.doesNotMatch(crop, /resolvedStyle\s*\(/);

  const previewButton = readFileSync(
    path.join(here, "../../presentation/components/app/styles/[id]/style-preview-button.tsx"),
    "utf8",
  );
  assert.match(previewButton, /const disabled = dirty \|\| generating/);
  assert.doesNotMatch(previewButton, /needsSave/);
  const workspace = readFileSync(
    path.join(here, "../../presentation/components/app/styles/[id]/style-workspace.tsx"),
    "utf8",
  );
  assert.doesNotMatch(workspace, /needsSave/);

  uninstallTestStyles();
});
