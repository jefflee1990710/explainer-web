import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanRoutePathname, resolvePendingAppHref } from "@/presentation/studio/route-transition-href";

test("cleanRoutePathname strips query, hash, and trailing slash", () => {
  assert.equal(cleanRoutePathname("/app/characters/?tab=all#top"), "/app/characters");
  assert.equal(cleanRoutePathname("/app"), "/app");
});

test("resolvePendingAppHref returns target path for internal /app navigation to a different page", () => {
  assert.equal(
    resolvePendingAppHref({
      rawHref: "/app/characters",
      resolvedHref: "https://www.scro.io/app/characters",
      currentOrigin: "https://www.scro.io",
      currentPathname: "/app/styles",
    }),
    "/app/characters",
  );
  assert.equal(
    resolvePendingAppHref({
      rawHref: "/app/characters/abc123",
      resolvedHref: "https://www.scro.io/app/characters/abc123",
      currentOrigin: "https://www.scro.io",
      currentPathname: "/app/characters",
    }),
    "/app/characters/abc123",
  );
});

test("resolvePendingAppHref ignores same-page, hash, external, and non-app links", () => {
  assert.equal(
    resolvePendingAppHref({
      rawHref: "/app/characters?filter=1",
      resolvedHref: "https://www.scro.io/app/characters?filter=1",
      currentOrigin: "https://www.scro.io",
      currentPathname: "/app/characters",
    }),
    null,
  );
  assert.equal(
    resolvePendingAppHref({
      rawHref: "#section",
      resolvedHref: "https://www.scro.io/app/characters#section",
      currentOrigin: "https://www.scro.io",
      currentPathname: "/app/styles",
    }),
    null,
  );
  assert.equal(
    resolvePendingAppHref({
      rawHref: "/pricing",
      resolvedHref: "https://www.scro.io/pricing",
      currentOrigin: "https://www.scro.io",
      currentPathname: "/app/characters",
    }),
    null,
  );
  assert.equal(
    resolvePendingAppHref({
      rawHref: "https://example.com/app/characters",
      resolvedHref: "https://example.com/app/characters",
      currentOrigin: "https://www.scro.io",
      currentPathname: "/app",
    }),
    null,
  );
});
