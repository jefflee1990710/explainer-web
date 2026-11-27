import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingPlaceholderList } from "@/app/app/canvas/nodes/setting-placeholder-list";

test("lists a connected Setting's keys and hides the list otherwise", () => {
  const shown = renderToStaticMarkup(
    createElement(SettingPlaceholderList, {
      isZh: true,
      vars: { mood: "calm", style: "ink" },
      onInsert: () => {},
    }),
  );
  assert.match(shown, /可用佔位符/);
  assert.match(shown, /\{\{mood\}\}/);
  assert.match(shown, /\{\{style\}\}/);

  const disconnected = renderToStaticMarkup(
    createElement(SettingPlaceholderList, { isZh: true, onInsert: () => {} }),
  );
  assert.equal(disconnected, "");

  const empty = renderToStaticMarkup(
    createElement(SettingPlaceholderList, { isZh: false, vars: {}, onInsert: () => {} }),
  );
  assert.equal(empty, "");
});
