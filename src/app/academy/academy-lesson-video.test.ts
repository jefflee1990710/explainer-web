import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AcademyLessonVideo } from "@/app/academy/[slug]/academy-lesson-video";

test("AcademyLessonVideo renders a hero player", () => {
  const html = renderToStaticMarkup(
    AcademyLessonVideo({ src: "https://cdn.example/lesson.mp4", title: "How Scro Academy works" }),
  );
  assert.match(html, /<video src="https:\/\/cdn.example\/lesson.mp4"/);
  assert.match(html, /How Scro Academy works/);
  assert.match(html, /controls/);
});
