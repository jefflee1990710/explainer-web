import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLifePngFilename } from "@/presentation/components/app/life/download-life-png";

test("buildLifePngFilename joins character, place, and short id with .png extension", () => {
  assert.equal(
    buildLifePngFilename({
      characterName: "Nicky",
      place: "Scene",
      id: "6ad79128fc61ae036e9ca526",
    }),
    "Nicky-Scene-9ca526.png",
  );
});

test("buildLifePngFilename strips unsafe path characters and falls back when empty", () => {
  assert.equal(
    buildLifePngFilename({
      characterName: "Nicky / 測試:1",
      place: "Central * HK?",
      id: "123456",
    }),
    "Nicky-測試1-Central-HK-123456.png",
  );
  assert.equal(buildLifePngFilename({}), "life-shot.png");
});
