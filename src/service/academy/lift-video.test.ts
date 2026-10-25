import assert from "node:assert/strict";
import test from "node:test";
import { liftAcademyLessonVideo } from "@/service/academy/lift-video";

test("liftAcademyLessonVideo pins the first clip and drops the old Watch heading", () => {
  const lifted = liftAcademyLessonVideo(
    [
      "# How Scro Academy works",
      "",
      "Register once.",
      "",
      "![Diagram](https://cdn.example/a.png)",
      "",
      "## Watch the idea",
      "",
      "![How Scro Academy works video](https://cdn.example/lesson.mp4)",
      "",
      "## Practice in Scro",
      "",
      "Create your account.",
      "",
    ].join("\n"),
  );

  assert.equal(lifted.src, "https://cdn.example/lesson.mp4");
  assert.equal(lifted.alt, "How Scro Academy works video");
  assert.equal(lifted.body.includes("lesson.mp4"), false);
  assert.equal(lifted.body.includes("Watch the idea"), false);
  assert.match(lifted.body, /# How Scro Academy works/);
  assert.match(lifted.body, /## Practice in Scro/);
});

test("liftAcademyLessonVideo leaves lessons without a clip unchanged", () => {
  const markdown = "# Title\n\nJust text.\n";
  assert.deepEqual(liftAcademyLessonVideo(markdown), { body: markdown });
});

test("liftAcademyLessonVideo still extracts a clip that already leads the lesson", () => {
  const lifted = liftAcademyLessonVideo(
    "# Title\n\nHook line.\n\n![Lesson video](https://cdn.example/top.mp4)\n\n![Diagram](https://cdn.example/a.png)\n",
  );
  assert.equal(lifted.src, "https://cdn.example/top.mp4");
  assert.equal(lifted.body.includes("top.mp4"), false);
  assert.match(lifted.body, /# Title/);
  assert.match(lifted.body, /a\.png/);
});
