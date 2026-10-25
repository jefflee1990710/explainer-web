import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import {
  academyCourseSchema,
  createAcademyCourseInputSchema,
  updateAcademyCourseInputSchema,
} from "@/model/academy-course";
import { toAcademyCourseSummary, toPublicAcademyCourse } from "@/service/academy/courses";
import { deriveCourseExcerpt, slugifyAcademyCourse } from "@/service/academy/slug";

test("slugifyAcademyCourse converts English and CJK titles into clean URL slugs", () => {
  assert.equal(
    slugifyAcademyCourse("Create Reels That Grow Your Business!"),
    "create-reels-that-grow-your-business",
  );
  assert.equal(slugifyAcademyCourse("  Reel 漲粉課 2026  "), "reel-漲粉課-2026");
});

test("deriveCourseExcerpt strips Markdown and truncates", () => {
  const md = "# Heading\n\nThis is **bold** with a [link](https://example.com).";
  assert.equal(deriveCourseExcerpt(md), "Heading This is bold with a link.");
});

test("createAcademyCourseInputSchema requires title and markdown content", () => {
  const valid = createAcademyCourseInputSchema.safeParse({
    title: "Hook formula",
    content: "# Hook\n\nWrite the first line last? No — write it first.",
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.published, false);
    assert.equal(valid.data.sortOrder, 0);
  }

  const invalid = createAcademyCourseInputSchema.safeParse({
    title: "   ",
    content: "",
  });
  assert.equal(invalid.success, false);
});

test("updateAcademyCourseInputSchema accepts partial updates", () => {
  const valid = updateAcademyCourseInputSchema.safeParse({
    published: true,
    sortOrder: 2,
  });
  assert.equal(valid.success, true);

  const invalid = updateAcademyCourseInputSchema.safeParse({
    title: "  ",
  });
  assert.equal(invalid.success, false);
});

test("academyCourseSchema validates a full Mongo document", () => {
  const now = new Date();
  const parsed = academyCourseSchema.safeParse({
    _id: new ObjectId(),
    slug: "hook-formula",
    title: "Hook formula",
    excerpt: "Stop the scroll.",
    content: "# Hook",
    published: true,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  });
  assert.equal(parsed.success, true);
});

test("toAcademyCourseSummary hides markdown so locked pages cannot leak lessons", () => {
  const now = new Date();
  const publicCourse = toPublicAcademyCourse({
    _id: new ObjectId(),
    slug: "hook-formula",
    title: "Hook formula",
    excerpt: "Stop the scroll.",
    content: "# Secret lesson body",
    published: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });
  assert.equal(publicCourse.content, "# Secret lesson body");
  assert.equal(toAcademyCourseSummary({
    _id: new ObjectId(publicCourse.id),
    slug: publicCourse.slug,
    title: publicCourse.title,
    excerpt: publicCourse.excerpt,
    content: publicCourse.content,
    published: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  }).content, "");
});
