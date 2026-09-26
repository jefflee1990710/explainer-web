import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generationEmailBody,
  generationEmailHtml,
  generationEmailSubject,
  generationEmailText,
} from "@/service/notify/generation-email-html";

test("video mail names the clip and keeps the studio link", () => {
  const copy = {
    kind: "video" as const,
    title: "預測下一個字",
    href: "https://explainer.io/app/projects/folder?video=vid",
    clipNumber: 1,
  };
  assert.equal(generationEmailSubject(copy), "影片完成 · 預測下一個字 · Clip 1");
  assert.match(generationEmailBody(copy), /Clip 1/);
  assert.match(generationEmailText(copy), /打開工作室：https:\/\/explainer.io/);
  const html = generationEmailHtml(copy);
  assert.match(html, /#c6f24b/);
  assert.match(html, /#12141c/);
  assert.match(html, /打開工作室/);
  assert.match(html, /folder\?video=vid/);
});

test("frame mail waits for the pair copy, not a single still", () => {
  const copy = {
    kind: "frames" as const,
    title: "預測下一個字",
    href: "https://explainer.io/app/projects/folder?video=vid",
    clipNumber: 2,
  };
  assert.equal(generationEmailSubject(copy), "畫格完成 · 預測下一個字 · Clip 2");
  assert.match(generationEmailBody(copy), /起始與結尾畫格/);
});

test("html escapes title text", () => {
  const html = generationEmailHtml({
    kind: "character",
    title: "Joyce <script>alert(1)</script>",
    href: "https://explainer.io/app/characters/1",
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Joyce &lt;script&gt;/);
});
