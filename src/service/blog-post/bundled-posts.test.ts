import assert from "node:assert/strict";
import test from "node:test";
import {
  BUNDLED_BLOG_POSTS,
  getBundledBlogPostBySlug,
  listBundledBlogPosts,
} from "@/service/blog-post/bundled-posts";
import { getBlogPostPublicPath } from "@/service/blog-post/public-path";
const REQUIRED_DIRECTORY_URLS = [
  "https://dang.ai/",
  "https://twelve.tools/",
  "https://turbo0.com/",
  "https://www.aitoolzdir.com/",
  "https://www.toolpilot.ai/",
  "https://toolfio.com/",
  "https://tooldisk.com/",
  "https://tulimoa.com/",
  "https://uno.directory/",
  "https://earlyhunt.com/",
  "https://dailypings.com/",
  "https://startupfa.me/",
  "https://saascity.io/",
  "https://indielaunch.dev/",
];

test("bundled directory article includes every required outbound link", () => {
  const post = getBundledBlogPostBySlug("where-to-discover-scro");
  assert.ok(post);
  for (const url of REQUIRED_DIRECTORY_URLS) {
    assert.match(post!.content, new RegExp(`\\(${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`));
  }
});

test("bundled posts expose canonical /articles paths", () => {
  assert.equal(getBlogPostPublicPath("where-to-discover-scro"), "/articles/where-to-discover-scro");
});

test("listBundledBlogPosts returns published bundled entries", () => {
  assert.equal(listBundledBlogPosts().length, BUNDLED_BLOG_POSTS.length);
  assert.ok(listBundledBlogPosts().every((post) => post.published));
});
