import assert from "node:assert/strict";
import { test } from "node:test";
import { testStyle } from "@/service/style/test-styles";
import { copyUserStyleFields, parseUserStyleFields, parseUserStyleMeta } from "@/service/style/user-style-fields";

test("copyUserStyleFields snapshots the template, including lettering", () => {
  const copied = copyUserStyleFields(testStyle("pixel", {
    look: "chunky pixels",
    letteringLine1: "Line 1 is chunky pixel all-caps.",
  }));
  assert.equal(copied.look, "chunky pixels");
  assert.equal(copied.letteringLine1, "Line 1 is chunky pixel all-caps.");
  copied.look = "changed later";
  assert.equal(testStyle("pixel", { look: "chunky pixels" }).look, "chunky pixels");
});

test("parseUserStyleMeta rejects an empty name and a 61-character name", () => {
  assert.equal(parseUserStyleMeta("  ", "desc").ok, false);
  assert.equal(parseUserStyleMeta("n".repeat(61), "desc").ok, false);
  assert.equal(parseUserStyleMeta("Mine", "d".repeat(301)).ok, false);
  const ok = parseUserStyleMeta("  Mine  ", "desc");
  assert.equal(ok.ok && ok.name, "Mine");
});

test("parseUserStyleFields rejects a bad canvas color and an over-long look", () => {
  const base = copyUserStyleFields(testStyle("doodle"));
  assert.equal(parseUserStyleFields({ ...base, canvasColor: "white" }).ok, false);
  assert.equal(parseUserStyleFields({ ...base, look: "x".repeat(2001) }).ok, false);
  const ok = parseUserStyleFields({ ...base, canvasColor: "#112233" });
  assert.equal(ok.ok && ok.fields.canvasColor, "#112233");
});
