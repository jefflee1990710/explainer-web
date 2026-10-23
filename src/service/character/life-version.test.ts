import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { CharacterVersion } from "@/model/character";
import { lifeVersionFaceUrl, resolveLifeShotVersion } from "@/service/character/life-version";

function version(over: Partial<CharacterVersion>): CharacterVersion {
  return {
    id: new ObjectId(),
    prompt: "p",
    status: "completed",
    creditsCharged: true,
    createdAt: new Date(),
    portraitUrl: "https://example.com/face.png",
    profileUrl: "https://example.com/body.png",
    ...over,
  };
}

test("omitted version uses the newest completed look", () => {
  const older = version({ createdAt: new Date(1), portraitUrl: "https://example.com/old.png" });
  const newer = version({ createdAt: new Date(2), portraitUrl: "https://example.com/new.png" });
  const resolved = resolveLifeShotVersion({ versions: [older, newer] });
  assert.equal(resolved.ok, true);
  if (resolved.ok) assert.equal(resolved.version, newer);
});

test("explicit completed version wins over the newest look", () => {
  const older = version({ createdAt: new Date(1) });
  const newer = version({ createdAt: new Date(2) });
  const resolved = resolveLifeShotVersion({ versions: [older, newer] }, older.id.toHexString());
  assert.equal(resolved.ok, true);
  if (resolved.ok) assert.equal(resolved.version.id.equals(older.id), true);
});

test("unknown or unfinished version is rejected", () => {
  const done = version({});
  const queued = version({ status: "queued" });
  assert.deepEqual(resolveLifeShotVersion({ versions: [done] }, new ObjectId().toHexString()), {
    ok: false,
    error: "版本不存在",
  });
  assert.deepEqual(resolveLifeShotVersion({ versions: [queued] }, queued.id.toHexString()), {
    ok: false,
    error: "版本不存在",
  });
  assert.equal(resolveLifeShotVersion({ versions: [queued] }).ok, false);
});

test("face url prefers the portrait", () => {
  const look = version({
    portraitUrl: "https://example.com/face.png",
    profileUrl: "https://example.com/body.png",
    blueprintUrl: "https://example.com/board.png",
  });
  assert.equal(lifeVersionFaceUrl(look), "https://example.com/face.png");
  assert.equal(lifeVersionFaceUrl(version({ status: "failed" })), null);
});
