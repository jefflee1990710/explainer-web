import assert from "node:assert/strict";
import test from "node:test";
import { assembleLessonMarkdown } from "@/service/academy/catalog/assemble";
import { ACADEMY_LESSONS } from "@/service/academy/catalog/lessons";
import { academyImagePrompt, academyVideoPrompt } from "@/service/academy/catalog/prompts";

test("the academy syllabus has 26 English lessons in order", () => {
  assert.equal(ACADEMY_LESSONS.length, 26);
  const slugs = ACADEMY_LESSONS.map((lesson) => lesson.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.deepEqual(
    ACADEMY_LESSONS.map((lesson) => lesson.sortOrder),
    Array.from({ length: 26 }, (_, index) => index + 1),
  );
  assert.ok(ACADEMY_LESSONS.every((lesson) => lesson.module.trim().length > 0));
  assert.ok(ACADEMY_LESSONS.every((lesson) => lesson.images.length === 2));
  assert.ok(
    ACADEMY_LESSONS.every(
      (lesson) =>
        lesson.markdown.includes("{{image1}}") &&
        lesson.markdown.includes("{{image2}}") &&
        lesson.markdown.includes("{{video}}"),
    ),
  );
});

test("assembleLessonMarkdown inserts two images and one video", () => {
  const lesson = ACADEMY_LESSONS[0];
  const markdown = assembleLessonMarkdown(lesson, {
    image1: "https://cdn.example/a.png",
    image2: "https://cdn.example/b.png",
    video: "https://cdn.example/c.mp4",
  });
  assert.equal(markdown.includes("{{image1}}"), false);
  assert.match(markdown, /!\[[^\]]+\]\(https:\/\/cdn\.example\/a\.png\)/);
  assert.match(markdown, /!\[[^\]]+\]\(https:\/\/cdn\.example\/b\.png\)/);
  assert.match(markdown, /!\[[^\]]+\]\(https:\/\/cdn\.example\/c\.mp4\)/);
});

test("media prompts stay specific and short enough to send", () => {
  const lesson = ACADEMY_LESSONS[2];
  const imagePrompt = academyImagePrompt(lesson.images[0].prompt);
  const videoPrompt = academyVideoPrompt(lesson.videoPrompt);
  assert.match(imagePrompt, /HOOK/);
  assert.match(videoPrompt, /Spoken line/);
  assert.ok(imagePrompt.length < 2000);
  assert.ok(videoPrompt.length < 2000);
});
