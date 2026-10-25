import assert from "node:assert/strict";
import test from "node:test";
import {
  academyMediaMarkdown,
  classifyAcademyMedia,
  isAcademyVideoUrl,
} from "@/service/academy/media";

test("classifyAcademyMedia accepts images and videos and rejects other types", () => {
  const image = classifyAcademyMedia({
    type: "image/png",
    name: "hook.png",
    size: 1024,
  });
  assert.deepEqual(image, { kind: "image" });

  const video = classifyAcademyMedia({
    type: "video/mp4",
    name: "hook.mp4",
    size: 2048,
  });
  assert.deepEqual(video, { kind: "video" });

  const pdf = classifyAcademyMedia({
    type: "application/pdf",
    name: "notes.pdf",
    size: 1024,
  });
  assert.equal("error" in pdf, true);
});

test("classifyAcademyMedia rejects oversized files", () => {
  const hugeImage = classifyAcademyMedia({
    type: "image/jpeg",
    name: "cover.jpg",
    size: 20 * 1024 * 1024,
  });
  assert.equal("error" in hugeImage, true);
});

test("isAcademyVideoUrl detects common video extensions", () => {
  assert.equal(isAcademyVideoUrl("https://blob.vercel-storage.com/lesson.mp4"), true);
  assert.equal(isAcademyVideoUrl("https://blob.vercel-storage.com/lesson.webm?token=1"), true);
  assert.equal(isAcademyVideoUrl("https://blob.vercel-storage.com/cover.webp"), false);
  assert.equal(isAcademyVideoUrl(""), false);
});

test("academyMediaMarkdown inserts an image or video Markdown snippet", () => {
  assert.equal(
    academyMediaMarkdown("image", "https://cdn.example/a.png", "Hook frame"),
    "\n\n![Hook frame](https://cdn.example/a.png)\n\n",
  );
  assert.equal(
    academyMediaMarkdown("video", "https://cdn.example/a.mp4", "Demo"),
    "\n\n![Demo](https://cdn.example/a.mp4)\n\n",
  );
});
