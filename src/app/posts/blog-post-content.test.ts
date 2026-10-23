import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BlogPostContent } from "@/app/posts/[slug]/blog-post-content";
import { sanitizeBlogPostTags } from "@/service/blog-post/blog-posts";

test("BlogPostContent renders Markdown tables, checklists, ordered lists, and inline/bottom CTAs cleanly", () => {
  const markdown = `
## Step 1 — Concept

**Map a three-beat structure:**

| Beat | Job | Rough share of runtime |
|------|-----|------------------------|
| Hook | Name the pain or curiosity | ~20% |
| Demonstrate | Show how it works | ~55% |
| Resolve | Outcome + next step | ~25% |

**Concept checklist before you leave this stage**

- [ ] Viewer and takeaway are explicit  
- [x] Script fits the target length when read aloud  

1. **On-screen text** (short; not the full narration)  
2. **Visual action** (what changes or is drawn)  

## Step 2 — Execution

Write the spoken hook clearly.

Keep every frame focused on one visual point.
`;

  const html = renderToStaticMarkup(
    createElement(BlogPostContent, {
      content: markdown,
      inlineCta: createElement("div", { "data-testid": "inline-cta" }, "Register Scro CTA"),
      bottomCta: createElement("div", { "data-testid": "bottom-cta" }, "Bottom Register CTA"),
    }),
  );
  assert.match(html, /<table/);
  assert.match(html, /<th[^>]*>Beat<\/th>/);
  assert.match(html, /<td[^>]*>Name the pain or curiosity<\/td>/);
  assert.match(html, /<input type="checkbox"/);
  assert.match(html, /<ol/);
  assert.match(html, /<strong[^>]*>On-screen text<\/strong>/);
  assert.match(html, /Register Scro CTA/);
  assert.match(html, /Bottom Register CTA/);
});

test("sanitizeBlogPostTags strips NOVAX tags case-insensitively", () => {
  assert.deepEqual(
    sanitizeBlogPostTags(["SEO Guide", "How-To", "NOVAX", "novax", "AI Video"]),
    ["SEO Guide", "How-To", "AI Video"],
  );
});
