import assert from "node:assert/strict";
import { test } from "node:test";
import { testStyle } from "@/service/style/test-styles";
import { copyUserStyleFields } from "@/service/style/user-style-fields";
import { applyUserStyleEdits } from "@/service/style/user-style-edits";

test("applyUserStyleEdits drops unknown fields and invalid colors, and reports real changes", () => {
  const fields = copyUserStyleFields(testStyle("doodle", { look: "marker", canvasColor: "#ffffff" }));
  const applied = applyUserStyleEdits(fields, [
    { field: "name", content: "hijack" },
    { field: "look", content: "torn paper" },
    { field: "canvasColor", content: "nope" },
    { field: "letteringLine1", content: "Line 1 is torn paper." },
  ]);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  assert.deepEqual(applied.changedFields, ["look", "letteringLine1"]);
  assert.equal(applied.fields.look, "torn paper");
  assert.equal(applied.fields.canvasColor, "#ffffff");
  assert.equal("name" in applied.fields, true);
});

test("applyUserStyleEdits fails when nothing changes", () => {
  const fields = copyUserStyleFields(testStyle("doodle", { look: "marker" }));
  const applied = applyUserStyleEdits(fields, [{ field: "look", content: "marker" }]);
  assert.equal(applied.ok, false);
});
