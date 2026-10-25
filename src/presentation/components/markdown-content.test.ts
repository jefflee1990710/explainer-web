import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownContent } from "@/presentation/components/markdown-content";

test("MarkdownContent renders headings, lists, images, and video players", () => {
  const html = renderToStaticMarkup(
    MarkdownContent({
      content: [
        "# Title",
        "",
        "A **bold** line.",
        "",
        "- one",
        "- two",
        "",
        "![Cover](https://cdn.example/cover.webp)",
        "",
        "![Demo](https://cdn.example/demo.mp4)",
      ].join("\n"),
    }),
  );
  assert.match(html, /<h2/);
  assert.match(html, /<strong/);
  assert.match(html, /<ul/);
  assert.match(html, /<img src="https:\/\/cdn.example\/cover.webp"/);
  assert.match(html, /<video src="https:\/\/cdn.example\/demo.mp4"/);
});
