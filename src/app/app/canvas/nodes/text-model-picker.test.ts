import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TextModelPicker } from "@/app/app/canvas/nodes/text-model-picker";
import { TEXT_STATIC_MODELS } from "@/service/canvas/catalog/text-models";

test("text model options show the name only and the selected rate stays under the menu", () => {
  const argon = TEXT_STATIC_MODELS.find((spec) => spec.id === "google:gemini-4-argon");
  assert.ok(argon);
  const html = renderToStaticMarkup(
    TextModelPicker({
      spec: argon,
      choices: TEXT_STATIC_MODELS,
      locale: "en",
      isZh: false,
      disabled: false,
      onChange: () => undefined,
    }),
  );
  assert.match(html, /<option value="google:gemini-4-argon"[^>]*>Gemini 4 Argon<\/option>/);
  assert.equal(html.includes("Gemini 4 Argon ·"), false);
  assert.match(html, /\$3\/1M in · \$15\/1M out/);
  assert.equal((html.match(/<option /g) ?? []).length, TEXT_STATIC_MODELS.length);
});
