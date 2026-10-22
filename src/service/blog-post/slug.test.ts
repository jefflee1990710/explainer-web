import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import {
  blogPostSchema,
  createBlogPostInputSchema,
  updateBlogPostInputSchema,
} from "@/model/blog-post";
import { parsePostTags } from "@/service/blog-post/api-auth";
import { derivePostExcerpt, slugifyBlogPost } from "@/service/blog-post/slug";

test("slugifyBlogPost converts English and CJK titles into clean URL slugs", () => {
  assert.equal(slugifyBlogPost("How to Build an AI Influencer!"), "how-to-build-an-ai-influencer");
  assert.equal(slugifyBlogPost("  香港粵語 AI 短片教學 2026  "), "香港粵語-ai-短片教學-2026");
});

test("derivePostExcerpt strips Markdown syntax and truncates cleanly", () => {
  const md = "# Heading\n\nThis is **bold** text with a [link](https://example.com) and ![img](https://example.com/a.png).";
  assert.equal(derivePostExcerpt(md), "Heading This is bold text with a link and .");
});

test("createBlogPostInputSchema validates required fields and defaults published to true", () => {
  const valid = createBlogPostInputSchema.safeParse({
    title: "My First Post",
    content: "Hello world content",
    featureImage: "https://example.com/cover.jpg",
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.published, true);
  }

  const invalid = createBlogPostInputSchema.safeParse({
    title: "",
    content: "Hello",
    featureImage: "",
  });
  assert.equal(invalid.success, false);
});

test("updateBlogPostInputSchema validates partial updates", () => {
  const valid = updateBlogPostInputSchema.safeParse({
    title: "Updated Title",
    published: false,
  });
  assert.equal(valid.success, true);

  const invalid = updateBlogPostInputSchema.safeParse({
    title: "   ",
  });
  assert.equal(invalid.success, false);
});

test("parsePostTags parses arrays, JSON strings, and comma-separated strings", () => {
  assert.deepEqual(parsePostTags(["ai", " video "]), ["ai", "video"]);
  assert.deepEqual(parsePostTags('["seo","cantonese"]'), ["seo", "cantonese"]);
  assert.deepEqual(parsePostTags("ai, explainer, shorts"), ["ai", "explainer", "shorts"]);
  assert.deepEqual(parsePostTags(""), []);
  assert.equal(parsePostTags(undefined), undefined);
});

test("blogPostSchema validates full MongoDB BlogPost document", () => {
  const now = new Date();
  const doc = {
    _id: new ObjectId(),
    slug: "my-first-post",
    title: "My First Post",
    excerpt: "Short summary",
    content: "Full article body",
    featureImage: "https://example.com/cover.jpg",
    tags: ["ai", "video"],
    published: true,
    createdAt: now,
    updatedAt: now,
  };
  const parsed = blogPostSchema.safeParse(doc);
  assert.equal(parsed.success, true);
});
