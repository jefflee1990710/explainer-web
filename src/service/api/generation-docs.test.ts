import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GENERATION_API_FEATURES,
  getGenerationApiDocs,
  buildGenerationCurlExample,
} from "./generation-docs";

test("GENERATION_API_FEATURES covers all 8 creation tools in order", () => {
  assert.deepEqual(GENERATION_API_FEATURES, [
    "simple",
    "explainer",
    "talking",
    "story",
    "swap",
    "teleport",
    "poster",
    "life",
  ]);
});

test("getGenerationApiDocs returns complete endpoint specs and cURL examples for all 8 features", () => {
  const docs = getGenerationApiDocs("zh-Hant");
  assert.equal(docs.length, 8);

  for (const doc of docs) {
    assert.ok(doc.id);
    assert.ok(doc.title.length > 0);
    assert.ok(doc.summary.length > 0);
    assert.equal(doc.method, "POST");
    assert.match(doc.endpoint, /^\/api\/v1\//);
    assert.match(doc.pollEndpoint, /^\/api\/v1\//);
    assert.ok(doc.parameters.length > 0);
    assert.ok(Object.keys(doc.sampleBody).length > 0);
    assert.ok(Object.keys(doc.sampleResponse).length > 0);

    const curl = buildGenerationCurlExample(
      doc,
      "https://scro.ai",
      "exp_live_test123",
    );
    assert.match(curl, /curl -X POST "https:\/\/scro\.ai\/api\/v1\//);
    assert.match(curl, /Authorization: Bearer exp_live_test123/);
  }
});

test("All 8 feature API routes and /api/v1/keys exist in presentation and app router", () => {
  const requiredRoutes = [
    "v1/simple/route.ts",
    "v1/explainers/route.ts",
    "v1/talking/route.ts",
    "v1/stories/route.ts",
    "v1/swap/route.ts",
    "v1/swap/[id]/route.ts",
    "v1/teleport/route.ts",
    "v1/teleport/[id]/route.ts",
    "v1/posters/route.ts",
    "v1/posters/[id]/route.ts",
    "v1/life/route.ts",
    "v1/keys/route.ts",
  ];

  for (const rel of requiredRoutes) {
    const presPath = path.join(process.cwd(), "src/presentation/api", rel);
    const appPath = path.join(process.cwd(), "src/app/api", rel);
    assert.ok(
      fs.existsSync(presPath),
      `Missing presentation route: ${presPath}`,
    );
    assert.ok(fs.existsSync(appPath), `Missing app route: ${appPath}`);
  }
});

test("McpView includes custom API key name input and 8-feature REST API documentation", () => {
  const mcpViewSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/presentation/components/app/mcp/mcp-view.tsx",
    ),
    "utf8",
  );
  assert.match(mcpViewSource, /getGenerationApiDocs/);
  assert.match(mcpViewSource, /keyName/);
});
