import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BlogPostContent } from "@/app/posts/[slug]/blog-post-content";

test("BlogPostContent renders Markdown tables, checklists, and ordered lists cleanly", () => {
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
`;

  const html = renderToStaticMarkup(createElement(BlogPostContent, { content: markdown }));
  assert.match(html, /<table/);
  assert.match(html, /<th[^>]*>Beat<\/th>/);
  assert.match(html, /<td[^>]*>Name the pain or curiosity<\/td>/);
  assert.match(html, /<input type="checkbox"/);
  assert.match(html, /<ol/);
  assert.match(html, /<strong[^>]*>On-screen text<\/strong>/);
});
