import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  GENERATION_API_FEATURES,
  getGenerationApiDocs,
  buildGenerationCurlExample,
} from "./generation-docs";
import { buildLlmsFullTxt, buildLlmsTxt } from "@/presentation/api/llms/route";

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

test("getGenerationApiDocs uses USD Credit pricing across locales without legacy integer credits", () => {
  for (const locale of ["en", "zh-Hant", "zh-Hans"]) {
    const docs = getGenerationApiDocs(locale);
    const byId = new Map(docs.map((doc) => [doc.id, doc]));

    for (const doc of docs) {
      assert.doesNotMatch(
        doc.creditCost,
        /\b\d+\s*(credits?|cr)\b/i,
        `${locale}:${doc.id} should not mention legacy integer credits: ${doc.creditCost}`,
      );
      assert.match(doc.creditCost, /\$\d+\.\d{2}/);
    }

    assert.match(byId.get("simple")!.creditCost, /\$0\.15/);
    assert.match(byId.get("simple")!.creditCost, /\$0\.10\/s/);
    assert.match(byId.get("explainer")!.creditCost, /\$0\.15/);
    assert.match(byId.get("explainer")!.creditCost, /\$0\.10\/s/);
    assert.match(byId.get("talking")!.creditCost, /\$0\.15/);
    assert.match(byId.get("talking")!.creditCost, /\$0\.18\/s/);
    assert.match(byId.get("story")!.creditCost, /\$0\.15/);
    assert.match(byId.get("story")!.creditCost, /\$0\.10\/s/);
    assert.match(byId.get("swap")!.creditCost, /\$0\.15/);
    assert.match(byId.get("swap")!.creditCost, /\$0\.10\/s/);
    assert.match(byId.get("teleport")!.creditCost, /\$0\.15/);
    assert.match(byId.get("teleport")!.creditCost, /\$0\.10\/s/);
    assert.match(byId.get("poster")!.creditCost, /\$0\.15/);
    assert.match(byId.get("life")!.creditCost, /\$0\.15/);

    const swapJob = byId.get("swap")!.sampleResponse.job as Record<string, unknown>;
    assert.equal(swapJob.costUsd, 0.75);
    assert.equal("creditCost" in swapJob, false);

    const teleportJob = byId.get("teleport")!.sampleResponse.job as Record<string, unknown>;
    assert.equal(teleportJob.costUsd, 0.75);
    assert.equal("creditCost" in teleportJob, false);
  }
});

test("llms.txt and llms-full.txt document USD Credit plans and action pricing", () => {
  const shortTxt = buildLlmsTxt("https://scro.io");
  assert.match(shortTxt, /USD Credit/i);
  assert.match(shortTxt, /\$59\/mo/);
  assert.match(shortTxt, /\$129\/mo/);
  assert.match(shortTxt, /\$249\/mo/);
  assert.match(shortTxt, /\$399\/mo/);

  const fullTxt = buildLlmsFullTxt("https://scro.io");
  assert.match(fullTxt, /\$6\.00/);
  assert.match(fullTxt, /\$0\.15/);
  assert.match(fullTxt, /\$0\.30/);
  assert.match(fullTxt, /\$0\.10\/s/);
  assert.match(fullTxt, /\$0\.18\/s/);
  assert.match(fullTxt, /\$0\.60/);
  assert.match(fullTxt, /\$59\.00/);
  assert.match(fullTxt, /\$129\.00/);
  assert.match(fullTxt, /\$249\.00/);
  assert.match(fullTxt, /\$399\.00/);
  assert.doesNotMatch(fullTxt, /4 credits|2 credits\/s|4 credits\/s|monthly credits/i);
});
