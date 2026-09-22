import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { canSetDefault, resolveDefaultVersion, versionNumber } from "@/service/character/versions";
import type { CharacterVersion } from "@/model/character";

function version(over: Partial<CharacterVersion>): CharacterVersion {
  return {
    id: new ObjectId(),
    prompt: "p",
    status: "completed",
    creditsCharged: true,
    createdAt: new Date(),
    ...over,
  };
}

test("explicit completed default wins", () => {
  const a = version({ createdAt: new Date(1) });
  const b = version({ createdAt: new Date(2) });
  assert.equal(resolveDefaultVersion({ defaultVersionId: a.id, versions: [a, b] }), a);
});

test("without a default the newest completed version is used", () => {
  const a = version({ createdAt: new Date(1) });
  const b = version({ createdAt: new Date(2) });
  const c = version({ createdAt: new Date(3), status: "queued" });
  assert.equal(resolveDefaultVersion({ versions: [a, b, c] }), b);
});

test("no completed version resolves to null", () => {
  assert.equal(
    resolveDefaultVersion({ versions: [version({ status: "failed" })] }),
    null,
  );
});

test("only completed versions can become default", () => {
  assert.equal(canSetDefault(version({ status: "completed" })), true);
  assert.equal(canSetDefault(version({ status: "queued" })), false);
});

test("version number is 1-based array position", () => {
  const a = version({});
  const b = version({});
  assert.equal(versionNumber({ versions: [a, b] }, b.id), 2);
  assert.equal(versionNumber({ versions: [a, b] }, new ObjectId()), 0);
});
