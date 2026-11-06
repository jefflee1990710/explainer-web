import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_STUDIO_THEME,
  isStudioTheme,
  resolveStudioTheme,
} from "@/presentation/studio/studio-theme";

test("resolveStudioTheme defaults to dark mode when unset or invalid", () => {
  assert.equal(DEFAULT_STUDIO_THEME, "dark");
  assert.equal(resolveStudioTheme(undefined), "dark");
  assert.equal(resolveStudioTheme(null), "dark");
  assert.equal(resolveStudioTheme(""), "dark");
  assert.equal(resolveStudioTheme("system"), "dark");
});

test("resolveStudioTheme preserves explicit light and dark values", () => {
  assert.equal(resolveStudioTheme("light"), "light");
  assert.equal(resolveStudioTheme("dark"), "dark");
  assert.equal(isStudioTheme("dark"), true);
  assert.equal(isStudioTheme("light"), true);
  assert.equal(isStudioTheme("auto"), false);
});
