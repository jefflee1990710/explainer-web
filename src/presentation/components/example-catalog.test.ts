import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLE_ITEMS, exampleVideoJsonLd } from "@/presentation/components/example-catalog";

test("examples page has one crawlable video for each product direction", () => {
  assert.deepEqual(
    EXAMPLE_ITEMS.map((item) => item.landingPath),
    ["/explainer", "/product-promo", "/cantonese", "/talking-head", "/ai-influencer"],
  );
  for (const item of EXAMPLE_ITEMS) {
    assert.match(item.src, /\.mp4($|\?)/);
    assert.ok(item.poster.length > 0);
    assert.ok(item.durationSeconds > 0);
  }
});

test("shared host reel is one VideoObject, local clips stay separate", () => {
  const data = exampleVideoJsonLd(
    "https://www.scro.io",
    EXAMPLE_ITEMS.map((item) => ({
      ...item,
      name: item.id,
      description: item.id,
    })),
  );
  const graph = data["@graph"] as Array<{ contentUrl: string; name: string }>;
  assert.equal(graph.length, 3);
  assert.equal(graph[0]?.contentUrl, "https://www.scro.io/showcase/scro-reel.mp4");
  assert.equal(graph[1]?.contentUrl, "https://www.scro.io/showcase/product-marketing.mp4");
  assert.equal(graph[2]?.name, "cantonese");
  assert.match(String(graph[2]?.contentUrl), /^https:\/\/.+\.mp4$/);
});
